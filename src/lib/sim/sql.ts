// Tiny SELECT-only "SQL" over the in-memory sim database.
// Grammar: SELECT cols FROM table [WHERE col op value [AND ...]] [ORDER BY col [DESC]] [LIMIT n]
// ponytail: not a real SQL engine — no joins/OR/functions; add alasql if this ever needs more.

import type { SimDb, Row, Cell } from "./simdb";
import { TABLE_NAMES } from "./simdb";

export interface SqlResult {
  columns: string[];
  rows: Row[];
  error?: undefined;
}

export interface SqlError {
  error: string;
}

const QUERY_RE =
  /^\s*select\s+(?<cols>.+?)\s+from\s+(?<table>\w+)(?:\s+where\s+(?<where>.+?))?(?:\s+order\s+by\s+(?<orderCol>\w+)(?:\s+(?<orderDir>asc|desc))?)?(?:\s+limit\s+(?<limit>\d+))?\s*;?\s*$/i;

const COND_RE = /^\s*(?<col>\w+)\s*(?<op>>=|<=|!=|=|>|<|like)\s*(?<val>'[^']*'|\S+)\s*$/i;

function parseValue(raw: string): Cell {
  if (raw.startsWith("'") && raw.endsWith("'")) return raw.slice(1, -1);
  if (/^-?\d+(\.\d+)?$/.test(raw)) return Number(raw);
  if (/^(true|false)$/i.test(raw)) return raw.toLowerCase() === "true";
  if (/^null$/i.test(raw)) return null;
  return raw;
}

function matches(cell: Cell, op: string, value: Cell): boolean {
  if (op.toLowerCase() === "like") {
    const pattern = String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&").replace(/%/g, ".*");
    return new RegExp(`^${pattern}$`, "i").test(String(cell));
  }
  switch (op) {
    case "=":
      return cell === value;
    case "!=":
      return cell !== value;
    case ">":
      return Number(cell) > Number(value);
    case "<":
      return Number(cell) < Number(value);
    case ">=":
      return Number(cell) >= Number(value);
    case "<=":
      return Number(cell) <= Number(value);
    default:
      return false;
  }
}

export function runSql(query: string, db: SimDb): SqlResult | SqlError {
  const m = QUERY_RE.exec(query);
  if (!m?.groups) {
    return { error: "syntax error — expected: SELECT cols FROM table [WHERE ...] [ORDER BY col] [LIMIT n]" };
  }
  const { cols, table, where, orderCol, orderDir, limit } = m.groups;

  const tableName = table.toLowerCase() as keyof SimDb;
  if (!TABLE_NAMES.includes(tableName as (typeof TABLE_NAMES)[number])) {
    return { error: `unknown table "${table}" — tables: ${TABLE_NAMES.join(", ")}` };
  }

  let rows = [...db[tableName]];

  if (where) {
    for (const clause of where.split(/\s+and\s+/i)) {
      const cm = COND_RE.exec(clause);
      if (!cm?.groups) return { error: `bad WHERE clause: "${clause.trim()}"` };
      const { col, op, val } = cm.groups;
      const value = parseValue(val);
      rows = rows.filter((r) => matches(r[col] ?? null, op, value));
    }
  }

  if (orderCol) {
    const dir = orderDir?.toLowerCase() === "desc" ? -1 : 1;
    rows.sort((a, b) => {
      const av = a[orderCol] ?? null;
      const bv = b[orderCol] ?? null;
      if (av === bv) return 0;
      if (av === null) return -dir;
      if (bv === null) return dir;
      return (av < bv ? -1 : 1) * dir;
    });
  }

  if (limit) rows = rows.slice(0, Number(limit));

  const allColumns = rows[0] ? Object.keys(rows[0]) : Object.keys(db[tableName][0] ?? {});
  let columns: string[];
  if (cols.trim() === "*") {
    columns = allColumns;
  } else {
    columns = cols.split(",").map((c) => c.trim());
    const unknown = columns.find((c) => allColumns.length > 0 && !allColumns.includes(c));
    if (unknown) return { error: `unknown column "${unknown}"` };
    rows = rows.map((r) => Object.fromEntries(columns.map((c) => [c, r[c] ?? null])));
  }

  return { columns, rows };
}
