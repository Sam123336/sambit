"use client";

import { useEffect, useRef, useState, type KeyboardEvent } from "react";
import { useSimStore } from "@/store/simStore";
import { useDbView } from "@/store/dbViewStore";
import { loadSqlJs } from "@/lib/sqlterm/load";
import { Workspace, scan, type Out, type SqlValue } from "@/lib/sqlterm/workspace";
import { MISSIONS, checkTask, loadProgress, saveProgress, type Mission } from "@/lib/sqlterm/missions";

type Tone = "info" | "ok" | "err" | "warn" | "muted";
type Line =
  | { t: "in"; db: string; text: string }
  | { t: "out"; tone: Tone; text: string }
  | { t: "rows"; columns: string[]; rows: SqlValue[][] };

const TONE: Record<Tone, string> = {
  info: "text-foreground",
  ok: "text-success",
  err: "text-critical",
  warn: "text-warning",
  muted: "text-foreground-muted",
};

const MAX_ROWS = 200;

const HELP = `Real SQLite (WebAssembly) in your browser. Databases are saved in this browser's localStorage.

End SQL statements with ;  — press Enter to continue onto the next line.
Up/Down: history · Ctrl+L: clear · Ctrl+C: cancel the current input · Shift+Enter: force a newline

Databases   CREATE DATABASE shop;   USE shop;   SHOW DATABASES;   DROP DATABASE shop;
Tables      CREATE TABLE t (id INTEGER PRIMARY KEY, name TEXT);   SHOW TABLES;   DESCRIBE t;   DROP TABLE t;
Data        INSERT INTO t (name) VALUES ('a'), ('b');   SELECT * FROM t WHERE ... ORDER BY ... LIMIT ...;
            UPDATE t SET name = 'c' WHERE id = 1;   DELETE FROM t WHERE id = 2;
            JOINs, GROUP BY / HAVING, subqueries, CTEs and window functions all work.

Helpers     .tables   .schema [table]   .databases   clear   help
Games       missions   mission <n>   hint   skip   solution   task   quit`;

const COMMANDS = new Set(["help", "clear", "cls", "missions", "games", "mission", "play", "hint", "skip", "solution", "task", "quit", "tables", "schema", "databases", "dbs"]);

/** non-SQL helper commands run on Enter without a trailing ; */
function helper(text: string) {
  const m = text.includes("\n") ? null : /^\.?([a-z]+)(?:\s+(\w+))?\s*;?$/i.exec(text);
  const cmd = m?.[1].toLowerCase();
  return m && cmd && COMMANDS.has(cmd) ? { cmd, arg: m[2] ?? "" } : null;
}

const say = (tone: Tone, text: string): Line => ({ t: "out", tone, text });

function outLines(out: Out): Line[] {
  if (out.kind === "rows") return [{ t: "rows", columns: out.columns, rows: out.rows }];
  return [say(out.kind === "ok" ? "ok" : "err", out.kind === "ok" ? out.message : `ERROR: ${out.message}`)];
}

const cell = (v: SqlValue) =>
  v === null ? <span className="text-foreground-muted/50">NULL</span> : v instanceof Uint8Array ? <span className="text-foreground-muted">{`<blob ${v.length}B>`}</span> : String(v);

