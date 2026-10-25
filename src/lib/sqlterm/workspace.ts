// A tiny "database server" for the SQL terminal: several named databases, each one a real
// SQLite file (sql.js = SQLite compiled to WebAssembly) kept in memory and mirrored to
// localStorage. SQLite has no CREATE DATABASE / USE / SHOW, so those are handled here.
// ponytail: CREATE TRIGGER bodies contain ';' and are split wrongly by scan(); use .schema-less DDL.

import type { Database, SqlJsStatic, SqlValue } from "sql.js";
import { parseJoins, type JoinType } from "./joins";

export type { SqlValue };

export interface TableInfo {
  name: string;
  columns: { name: string; type: string; pk: boolean; notNull: boolean }[];
  fks: { from: string; table: string; to: string | null }[];
  count: number;
  /** first PREVIEW_ROWS rows */
  rows: SqlValue[][];
  /** row count before the latest statement (drives the "new rows" flash) */
  prev: number;
}

export interface JoinSide {
  table: string;
  /** up to 4 columns, the join key first */
  cols: string[];
  rows: SqlValue[][];
  total: number;
  /** index of the join key in `cols`, or -1 */
  key: number;
}

export interface JoinView {
  type: JoinType;
  on: string;
  left: JoinSide;
  right: JoinSide;
  /** [leftRow, rightRow] pairs that match on the key */
  links: [number, number][];
  /** rows the visitor's query actually returned */
  result: number;
}

const PREVIEW_ROWS = 6;
const JOIN_ROWS = 10;
const q = (name: string) => `"${name.replace(/"/g, '""')}"`;
const lit = (s: string) => `'${s.replace(/'/g, "''")}'`;

export type Out =
  | { kind: "rows"; columns: string[]; rows: SqlValue[][] }
  | { kind: "ok"; message: string }
  | { kind: "error"; message: string };

export interface Step {
  sql: string;
  out: Out;
}

type Store = Pick<Storage, "getItem" | "setItem">;

const KEY = "sambit.sqlterm.v1";
const DEFAULT_DB = "playground";
const NAME_RE = /^[a-z_][a-z0-9_]{0,31}$/;

/** Splits on top-level `;` (not inside quotes or comments). `done` = the input ends with one. */
export function scan(input: string): { statements: string[]; done: boolean } {
  const statements: string[] = [];
  let start = 0;
  let quote = "";
  let inBlock = false;
  let lastSig = "";
  let sig = false;
  for (let i = 0; i < input.length; i++) {
    const c = input[i];
    if (inBlock) {
      if (c === "*" && input[i + 1] === "/") {
        inBlock = false;
        i++;
      }
    } else if (quote) {
      if (c === quote) quote = "";
    } else if (c === "-" && input[i + 1] === "-") {
      const nl = input.indexOf("\n", i);
      i = nl < 0 ? input.length : nl;
    } else if (c === "/" && input[i + 1] === "*") {
      inBlock = true;
      i++;
    } else if (c === ";") {
      if (sig) statements.push(input.slice(start, i).trim());
      start = i + 1;
      sig = false;
      lastSig = ";";
    } else if (!/\s/.test(c)) {
      if (c === "'" || c === '"' || c === "`") quote = c;
      sig = true;
      lastSig = c;
    }
  }
  if (sig) statements.push(input.slice(start).trim());
  return { statements, done: !quote && !inBlock && lastSig === ";" };
}

const HINTS: [RegExp, string][] = [
  [/no such table/i, "run .tables to see what exists"],
  [/no such column/i, "DESCRIBE <table>; lists the columns"],
  [/FOREIGN KEY constraint/i, "the referenced row doesn't exist, or other rows still point at this one"],
];

function fail(e: unknown, sql: string): Out {
  const msg = e instanceof Error ? e.message : String(e);
  const hint = HINTS.find(([re]) => re.test(msg))?.[1];
  const mysql = /auto_increment/i.test(sql) && /syntax/i.test(msg) ? "SQLite spells it INTEGER PRIMARY KEY (it auto-increments by itself)" : "";
  const tip = mysql || (/syntax error/i.test(msg) ? "check the keyword order, commas and quotes" : hint);
  return { kind: "error", message: `${msg}${tip ? ` — ${tip}` : ""}` };
}

