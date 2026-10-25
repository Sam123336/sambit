// Runnable check: `npx tsx src/lib/sqlterm/workspace.selfcheck.ts`
import initSqlJs from "sql.js";
import { Workspace, scan } from "./workspace";
import { MISSIONS, checkTask } from "./missions";

function assert(cond: boolean, msg: string) {
  if (!cond) throw new Error(`FAILED: ${msg}`);
  console.log(`ok: ${msg}`);
}

async function main() {
  const SQL = await initSqlJs();
  const mem = new Map<string, string>();
  const store = { getItem: (k: string) => mem.get(k) ?? null, setItem: (k: string, v: string) => void mem.set(k, v) };

  // scan: statements, quotes, comments, completeness
  assert(scan("select 1; select 2;").statements.length === 2, "splits statements");
  assert(scan("select ';'; -- ; x\n").statements.length === 1, "ignores ; in quotes and comments");
  assert(scan("select 1").done === false && scan("select 1;").done === true, "done only after ;");
  assert(scan("select 'abc").done === false, "open quote is not done");

  let ws = new Workspace(SQL, store);
  const last = (sql: string) => ws.run(sql).at(-1)!.out;

  assert(last("CREATE DATABASE shop;").kind === "ok", "create database");
  assert(last("CREATE DATABASE shop;").kind === "error", "duplicate database rejected");
  assert(last("USE nope;").kind === "error", "unknown database rejected");
  last("USE shop;");
  last("CREATE TABLE t (id INTEGER PRIMARY KEY, name TEXT NOT NULL, ref INTEGER REFERENCES t(id));");
  let o = last("INSERT INTO t (name) VALUES ('a'), ('b'), ('it''s');");
  assert(o.kind === "ok" && o.message === "3 rows inserted", "insert reports rows");
  o = last("SELECT * FROM t WHERE name = 'zzz';");
  assert(o.kind === "rows" && o.rows.length === 0 && o.columns.length === 3, "empty result keeps columns");
  assert(last("INSERT INTO t (name, ref) VALUES ('x', 99);").kind === "error", "foreign keys enforced");
  assert(last("INSERT INTO t (id) VALUES (50);").kind === "error", "NOT NULL enforced");
  o = last("SELEC 1;");
  assert(o.kind === "error" && /syntax/.test(o.message), "syntax error is explained");
  o = last("DESCRIBE t;");
  assert(o.kind === "rows" && o.rows.length === 3 && o.rows[0][3] === "PRI", "describe");
  o = ws.run("SELECT 1; SELEC 2; SELECT 3;").length === 2 ? ws.showDatabases() : last("");
  assert(o.kind === "rows" && o.rows.length === 2, "script stops at first error; show databases");
  ws.run("DROP DATABASE playground;");

  // persistence: a new workspace over the same storage sees the data (and foreign keys are still on)
  ws = new Workspace(SQL, store);
  assert(ws.restored === 1 || ws.restored === 2, "restored from storage");
  assert(ws.current === "shop", "current database restored");
  o = last("SELECT COUNT(*) FROM t;");
  assert(o.kind === "rows" && o.rows[0][0] === 3, "rows persisted");
  assert(last("INSERT INTO t (name, ref) VALUES ('x', 99);").kind === "error", "foreign keys still enforced after save");

  // every mission: the shipped solutions pass in order, and a wrong answer does not
  for (const m of MISSIONS) {
    ws.reseed(m.db, m.seed);
    m.tasks.forEach((task, i) => {
      const wrong = checkTask(task, ws, ws.run(task.expect ? "SELECT 'nope';" : "SELECT 1;"));
      assert(!wrong?.ok, `mission ${m.id} task ${i + 1}: wrong answer is not accepted`);
      const r = checkTask(task, ws, ws.run(task.solution));
      assert(!!r?.ok, `mission ${m.id} task ${i + 1}: reference solution is accepted`);
    });
  }

  console.log("all sqlterm self-checks passed");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