function Rows({ columns, rows }: { columns: string[]; rows: SqlValue[][] }) {
  const shown = rows.slice(0, MAX_ROWS);
  return (
    <div className="overflow-x-auto py-1">
      <table className="text-left text-[11px]">
        <thead>
          <tr>
            {columns.map((c, i) => (
              <th key={i} className="whitespace-nowrap border-b border-border px-2 py-1 font-semibold text-accent">
                {c}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {shown.map((r, i) => (
            <tr key={i} className="text-foreground">
              {r.map((v, j) => (
                <td key={j} className="whitespace-pre border-b border-border/40 px-2 py-1 tabular-nums">
                  {cell(v)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
      <p className="px-2 pt-1 text-foreground-muted">
        {rows.length === 0 ? "Empty set" : `(${rows.length} row${rows.length === 1 ? "" : "s"})`}
        {rows.length > MAX_ROWS && ` — showing the first ${MAX_ROWS}, add a LIMIT`}
      </p>
    </div>
  );
}

export default function SqlTerminal() {
  const open = useSimStore((s) => s.termOpen);
  const toggle = useSimStore((s) => s.toggleTerm);
  const pane = useDbView((s) => s.pane);
  const setPane = useDbView((s) => s.setPane);
  const publish = useDbView((s) => s.publish);
  const [lines, setLines] = useState<Line[]>([]);
  const [input, setInput] = useState("");
  const [db, setDb] = useState("…");
  const [ready, setReady] = useState(false);
  const [saveFailed, setSaveFailed] = useState(false);
  const [mission, setMission] = useState<{ id: number; task: number } | null>(null);
  const ws = useRef<Workspace | null>(null);
  const booted = useRef(false);
  const progress = useRef<Record<number, number>>({});
  const hist = useRef({ items: [] as string[], at: -1, draft: "" });
  const box = useRef<HTMLDivElement>(null);
  const field = useRef<HTMLTextAreaElement>(null);

  const print = (...l: Line[]) => setLines((p) => [...p, ...l]);

  // the engine (~700KB) is fetched the first time the terminal opens
  useEffect(() => {
    if (!open || booted.current) return;
    booted.current = true;
    loadSqlJs()
      .then((SQL) => {
        let store: Storage | null = null;
        try {
          store = window.localStorage;
        } catch {
          /* storage blocked: databases live for this tab only */
        }
        const w = new Workspace(SQL, store);
        const v = w.query("SELECT sqlite_version()");
        ws.current = w;
        progress.current = loadProgress();
        setDb(w.current);
        publish(w.current, w.snapshot());
        setReady(true);
        print(
          say("ok", `SQLite ${v.kind === "rows" ? v.rows[0][0] : ""} — a real SQL database, running in your browser. No server involved.`),
          say("muted", w.restored ? `Restored ${w.restored} database${w.restored === 1 ? "" : "s"} from your last visit. ` : "A fresh database 'playground' is ready. "),
          say("info", "Type help for commands, or missions to play the SQL games."),
        );
      })
      .catch(() => {
        booted.current = false;
        print(say("err", "ERROR: could not load the SQLite engine — check your connection, then close and reopen the terminal."));
      });
  }, [open, publish]);

  useEffect(() => {
    box.current?.scrollTo(0, box.current.scrollHeight);
  }, [lines, open]);

  useEffect(() => {
    if (open) field.current?.focus();
  }, [open]);

  const m = mission && MISSIONS.find((x) => x.id === mission.id);

  const taskLines = (mm: Mission, i: number): Line[] => [
    say("info", `Task ${i + 1}/${mm.tasks.length}: ${mm.tasks[i].ask}`),
    say("muted", "hint · skip · solution · quit"),
  ];

  const startMission = (mm: Mission): Line[] => {
    ws.current!.reseed(mm.db, mm.seed);
    setDb(mm.db);
    publish(mm.db, ws.current!.snapshot(), null);
    setMission({ id: mm.id, task: 0 });
    return [
      say("ok", `━━ Mission ${mm.id}: ${mm.title}`),
      say("muted", `${mm.blurb}\nYou're connected to database '${mm.db}' (reset to its starting state). Try .tables`),
      ...taskLines(mm, 0),
    ];
  };

  const advance = (mm: Mission, solved: boolean): Line[] => {
    const next = mission!.task + 1;
    if (solved) {
      progress.current = { ...progress.current, [mm.id]: Math.max(progress.current[mm.id] ?? 0, next) };
      saveProgress(progress.current);
    }
    const head = solved ? say("ok", "✔ Correct!") : say("muted", "Skipped.");
    if (next < mm.tasks.length) {
      setMission({ id: mm.id, task: next });
      return [head, ...taskLines(mm, next)];
    }
    setMission(null);
    return [head, say("ok", `★ Mission ${mm.id} finished — ${mm.title}`), say("info", mm.outro), say("muted", "missions lists the other games.")];
  };

  const command = (cmd: string, arg: string): Line[] => {
    const w = ws.current!;
    const task = m && mission ? m.tasks[mission.task] : null;
    const needMission = () => [say("warn", "No active mission — type missions to pick one.")];
    switch (cmd) {
      case "help":
        return [say("info", HELP)];
      case "missions":
      case "games":
        return [
          say(
            "info",
            MISSIONS.map((x) => {
              const p = progress.current[x.id] ?? 0;
              const status = p >= x.tasks.length ? "✔ done" : p ? `${p}/${x.tasks.length}` : "new";
              return `  ${x.id}  ${x.title.padEnd(18)} ${status.padEnd(7)} ${x.tasks.length} tasks · ${x.db}`;
            }).join("\n"),
          ),
          say("muted", `mission <n> starts one — each gets its own database.`),
        ];
      case "mission":
      case "play": {
        const pick = MISSIONS.find((x) => String(x.id) === arg);
        return pick ? startMission(pick) : [say("err", `usage: mission <1-${MISSIONS.length}>   (type missions)`)];
      }
      case "tables":
        return outLines(w.showTables());
      case "schema":
        return outLines(w.schema(arg || undefined));
      case "databases":
      case "dbs":
        return outLines(w.showDatabases());
      case "task":
        return m && mission ? taskLines(m, mission.task) : needMission();
      case "hint":
        return task ? [say("warn", `Hint: ${task.hint}`)] : needMission();
      case "solution":
        return task ? [say("warn", `One answer:\n${task.solution}`), say("muted", "Run it yourself to solve the task.")] : needMission();
      case "skip":
        return m && mission ? advance(m, false) : needMission();
      case "quit":
        setMission(null);
        return [say("muted", m ? `Left mission ${m.id}. Its database '${m.db}' is still there.` : "Not in a mission.")];
      default:
        return [];
    }
  };

  const exec = (raw: string) => {
    const w = ws.current;
    const text = raw.trim();
    if (!w || !text) return;
    const h = hist.current;
    if (h.items[0] !== text) h.items.unshift(text);
    h.at = -1;
    const echo: Line = { t: "in", db: w.current, text: raw.trimEnd() };
    const cmd = helper(text);
    if (cmd?.cmd === "clear" || cmd?.cmd === "cls") return setLines([]);
    if (cmd) return print(echo, ...command(cmd.cmd, cmd.arg));

    const steps = w.run(text);
    const out = steps.flatMap((s) => outLines(s.out));
    if (m && mission) {
      if (w.current !== m.db) out.push(say("muted", `Mission answers are checked in '${m.db}' — USE ${m.db};`));
      else {
        const r = checkTask(m.tasks[mission.task], w, steps);
        if (r?.ok) out.push(...advance(m, true));
        else if (r) out.push(say("warn", `✘ ${r.note}`));
      }
    }
    const joins = steps.flatMap((x) => (x.out.kind === "rows" ? w.joinViews(x.sql, x.out.rows.length) : []));
    publish(w.current, w.snapshot(), joins.length ? joins : undefined);
    setDb(w.current);
    setSaveFailed(w.saveFailed);
    print(echo, ...out);
  };

  const submit = () => {
    if (!ws.current) return; // still loading: keep what was typed
    exec(input);
    setInput("");
  };

  const recall = (dir: 1 | -1) => {
    const h = hist.current;
    if ((dir === 1 && h.at + 1 >= h.items.length) || (dir === -1 && h.at < 0)) return false;
    if (h.at < 0) h.draft = input;
    h.at += dir;
    setInput(h.at < 0 ? h.draft : h.items[h.at]);
    return true;
  };

  const onKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    const el = e.currentTarget;
    if (e.key === "Enter" && !e.shiftKey) {
      // a complete statement (or helper command) runs; otherwise Enter just continues on a new line
      if (!input.trim() || helper(input.trim()) || scan(input).done) {
        e.preventDefault();
        submit();
      }
    } else if (e.key === "ArrowUp" && !input.slice(0, el.selectionStart).includes("\n")) {
      if (recall(1)) e.preventDefault();
    } else if (e.key === "ArrowDown" && !input.slice(el.selectionEnd).includes("\n")) {
      if (recall(-1)) e.preventDefault();
    } else if (e.ctrlKey && e.key === "l") {
      e.preventDefault();
      setLines([]);
    } else if (e.ctrlKey && e.key === "c" && el.selectionStart === el.selectionEnd) {
      e.preventDefault();
      print({ t: "in", db, text: `${input}^C` });
      setInput("");
    } else if (e.key === "Escape") {
      toggle();
    }
  };

  if (!open) return null;

  const chips = m ? ["hint", "skip", "solution", "quit"] : ["help", "missions", ".tables", "SHOW DATABASES;"];

  return (
    <div className={`pointer-events-auto absolute inset-x-3 bottom-3 top-3 z-40 flex flex-col rounded-xl border border-border bg-bg-elevated/95 font-mono text-xs shadow-[0_24px_60px_-12px_rgba(0,0,0,0.8)] backdrop-blur sm:left-auto sm:right-4 sm:top-4 sm:bottom-4 sm:w-[min(760px,calc(100%-2rem))] lg:w-[min(680px,calc(50%-1rem))] ${pane === "diagram" ? "max-lg:hidden" : ""}`}>
      <div className="flex items-center justify-between border-b border-border px-3 py-2">
        <span className="text-[10px] uppercase tracking-widest text-accent">sql terminal · {db}</span>
        <span className="flex items-center gap-3">
          <span className={`text-[10px] ${saveFailed ? "text-warning" : "text-foreground-muted"}`}>
            {saveFailed ? "can't save — storage blocked" : "saved in this browser"}
          </span>
          <button
            onClick={() => setPane("diagram")}
            className="cursor-pointer rounded border border-border px-1.5 py-0.5 text-[10px] uppercase tracking-widest text-foreground-muted hover:border-accent/50 hover:text-accent lg:hidden"
          >
            diagram
          </button>
          <button onClick={toggle} aria-label="Close SQL terminal" className="cursor-pointer text-sm text-foreground-muted hover:text-foreground">
            ✕
          </button>
        </span>
      </div>

      <div
        ref={box}
        role="log"
        aria-label="SQL terminal output"
        onClick={() => !window.getSelection()?.toString() && field.current?.focus()}
        className="min-h-0 flex-1 space-y-1 overflow-y-auto px-3 py-2"
      >
        {lines.map((l, i) =>
          l.t === "rows" ? (
            <Rows key={i} columns={l.columns} rows={l.rows} />
          ) : l.t === "in" ? (
            <div key={i} className="whitespace-pre-wrap break-words text-foreground">
              {l.text.split("\n").map((row, j) => (
                <div key={j}>
                  <span className="text-accent">{j ? "    ->" : `${l.db}>`}</span> {row}
                </div>
              ))}
            </div>
          ) : (
            <p key={i} className={`whitespace-pre-wrap break-words ${TONE[l.tone]}`}>
              {l.text}
            </p>
          ),
        )}
        {!ready && <p className="text-foreground-muted">loading SQLite engine…</p>}
      </div>

      {m && mission && (
        <div className="border-t border-border bg-accent/5 px-3 py-2">
          <p className="text-[10px] uppercase tracking-widest text-accent">
            Mission {m.id} · {m.title} · task {mission.task + 1}/{m.tasks.length}
          </p>
          <p className="mt-1 text-foreground">{m.tasks[mission.task].ask}</p>
        </div>
      )}

      <div className="flex flex-wrap items-center gap-1.5 border-t border-border px-3 pt-2">
        {chips.map((c) => (
          <button
            key={c}
            disabled={!ready}
            onClick={() => {
              exec(c);
              field.current?.focus();
            }}
            className="cursor-pointer rounded border border-border bg-surface px-1.5 py-0.5 text-[10px] text-foreground-muted transition-colors hover:border-accent/50 hover:text-accent disabled:cursor-not-allowed disabled:opacity-40"
          >
            {c}
          </button>
        ))}
      </div>

      <div className="flex items-start gap-2 px-3 pb-3 pt-2">
        <span className="pt-0.5 text-accent">{db}&gt;</span>
        <textarea
          ref={field}
          value={input}
          rows={Math.min(8, input.split("\n").length)}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={onKeyDown}
          spellCheck={false}
          autoCapitalize="off"
          autoCorrect="off"
          aria-label="SQL input"
          placeholder="CREATE DATABASE shop;   (end statements with ;)"
          className="min-w-0 flex-1 resize-none bg-transparent pt-0.5 text-foreground caret-accent outline-none placeholder:text-foreground-muted/40"
        />
      </div>
    </div>
  );
}
