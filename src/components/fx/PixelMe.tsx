/**
 * Hand-drawn 16x28 pixel sprite. Each string is one row, one char per pixel,
 * keyed to PALETTE. Two frames make the walk cycle — only the legs differ.
 */
const PALETTE: Record<string, string> = {
  h: "#2a1f2d", // hair — lifted off pure black so it reads on the dark background
  s: "#cf9366", // skin
  d: "#a9714a", // skin shadow
  e: "#1c1616", // eyes
  m: "#8a4f42", // mouth
  n: "#2f4272", // navy shirt
  w: "#ece9e2", // tee at the collar
  t: "#23242c", // trousers
  g: "#767b83", // shoes
  c: "#e2ddd4", // coffee mug
  l: "#4a5060", // laptop shell
  L: "#7fd7ff", // laptop screen
};

// prettier-ignore
const HEAD = [
  ".....hhhhhh.....",
  "....hhhhhhhh....",
  "...hhhhhhhhhh...",
  "..hhhhhhhhhhhh..",
  "..hhhhhhhhhhhh..",
  "..hhhhhhhhhhhh..",
  "..hhhhsssssssh..",
  "..hhsssssssssh..",
  "..hhsddsssddsh..",
  "..hhsssssssssh..",
  "..hhssesssessh..",
  "..hhsssssssssh..",
  "..hhsssmmssssh..",
  "...dssssssssd...",
  "......ssss......",
];

// prettier-ignore
const TORSO = [
  "...nnnnwwnnnn...",
  "..nnnnnwwnnnnn..",
  "..nnnnnwwnnnnn..",
  "..nnnnnnnnnnnn..",
  "..nnnnnnnnnnnn..",
  "..nnnnnnnnnnnn..",
  "..snnnnnnnnnns..",
  "...tttttttttt...",
];

/** Mug lifted to the mouth — pairs with HEAD for the sipping cycle. */
// prettier-ignore
const HEAD_SIP = [
  ".....hhhhhh.....",
  "....hhhhhhhh....",
  "...hhhhhhhhhh...",
  "..hhhhhhhhhhhh..",
  "..hhhhhhhhhhhh..",
  "..hhhhhhhhhhhh..",
  "..hhhhsssssssh..",
  "..hhsssssssssh..",
  "..hhsddsssddsh..",
  "..hhsssssssssh..",
  "..hhssesssessh..",
  "..hhssssssssscc.",
  "..hhsssmmsssscc.",
  "...dssssssssd...",
  "......ssss......",
];

/** Right hand raised holding a mug. */
// prettier-ignore
const TORSO_COFFEE = [
  "...nnnnwwnnnn...",
  "..nnnnnwwnnnnn..",
  "..nnnnnwwnnnncc.",
  "..nnnnnnnnnnscc.",
  "..nnnnnnnnnnnn..",
  "..nnnnnnnnnnnn..",
  "..snnnnnnnnnn...",
  "...tttttttttt...",
];

/** Arm up at the face, mug gone from the chest — the other half of the sip. */
// prettier-ignore
const TORSO_SIP = [
  "...nnnnwwnnnn...",
  "..nnnnnwwnnnnn..",
  "..nnnnnwwnnnnn..",
  "..nnnnnnnnnnnn..",
  "..nnnnnnnnnnnn..",
  "..nnnnnnnnnnnn..",
  "..snnnnnnnnnn...",
  "...tttttttttt...",
];

/** Laptop open at waist height; the two variants shuffle the hands to read as typing. */
// prettier-ignore
const TORSO_LAPTOP_A = [
  "...nnnnwwnnnn...",
  "..nnnnnwwnnnnn..",
  "..nnnnnwwnnnnn..",
  "..nnnnnnnnnnnn..",
  "..nLLLLLLLLLLn..",
  "..slllllllllls..",
  "...llllllllll...",
  "...tttttttttt...",
];

// prettier-ignore
const TORSO_LAPTOP_B = [
  "...nnnnwwnnnn...",
  "..nnnnnwwnnnnn..",
  "..nnnnnwwnnnnn..",
  "..nnnnnnnnnnnn..",
  "..nLLLLLLLLLLn..",
  "..lslllllllsll..",
  "...llllllllll...",
  "...tttttttttt...",
];

/** Both hands thrown up. */
// prettier-ignore
const TORSO_CHEER = [
  ".s.nnnnwwnnnn.s.",
  ".s.nnnwwwnnnn.s.",
  "..nnnnnwwnnnnn..",
  "..nnnnnnnnnnnn..",
  "..nnnnnnnnnnnn..",
  "..nnnnnnnnnnnn..",
  "...nnnnnnnnnn...",
  "...tttttttttt...",
];

// prettier-ignore
const LEGS_STAND = [
  "...tttt..tttt...",
  "...tttt..tttt...",
  "...tttt..tttt...",
  "...gggg..gggg...",
];

// prettier-ignore
const LEGS_STRIDE = [
  "...tttt..tttt...",
  "..tttt....tttt..",
  ".tttt......tttt.",
  ".gggg......gggg.",
];

export const FRAME = {
  stand: 0,
  walk: 1,
  coffee: 2,
  sip: 3,
  typeA: 4,
  typeB: 5,
  cheer: 6,
} as const;

const FRAMES = [
  [...HEAD, ...TORSO, ...LEGS_STAND],
  [...HEAD, ...TORSO, ...LEGS_STRIDE],
  [...HEAD, ...TORSO_COFFEE, ...LEGS_STAND],
  [...HEAD_SIP, ...TORSO_SIP, ...LEGS_STAND],
  [...HEAD, ...TORSO_LAPTOP_A, ...LEGS_STAND],
  [...HEAD, ...TORSO_LAPTOP_B, ...LEGS_STAND],
  [...HEAD, ...TORSO_CHEER, ...LEGS_STRIDE],
];

const W = 16;
const H = 27;

if (process.env.NODE_ENV !== "production") {
  for (const frame of FRAMES) {
    if (frame.length !== H) throw new Error(`sprite frame has ${frame.length} rows, expected ${H}`);
    const bad = frame.find((row) => row.length !== W);
    if (bad) throw new Error(`sprite row "${bad}" is ${bad.length} wide, expected ${W}`);
  }
}

export default function PixelMe({ frame = 0, height = 96 }: { frame?: number; height?: number }) {
  const rows = FRAMES[frame % FRAMES.length];
  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      height={height}
      width={(height * W) / H}
      shapeRendering="crispEdges"
      aria-hidden
      className="drop-shadow-[0_2px_6px_rgba(0,0,0,0.5)]"
    >
      {rows.map((row, y) =>
        [...row].map((char, x) =>
          char === "." ? null : (
            <rect key={`${x}-${y}`} x={x} y={y} width={1} height={1} fill={PALETTE[char]} />
          ),
        ),
      )}
    </svg>
  );
}