const err = (message: string): Out => ({ kind: "error", message });
const ok = (message: string): Out => ({ kind: "ok", message });
const plural = (n: number, w: string) => `${n} ${w}${n === 1 ? "" : "s"}`;

const toB64 = (u: Uint8Array) => {
  let s = "";
  for (let i = 0; i < u.length; i += 0x8000) s += String.fromCharCode(...u.subarray(i, i + 0x8000));
  return btoa(s);
};
const fromB64 = (b: string) => Uint8Array.from(atob(b), (c) => c.charCodeAt(0));

export class Workspace {
  current = DEFAULT_DB;
  /** databases brought back from localStorage at startup */
  restored = 0;
  /** set when the last save to localStorage failed (quota, private mode) */
  saveFailed = false;
  private dbs = new Map<string, Database>();

  constructor(
    private SQL: SqlJsStatic,
    private store: Store | null,
  ) {
    try {
      const saved = JSON.parse(store?.getItem(KEY) ?? "null") as { current: string; dbs: Record<string, string> } | null;
      if (saved) {
        for (const [name, b64] of Object.entries(saved.dbs)) this.dbs.set(name, this.open(fromB64(b64)));
        this.current = saved.current;
        this.restored = this.dbs.size;
      }
    } catch {
      this.dbs.clear(); // corrupted save: start fresh
    }
    if (!this.dbs.size) this.dbs.set(DEFAULT_DB, this.open());
    if (!this.dbs.has(this.current)) this.current = [...this.dbs.keys()][0];
  }

  private open(data?: Uint8Array) {
    const db = new this.SQL.Database(data);
    db.run("PRAGMA foreign_keys = ON");
    return db;
  }

  private save() {
    try {
      const dbs: Record<string, string> = {};
      for (const [name, db] of this.dbs) {
        dbs[name] = toB64(db.export());
        db.run("PRAGMA foreign_keys = ON"); // export() reopens the connection and resets pragmas
      }
      this.store?.setItem(KEY, JSON.stringify({ current: this.current, dbs }));
      this.saveFailed = false;
    } catch {
      this.saveFailed = true;
    }
  }

  names() {
    return [...this.dbs.keys()].sort();
  }

  /** drop + recreate `name`, run `seed` in it, and switch to it (used by missions) */
  reseed(name: string, seed: string) {
    this.dbs.get(name)?.close();
    const db = this.open();
    if (seed) db.exec(seed);
    this.dbs.set(name, db);
    this.current = name;
    this.save();
  }

  run(input: string): Step[] {
    const steps: Step[] = [];
    let dirty = false;
    for (const sql of scan(input).statements) {
      const out = this.exec(sql);
      steps.push({ sql, out });
      if (out.kind === "error") break; // like a script: stop at the first failure
      if (!/^(select|explain|show|desc|describe|pragma)\b/i.test(sql)) dirty = true;
    }
    if (dirty) this.save();
    return steps;
  }

  private exec(sql: string): Out {
    const [, kw = ""] = /^(\w+)/.exec(sql) ?? [];
    switch (kw.toLowerCase()) {
      case "create": {
        const m = /^create\s+(?:database|schema)\s+(?:(if\s+not\s+exists)\s+)?(\w+)$/i.exec(sql);
        if (/^create\s+(database|schema)\b/i.test(sql)) return m ? this.createDb(m[2], !!m[1]) : err("usage: CREATE DATABASE name;");
        break;
      }
      case "drop": {
        const m = /^drop\s+(?:database|schema)\s+(?:(if\s+exists)\s+)?(\w+)$/i.exec(sql);
        if (/^drop\s+(database|schema)\b/i.test(sql)) return m ? this.dropDb(m[2], !!m[1]) : err("usage: DROP DATABASE name;");
        break;
      }
      case "use": {
        const m = /^use\s+(\w+)$/i.exec(sql);
        return m ? this.use(m[1]) : err("usage: USE name;");
      }
      case "show": {
        const m = /^show\s+(databases|tables)$/i.exec(sql);
        if (!m) return err("SHOW supports DATABASES and TABLES");
        return m[1].toLowerCase() === "tables" ? this.showTables() : this.showDatabases();
      }
      case "describe":
      case "desc": {
        const m = /^desc(?:ribe)?\s+(\w+)$/i.exec(sql);
        return m ? this.describe(m[1]) : err("usage: DESCRIBE table;");
      }
    }
    return this.query(sql);
  }

