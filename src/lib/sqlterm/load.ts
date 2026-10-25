import type { SqlJsStatic } from "sql.js";

let loading: Promise<SqlJsStatic> | undefined;

/** Lazily fetches the SQLite engine (~45KB JS + ~680KB wasm) the first time the terminal opens. */
export function loadSqlJs(): Promise<SqlJsStatic> {
  loading ??= import("sql.js")
    .then(({ default: init }) =>
      init({ locateFile: () => new URL("../../../node_modules/sql.js/dist/sql-wasm-browser.wasm", import.meta.url).toString() }),
    )
    .catch((e) => {
      loading = undefined; // let the next open retry
      throw e;
    });
  return loading;
}
