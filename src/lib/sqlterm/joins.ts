// Reads the JOINs out of a SELECT so the playground can draw how they match rows.
// ponytail: regex, not a SQL parser. Handles FROM a [alias] [type] JOIN b [alias] ON x.c = y.d | USING (c);
// subqueries, CTEs, comma joins and non-equality ON conditions fall back to "no link lines".

export type JoinType = "inner" | "left" | "right" | "full" | "cross";

export interface JoinSpec {
  type: JoinType;
  left: string;
  right: string;
  /** equality key columns, when the ON clause is a plain a.x = b.y (or USING) */
  leftCol?: string;
  rightCol?: string;
  /** the join condition as written, for display */
  on: string;
}

const STOP = "on|using|where|inner|left|right|full|cross|natural|join|group|order|having|limit|union|window";
const ALIAS = `(?:\\s+(?:as\\s+)?(?!(?:${STOP})\\b)(\\w+))?`;
const FROM_RE = new RegExp(`\\bfrom\\s+["\`]?(\\w+)["\`]?${ALIAS}`, "i");
const JOIN_RE = new RegExp(
  `\\b(?:(inner|left|right|full|cross|natural)(?:\\s+outer)?\\s+)?join\\s+["\`]?(\\w+)["\`]?${ALIAS}` +
    `(?:\\s+(on|using)\\b\\s*(.*?))?` +
    `(?=\\s+(?:(?:inner|left|right|full|cross|natural)\\s+)?(?:outer\\s+)?join\\b|\\s+(?:where|group|order|having|limit|union|window)\\b|;|\\)|$)`,
  "gi",
);
const EQ_RE = /(\w+)\.(\w+)\s*=\s*(\w+)\.(\w+)/;

/** `tables` maps lower-cased table name -> real name; joins touching unknown tables are skipped */
export function parseJoins(sql: string, tables: Map<string, string>): JoinSpec[] {
  const s = sql
    .replace(/'(?:[^']|'')*'/g, "''")
    .replace(/--.*$/gm, " ")
    .replace(/\/\*[\s\S]*?\*\//g, " ")
    .replace(/\s+/g, " ");
  const from = FROM_RE.exec(s);
  if (!from) return [];

  const aliases = new Map<string, string>(); // alias or table name (lower) -> table
  const reg = (name: string, alias?: string) => {
    aliases.set(name.toLowerCase(), name);
    if (alias) aliases.set(alias.toLowerCase(), name);
  };
  reg(from[1], from[2]);
  let prev = from[1];

  const out: JoinSpec[] = [];
  JOIN_RE.lastIndex = from.index + from[0].length;
  for (let m = JOIN_RE.exec(s); m; m = JOIN_RE.exec(s)) {
    const [, kind = "inner", right, alias, clause, cond = ""] = m;
    reg(right, alias);
    const rightKey = (alias ?? right).toLowerCase();
    const t = kind.toLowerCase();
    const spec: JoinSpec = {
      type: t === "natural" ? "inner" : (t as JoinType),
      left: prev,
      right,
      on: clause ? `${clause.toUpperCase()} ${cond.trim()}`.trim() : "",
    };
    if (clause?.toLowerCase() === "using") {
      const col = /\(\s*["`]?(\w+)/.exec(cond)?.[1];
      if (col) spec.leftCol = spec.rightCol = col;
    } else {
      const eq = EQ_RE.exec(cond);
      if (eq) {
        const [, a1, c1, a2, c2] = eq;
        if (a1.toLowerCase() === rightKey && aliases.has(a2.toLowerCase())) {
          spec.rightCol = c1;
          spec.leftCol = c2;
          spec.left = aliases.get(a2.toLowerCase())!;
        } else if (a2.toLowerCase() === rightKey && aliases.has(a1.toLowerCase())) {
          spec.rightCol = c2;
          spec.leftCol = c1;
          spec.left = aliases.get(a1.toLowerCase())!;
        }
      }
    }
    prev = right;
    const l = tables.get(spec.left.toLowerCase());
    const r = tables.get(spec.right.toLowerCase());
    if (l && r) out.push({ ...spec, left: l, right: r });
  }
  return out;
}
