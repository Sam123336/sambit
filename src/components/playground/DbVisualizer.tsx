"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { useSimStore } from "@/store/simStore";
import { runCommand, useDbView } from "@/store/dbViewStore";
import type { JoinSide, JoinView, SqlValue, TableInfo } from "@/lib/sqlterm/workspace";

const cell = (v: SqlValue) =>
  v === null ? <span className="text-foreground-muted/50">NULL</span> : v instanceof Uint8Array ? "<blob>" : String(v);

function TableCard({ t, glow, onFocus }: { t: TableInfo; glow: boolean; onFocus: (name: string) => void }) {
  // rows added by the latest statement flash; Infinity = nothing new
  const fresh = t.count > t.prev ? t.prev : Infinity;
  return (
    <motion.div
      layout
      initial={{ opacity: 0, scale: 0.92, y: 14 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.9 }}
      transition={{ duration: 0.3 }}
      className={`relative min-w-0 rounded-xl border bg-bg-elevated/85 p-3 font-mono backdrop-blur transition-colors ${glow ? "border-accent" : "border-border"}`}
    >
      <motion.span
        key={`${t.count}:${t.columns.length}`}
        aria-hidden
        className="pointer-events-none absolute inset-0 rounded-xl"
        initial={{ opacity: 1 }}
        animate={{ opacity: 0 }}
        transition={{ duration: 1.2 }}
        style={{ boxShadow: "0 0 0 1.5px var(--color-accent), 0 0 28px var(--color-accent-glow)" }}
      />
      <div className="flex items-baseline justify-between gap-2">
        <h3 className="truncate text-sm font-semibold text-accent">{t.name}</h3>
        <span className="shrink-0 text-[10px] text-foreground-muted">
          {t.count} row{t.count === 1 ? "" : "s"}
        </span>
      </div>

      {t.fks.length > 0 && (
        <div className="mt-1.5 flex flex-wrap gap-1">
          {t.fks.map((f) => (
            <button
              key={f.from}
              onClick={() => onFocus(f.table)}
              className="cursor-pointer rounded border border-accent-2/40 bg-accent-2/10 px-1.5 py-0.5 text-[9px] text-accent-2 hover:bg-accent-2/20"
            >
              {f.from} → {f.table}.{f.to ?? "id"}
            </button>
          ))}
        </div>
      )}

      <div className="mt-2 overflow-x-auto">
        <table className="w-full text-left text-[10px]">
          <thead>
            <tr>
              {t.columns.map((c) => (
                <th key={c.name} className="whitespace-nowrap border-b border-border px-1.5 py-1 align-bottom font-semibold text-foreground">
                  {c.name}
                  {c.pk && <span className="ml-1 text-accent">PK</span>}
                  <div className="font-normal text-foreground-muted/70">{c.type || "any"}</div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {t.rows.map((r, i) => (
              <motion.tr
                key={i >= fresh ? `new${i}:${t.count}` : i}
                initial={i >= fresh ? { backgroundColor: "rgba(56,189,248,0.35)" } : false}
                animate={{ backgroundColor: "rgba(56,189,248,0)" }}
                transition={{ duration: 1.4 }}
                className="text-foreground-muted"
              >
                {r.map((v, j) => (
                  <td key={j} className="max-w-[110px] truncate border-b border-border/40 px-1.5 py-1 tabular-nums">
                    {cell(v)}
                  </td>
                ))}
              </motion.tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="mt-1.5 text-[10px] text-foreground-muted/70">
        {t.count === 0 ? "empty — INSERT something" : t.count > t.rows.length ? `+${t.count - t.rows.length} more` : ""}
      </p>
    </motion.div>
  );
}

const ROW_H = 26;
const HEAD_H = 52; // table title + column header
const GUTTER = 88;

const EXPLAIN: Record<JoinView["type"], string> = {
  inner: "keeps only rows that match on both sides",
  left: "keeps every left row; no match → NULLs on the right",
  right: "keeps every right row; no match → NULLs on the left",
  full: "keeps every row from both sides",
  cross: "pairs every left row with every right row",
};

function Side({ s, matched, keep, cross }: { s: JoinSide; matched: Set<number>; keep: boolean; cross: boolean }) {
  return (
    <div className="min-w-0 rounded-lg border border-border bg-bg/60">
      <div className="flex h-7 items-center justify-between px-2 text-[11px]">
        <span className="truncate font-semibold text-accent">{s.table}</span>
        <span className="shrink-0 text-[10px] text-foreground-muted">
          {s.rows.length < s.total ? `first ${s.rows.length} of ${s.total}` : `${s.total} rows`}
        </span>
      </div>
      <div className="flex h-6 items-center border-y border-border/60 px-2 text-[10px] text-foreground-muted">
        <div className="grid min-w-0 flex-1 gap-2" style={{ gridTemplateColumns: `repeat(${s.cols.length}, minmax(0, 1fr))` }}>
          {s.cols.map((c, i) => (
            <span key={c} className={`truncate ${i === s.key ? "font-semibold text-accent" : ""}`}>
              {i === s.key ? `🔑 ${c}` : c}
            </span>
          ))}
        </div>
        <span className="w-5" />
      </div>
      {s.rows.map((r, i) => {
        const hit = cross || matched.has(i);
        return (
          <motion.div
            key={i}
            initial={{ opacity: 0, x: -6 }}
            animate={{ opacity: hit || keep ? 1 : 0.45, x: 0 }}
            transition={{ delay: 0.03 * i, duration: 0.25 }}
            style={{ height: ROW_H }}
            className={`flex items-center border-l-2 px-2 text-[10px] ${
              hit ? "border-accent bg-accent/10 text-foreground" : keep ? "border-warning bg-warning/5 text-foreground" : "border-transparent text-foreground-muted"
            }`}
          >
            <div className="grid min-w-0 flex-1 gap-2 tabular-nums" style={{ gridTemplateColumns: `repeat(${s.cols.length}, minmax(0, 1fr))` }}>
              {r.map((v, j) => (
                <span key={j} className="truncate">
                  {cell(v)}
                </span>
              ))}
            </div>
            <span className={`w-5 text-center ${hit ? "text-accent" : keep ? "text-warning" : "text-critical/70"}`}>{hit ? "✓" : keep ? "∅" : "✕"}</span>
          </motion.div>
        );
      })}
    </div>
  );
}

function JoinPanel({ v }: { v: JoinView }) {
  const rows = Math.max(v.left.rows.length, v.right.rows.length, 1);
  const height = HEAD_H + rows * ROW_H;
  const y = (i: number) => HEAD_H + i * ROW_H + ROW_H / 2;
  const leftHit = new Set(v.links.map((l) => l[0]));
  const rightHit = new Set(v.links.map((l) => l[1]));
  const keepLeft = v.type === "left" || v.type === "full";
  const keepRight = v.type === "right" || v.type === "full";
  const cross = v.type === "cross";
  const noKey = !cross && (v.left.key < 0 || v.right.key < 0);

  return (
    <div className="rounded-xl border border-border bg-bg-elevated/85 p-3 font-mono backdrop-blur">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
        <span className="rounded border border-accent/40 bg-accent/10 px-1.5 py-0.5 text-[10px] uppercase tracking-widest text-accent">{v.type} join</span>
        {v.on && <span className="min-w-0 truncate text-[11px] text-foreground">{v.on}</span>}
      </div>
      <p className="mt-1 text-[10px] text-foreground-muted">{EXPLAIN[v.type]}</p>

      <div className="mt-3 grid items-start" style={{ gridTemplateColumns: `minmax(0, 1fr) ${GUTTER}px minmax(0, 1fr)` }}>
        <Side s={v.left} matched={leftHit} keep={keepLeft} cross={cross} />
        <svg viewBox={`0 0 100 ${height}`} preserveAspectRatio="none" width={GUTTER} height={height} aria-hidden>
          {v.links.map(([l, r], k) => (
            <motion.path
              key={`${l}-${r}`}
              d={`M0,${y(l)} C50,${y(l)} 50,${y(r)} 100,${y(r)}`}
              fill="none"
              strokeWidth={1.5}
              vectorEffect="non-scaling-stroke"
              style={{ stroke: "var(--color-accent)", filter: "drop-shadow(0 0 3px var(--color-accent-glow))" }}
              initial={{ pathLength: 0, opacity: 0 }}
              animate={{ pathLength: 1, opacity: 0.9 }}
              transition={{ delay: 0.35 + 0.07 * k, duration: 0.5, ease: "easeOut" }}
            />
          ))}
        </svg>
        <Side s={v.right} matched={rightHit} keep={keepRight} cross={cross} />
      </div>

      <p className="mt-3 text-[11px] text-foreground">
        {cross
          ? `${v.left.total} × ${v.right.total} = ${v.left.total * v.right.total} combinations`
          : noKey
            ? "The ON condition isn't a plain a.x = b.y, so no match lines — the terminal shows the result."
            : `${v.links.length} matching pair${v.links.length === 1 ? "" : "s"} in the sample`}
        <span className="text-foreground-muted"> → your query returned {v.result} row{v.result === 1 ? "" : "s"}</span>
      </p>
      <p className="mt-1 text-[10px] text-foreground-muted/70">✓ matched · ✕ dropped by the join · ∅ kept with NULLs</p>
    </div>
  );
}

export default function DbVisualizer() {
  const open = useSimStore((s) => s.termOpen);
  const { db, tables, databases, join, joinKey, pane } = useDbView();
  const replay = useDbView((s) => s.replay);
  const clearJoin = useDbView((s) => s.clearJoin);
  const setPane = useDbView((s) => s.setPane);
  const [glow, setGlow] = useState<string | null>(null);

  if (!open) return null;

  const focus = (name: string) => {
    setGlow(name);
    setTimeout(() => setGlow(null), 1500);
  };

  return (
    <div className={`page-bg absolute inset-0 z-[35] bg-bg ${pane === "terminal" ? "max-lg:hidden" : ""}`}>
      <div className="absolute inset-y-0 left-0 right-0 overflow-y-auto p-4 lg:right-[calc(min(680px,calc(50%-1rem))+2rem)]">
        <div className="flex items-end justify-between gap-3">
          <div className="min-w-0">
            <p className="font-mono text-[10px] uppercase tracking-widest text-accent">database</p>
            <h2 className="mt-1 truncate font-mono text-lg font-semibold">{db || "…"}</h2>
          </div>
          <p className="shrink-0 font-mono text-[10px] uppercase tracking-widest text-foreground-muted">
            {tables.length} table{tables.length === 1 ? "" : "s"}
          </p>
        </div>

        {databases.length > 0 && (
          <div className="mt-4 flex flex-wrap items-center gap-2 font-mono text-[11px]">
            <AnimatePresence initial={false}>
              {databases.map((d) => (
                <motion.button
                  key={d.name}
                  layout
                  initial={{ opacity: 0, scale: 0.85 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.85 }}
                  onClick={() => d.name !== db && runCommand(`USE ${d.name};`)}
                  title={d.name === db ? "current database" : `USE ${d.name};`}
                  className={`flex items-center gap-1.5 rounded-md border px-2.5 py-1 transition-colors ${
                    d.name === db
                      ? "border-accent bg-accent/10 text-accent"
                      : "cursor-pointer border-border text-foreground-muted hover:border-accent/50 hover:text-accent"
                  }`}
                >
                  <span aria-hidden>▤</span>
                  {d.name}
                  <span className="text-[10px] opacity-60">
                    {d.tables} table{d.tables === 1 ? "" : "s"}
                  </span>
                </motion.button>
              ))}
            </AnimatePresence>
          </div>
        )}

        {join && join.length > 0 && (
          <section className="mt-5">
            <div className="mb-2 flex items-center justify-between font-mono text-[10px] uppercase tracking-widest text-foreground-muted">
              <span>last join · how the rows matched</span>
              <span className="flex gap-3">
                <button onClick={replay} className="cursor-pointer hover:text-accent">
                  ↻ replay
                </button>
                <button onClick={clearJoin} aria-label="Dismiss join view" className="cursor-pointer hover:text-foreground">
                  ✕
                </button>
              </span>
            </div>
            <div className="space-y-3">
              {join.map((j, i) => (
                <JoinPanel key={`${joinKey}:${i}`} v={j} />
              ))}
            </div>
          </section>
        )}

        <section className="mt-5">
          {tables.length === 0 ? (
            <div className="rounded-xl border border-dashed border-border p-6 font-mono text-xs text-foreground-muted">
              <p className="text-foreground">{db ? `No tables in '${db}' yet.` : "Loading SQLite…"}</p>
              {db && (
                <>
                  <p className="mt-2">Create one in the terminal and it shows up here as a card:</p>
                  <p className="mt-2 text-accent">CREATE TABLE users (id INTEGER PRIMARY KEY, name TEXT);</p>
                  <p className="mt-2">Add a second table and write a JOIN to watch the rows match. Or type missions.</p>
                </>
              )}
            </div>
          ) : (
            <motion.div layout className="grid gap-3" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(230px, 1fr))" }}>
              <AnimatePresence mode="popLayout">
                {tables.map((t) => (
                  <TableCard key={`${db}/${t.name}`} t={t} glow={glow === t.name} onFocus={focus} />
                ))}
              </AnimatePresence>
            </motion.div>
          )}
        </section>
        <div className="h-16" />
      </div>

      <button
        onClick={() => setPane("terminal")}
        className="absolute bottom-4 right-4 cursor-pointer rounded-md border border-accent/40 bg-bg-elevated px-3.5 py-2 font-mono text-[11px] uppercase tracking-widest text-accent lg:hidden"
      >
        terminal
      </button>
    </div>
  );
}