  private createDb(raw: string, ifNotExists: boolean): Out {
    const name = raw.toLowerCase();
    if (!NAME_RE.test(name)) return err(`bad database name '${raw}' — use letters, digits and _ (max 32)`);
    if (this.dbs.has(name)) return ifNotExists ? ok(`Database '${name}' already exists`) : err(`database '${name}' already exists`);
    this.dbs.set(name, this.open());
    this.current = name; // unlike MySQL, no separate USE needed: you want to build in it right away
    return ok(`Database '${name}' created — now using it`);
  }

  private dropDb(raw: string, ifExists: boolean): Out {
    const name = raw.toLowerCase();
    const db = this.dbs.get(name);
    if (!db) return ifExists ? ok("nothing to drop") : err(`unknown database '${name}' — SHOW DATABASES; lists them`);
    db.close();
    this.dbs.delete(name);
    if (!this.dbs.size) this.dbs.set(DEFAULT_DB, this.open());
    if (this.current !== name) return ok(`Database '${name}' dropped`);
    this.current = this.names()[0];
    return ok(`Database '${name}' dropped — now using '${this.current}'`);
  }

  private use(raw: string): Out {
    const name = raw.toLowerCase();
    if (!this.dbs.has(name)) return err(`unknown database '${name}' — SHOW DATABASES; lists them`);
    this.current = name;
    return ok(`Database changed to '${name}'`);
  }

  /** every database with its table count (for SHOW DATABASES and the left-hand view) */
  databases(): { name: string; tables: number }[] {
    return this.names().map((name) => ({
      name,
      tables: Number(this.dbs.get(name)!.exec("SELECT COUNT(*) FROM sqlite_master WHERE type = 'table'")[0].values[0][0]),
    }));
  }

  showDatabases(): Out {
    const rows = this.databases().map((d) => [d.name === this.current ? `${d.name} *` : d.name, d.tables]);
    return { kind: "rows", columns: ["Database", "Tables"], rows };
  }

  showTables(): Out {
    const out = this.query(
      "SELECT name AS Tables_in_" + this.current + " FROM sqlite_master WHERE type IN ('table','view') AND name NOT LIKE 'sqlite_%' ORDER BY name",
    );
    return out.kind === "rows" && !out.rows.length ? ok("Empty set — CREATE TABLE something first") : out;
  }

  describe(table: string): Out {
    const out = this.query(
      `SELECT name AS Field, type AS Type, CASE WHEN "notnull" = 1 OR pk > 0 THEN 'NO' ELSE 'YES' END AS "Null", CASE pk WHEN 0 THEN '' ELSE 'PRI' END AS "Key", dflt_value AS "Default" FROM pragma_table_info('${table.replace(/'/g, "''")}')`,
    );
    return out.kind === "rows" && !out.rows.length ? err(`no such table: ${table}`) : out;
  }

