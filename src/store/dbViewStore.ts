import { create } from "zustand";
import type { JoinView, TableInfo } from "@/lib/sqlterm/workspace";

// What the SQL terminal tells the left-hand database view after each statement.
interface DbViewState {
  db: string;
  tables: TableInfo[];
  join: JoinView[] | null;
  /** bumped to replay the join animation */
  joinKey: number;
  /** below lg the terminal and the diagram share the screen: which one is showing */
  pane: "terminal" | "diagram";
  /** `join`: undefined keeps the last one (same database), null clears it */
  publish: (db: string, tables: TableInfo[], join?: JoinView[] | null) => void;
  clearJoin: () => void;
  replay: () => void;
  setPane: (pane: "terminal" | "diagram") => void;
}

export const useDbView = create<DbViewState>((set) => ({
  db: "",
  tables: [],
  join: null,
  joinKey: 0,
  pane: "terminal",
  publish: (db, tables, join) =>
    set((s) => {
      const before = new Map(s.tables.map((t) => [t.name, t.count]));
      return {
        db,
        tables: tables.map((t) => ({ ...t, prev: s.db === db ? (before.get(t.name) ?? 0) : t.count })),
        join: join === undefined ? (s.db === db ? s.join : null) : join,
        joinKey: join?.length ? s.joinKey + 1 : s.joinKey,
      };
    }),
  clearJoin: () => set({ join: null }),
  replay: () => set((s) => ({ joinKey: s.joinKey + 1 })),
  setPane: (pane) => set({ pane }),
}));