  schema(table?: string): Out {
    const out = this.query(
      `SELECT sql || ';' AS schema FROM sqlite_master WHERE sql IS NOT NULL ${table ? `AND tbl_name = '${table.replace(/'/g, "''")}'` : ""} ORDER BY type DESC, name`,
    );
    return out.kind === "rows" && !out.rows.length ? ok("Empty set") : out;
  }

  /** every table in the current database, for the left-hand schema view */
  snapshot(): TableInfo[] {
    const db = this.dbs.get(this.current)!;
    try {
      const names = (db.exec("SELECT name FROM sqlite_master WHERE type = 'table' AND name NOT LIKE 'sqlite_%' ORDER BY rowid")[0]?.values ?? []).map((r) => String(r[0]));
      return names.map((name) => {
        const cols = db.exec(`SELECT name, type, "notnull", pk FROM pragma_table_info(${lit(name)})`)[0]?.values ?? [];
        const fks = db.exec(`SELECT "from", "table", "to" FROM pragma_foreign_key_list(${lit(name)})`)[0]?.values ?? [];
        const count = Number(db.exec(`SELECT COUNT(*) FROM ${q(name)}`)[0].values[0][0]);
        return {
          name,
          columns: cols.map(([n, t, nn, pk]) => ({ name: String(n), type: String(t), pk: Number(pk) > 0, notNull: Number(nn) === 1 })),
          fks: fks.map(([from, table, to]) => ({ from: String(from), table: String(table), to: to === null ? null : String(to) })),
          count,
          rows: db.exec(`SELECT * FROM ${q(name)} LIMIT ${PREVIEW_ROWS}`)[0]?.values ?? [],
          prev: count,
        };
      });
    } catch {
      return [];
    }
  }

  /** for each JOIN in `sql`, the sample rows of both tables and which of them match */
  joinViews(sql: string, result: number): JoinView[] {
    const db = this.dbs.get(this.current)!;
    try {
      const tables = new Map<string, string>();
      for (const [n] of db.exec("SELECT name FROM sqlite_master WHERE type IN ('table','view')")[0]?.values ?? []) tables.set(String(n).toLowerCase(), String(n));
      const side = (table: string, keyCol?: string) => {
        const r = db.exec(`SELECT * FROM ${q(table)} LIMIT ${JOIN_ROWS}`)[0];
        const all = r?.columns ?? db.exec(`SELECT name FROM pragma_table_info(${lit(table)})`)[0].values.map((v) => String(v[0]));
        const keyAt = keyCol ? all.findIndex((c) => c.toLowerCase() === keyCol.toLowerCase()) : -1;
        const order = [...(keyAt >= 0 ? [keyAt] : []), ...all.map((_, i) => i).filter((i) => i !== keyAt)].slice(0, 4);
        const values = r?.values ?? [];
        return {
          keyValues: values.map((row) => (keyAt >= 0 ? row[keyAt] : null)),
          side: {
            table,
            cols: order.map((i) => all[i]),
            rows: values.map((row) => order.map((i) => row[i])),
            total: Number(db.exec(`SELECT COUNT(*) FROM ${q(table)}`)[0].values[0][0]),
            key: keyAt >= 0 ? 0 : -1,
          },
        };
      };
      return parseJoins(sql, tables)
        .slice(0, 3)
        .map((spec) => {
          const l = side(spec.left, spec.leftCol);
          const r = side(spec.right, spec.rightCol);
          const links: [number, number][] = [];
          if (l.side.key >= 0 && r.side.key >= 0)
            l.keyValues.forEach((a, i) =>
              r.keyValues.forEach((b, j) => {
                if (a !== null && b !== null && String(a) === String(b)) links.push([i, j]);
              }),
            );
          return { type: spec.type, on: spec.on, left: l.side, right: r.side, links, result };
        });
    } catch {
      return [];
    }
  }

  /** run one SQL statement against the current database */
  query(sql: string): Out {
    const db = this.dbs.get(this.current)!;
    let stmt;
    try {
      stmt = db.prepare(sql);
    } catch (e) {
      return fail(e, sql);
    }
    try {
      const columns = stmt.getColumnNames();
      if (columns.length) {
        const rows: SqlValue[][] = [];
        while (stmt.step()) rows.push(stmt.get());
        return { kind: "rows", columns, rows };
      }
      stmt.step();
      const [, verb = ""] = /^(insert|replace|update|delete)\b/i.exec(sql) ?? [];
      if (verb) {
        const n = db.getRowsModified();
        return ok(`${plural(n, "row")} ${{ insert: "inserted", replace: "inserted", update: "updated", delete: "deleted" }[verb.toLowerCase()]}`);
      }
      const ddl = /^(create|drop|alter)\s+(?:temp(?:orary)?\s+)?(?:unique\s+)?(\w+)/i.exec(sql);
      if (ddl) {
        const [, op, what] = ddl;
        const done = { create: "created", drop: "dropped", alter: "altered" }[op.toLowerCase() as "create" | "drop" | "alter"];
        return ok(`${what[0].toUpperCase()}${what.slice(1).toLowerCase()} ${done}`);
      }
      return ok("OK");
    } catch (e) {
      return fail(e, sql);
    } finally {
      stmt.free();
    }
  }
}
