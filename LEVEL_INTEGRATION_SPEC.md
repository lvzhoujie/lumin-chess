# Lumin Chess — Level Integration Spec

This document is the handoff for an engineering agent (e.g. Claude Code) tasked with taking levels designed in `level-editor.html` and adding them to the live game in `index.html`.

It covers:

1. The game rules (so you can write a solver and validate levels).
2. The level-editor output formats (`levels.json` + `levels.md`).
3. The integration steps to turn that output into entries in the `LEVELS` array inside `index.html`.
4. Known gaps you may need to close before some designs are playable.

---

## 1. Game overview

**Lumin Chess** is a sliding-pair puzzle game. The board is a rectangular grid containing **white (`W`)**, **black (`B`)**, and optional **gray (`G`)** stones, plus empty cells (`null`). The player swaps every white with every black; grays are neutral obstacles that occupy space and can be slid around. Each level has a *par* number of moves (`optimum`); a level is "passed" when solved in `≤ floor(par * 1.5)` moves, which unlocks the next level.

The existing implementation lives entirely in `/Users/plyu/Downloads/apk/index.html`. The level data is a JS array literal called `LEVELS` near the top of the `<script>` block (search for `var LEVELS = [`).

### 1.1 Pieces

| Code | Meaning |
| --- | --- |
| `'W'` | White stone (one of two player teams) |
| `'B'` | Black stone (other player team) |
| `'G'` | Gray stone (neutral; moves like any other stone but has no team) |
| `null` | Empty cell |
| `'X'` *(editor export only)* | Cell marked inactive in the editor. **The current game engine does not support this** — see §4. |

### 1.2 Move rule (the only rule)

A move consists of:

1. **Pick a pair of orthogonally adjacent stones.** Any two stones with Manhattan distance 1 — that is, horizontally OR vertically adjacent. Color is irrelevant; W/B/G all move identically and any combination of colors can be paired.
2. **Pick a cardinal direction.** Up, down, left, or right.
3. **Both stones slide exactly one cell in that direction, in parallel.** The two destination cells must each be either (a) empty, or (b) one of the cells just vacated by the moving pair. Both destinations must be in bounds.

In code (from `index.html`):

```js
function isValidMove(p1, p2, dir) {
  if (!isAdjacent(p1, p2)) return false;                 // Manhattan distance 1
  if (!grid[p1.r][p1.c] || !grid[p2.r][p2.c]) return false;
  var np1 = { r: p1.r + dir.dr, c: p1.c + dir.dc };
  var np2 = { r: p2.r + dir.dr, c: p2.c + dir.dc };
  if (!inBounds(np1) || !inBounds(np2)) return false;
  var vacated = {};
  vacated[p1.r + ',' + p1.c] = true;
  vacated[p2.r + ',' + p2.c] = true;
  for (var d of [np1, np2]) {
    if (vacated[d.r + ',' + d.c]) continue;              // moving into a vacated cell is fine
    if (grid[d.r][d.c] !== null) return false;           // anything else must be empty
  }
  return true;
}
```

Important things this rule does **not** allow:

- "L-shaped" moves where the two stones split into different directions.
- Jumping or stacking. Each cell holds at most one stone.
- Pushing or capturing other stones.

### 1.3 Win condition

By default the level is solved when **`grid[r][c] === level.goal[r][c]` for every cell `(r, c)`** (i.e. exact match against the goal grid). Some levels override this with a custom `level.isGoal(grid)` function (e.g. Level 3 "Mind the grays" only requires the gray stones to be *somewhere* in their row, not in specific columns).

For all editor-generated levels, the goal is **implicit**: every `W` must end up where a `B` was, every `B` must end up where a `W` was, and every `G` stays exactly where it started. The editor already encodes this as a concrete `goal` grid in the export.

### 1.4 Solvability invariants

- Number of `W` must equal number of `B` in the initial grid (otherwise the W↔B swap goal is unreachable).
- At least one cell must be empty (otherwise no piece can ever move).
- The grid must be connected enough that some pair can slide — a fully-packed board with one hole still admits moves; a board with no adjacent stone pairs does not.
- Parity / reachability: not every "balanced" position is solvable. Use a BFS/IDA* over the state space (states are grid snapshots) to confirm reachability and to compute the **minimum** number of moves (which becomes `optimum`).

---

## 2. Editor output

The editor (`level-editor.html`) produces two files: `levels.json` (canonical, round-trippable) and `levels.md` (human-readable). Both are saved alongside the editor in `/Users/plyu/Downloads/apk/`.

### 2.1 `levels.json` schema

```jsonc
{
  "schema": "lumin-chess-level/v3",
  "generated": "2026-05-15T04:55:00.000Z",         // ISO timestamp
  "canvas": { "rows": 5, "cols": 5 },              // editor canvas size (always 5x5 in v3)
  "goalRule": "swap-W-B (gray stays, blocked cells = X)",
  "levels": [
    {
      "index": 0,                                  // 0-based position in design order
      "active": [[true, true, true, true, true],   // 5x5 boolean mask: which cells are part of the board
                 [true, true, true, true, true],
                 [true, true, true, true, true],
                 [true, true, true, true, true],
                 [true, true, true, true, true]],
      "init":   [["B","B","B",null,null],          // 5x5 starting state on the full canvas
                 [null,null,null,null,null],
                 [null,null,null,null,null],
                 [null,null,null,null,null],
                 [null,null,null,"W","W"]],
      "goal":   [["W","W","W",null,null],          // 5x5 derived goal (W<->B swap, G stays)
                 [null,null,null,null,null],
                 [null,null,null,null,null],
                 [null,null,null,null,null],
                 [null,null,null,"B","B"]],
      "trimmed": {                                 // the same level cropped to its bounding box
        "rows": 5,
        "cols": 5,
        "rowOffset": 0,
        "colOffset": 0,
        "init": [...],                             // rows x cols, with 'X' wherever active=false inside the box
        "goal": [...],                             // rows x cols, same shape
        "hasInactiveInside": false                 // true if any cell inside the bounding box is inactive
      }
    }
    // …more levels…
  ]
}
```

Key points:

- `init` and `goal` on the level object use the full 5×5 canvas, padded with `null` where there are no pieces.
- `trimmed` is the cropped rectangular view that maps directly onto the game's existing `rows`/`cols`/`init`/`goalMarkers` shape.
- **`'X'` appears only inside `trimmed.init` / `trimmed.goal`** when the user marked an inner cell as inactive. The current game engine has no concept of blocked cells (see §4).
- Levels are returned in design order. **No `id`, `name`, or `optimum` is assigned** — the engineering agent must compute these after solving (see §3.2).

### 2.2 `levels.md` format

For each design:

```
## Design #N

- **Board size:** R × C
- **Canvas offset:** row r0, col c0

**Init (starting state):**

```
B B B
. . .
W W W
```

**Goal (derived — W↔B swap):**

```
W W W
. . .
B B B
```
```

ASCII legend: `W` white · `B` black · `G` gray · `.` empty · `#` blocked / off-board.

`levels.md` is for the human (Peter) to skim; the engineering agent should use `levels.json` as the source of truth.

---

## 3. Integration steps

### 3.1 The target shape

The game expects each entry in `LEVELS` to look like this:

```js
{
  id: 4,                            // 1-based, unique, monotonic
  name: 'Some catchy name',         // shown in level header
  optimum: 24,                      // par; min moves to solve
  rows: 5, cols: 5,                 // bounding box
  init: [                           // rows x cols, values in {'W','B','G',null}
    ['B','B','B',null,null],
    [null,null,null,null,null],
    [null,null,null,null,null],
    [null,null,null,null,null],
    [null,null,null,'W','W']
  ],
  goal: [                           // rows x cols, must match `init` shape
    ['W','W','W',null,null],
    [null,null,null,null,null],
    [null,null,null,null,null],
    [null,null,null,null,null],
    [null,null,null,'B','B']
  ]
  // OR provide a custom win check:
  // goalMarkers: [...],            // visual hints (defaults to goal if omitted)
  // isGoal: function (grid) { ... }
}
```

Existing levels live at the top of the IIFE inside `<script>` in `index.html` — search for `var LEVELS = [`. **Always append new levels to the end of the array; never renumber or reorder existing ones**, because `localStorage` keys (`lumin-chess-best-<id>`, `lumin-chess-leaderboard-<id>`) are keyed by `id`. Reordering would orphan player progress.

### 3.2 The translation pipeline

For each entry in `levels.json -> levels[]`:

1. **Validate.** Reject any level where:
   - `trimmed.hasInactiveInside === true` (engine doesn't support blocked interior cells — see §4).
   - W-count ≠ B-count in `trimmed.init`.
   - There are zero empty cells (no move is ever possible).
   - There are no pairs of orthogonally adjacent stones in `init` (first move is impossible).
2. **Solve.** Run a BFS over board states from `trimmed.init`, treating each state as the immutable `rows × cols` grid; expand by enumerating all valid `(pairCell1, pairCell2, dir)` moves per §1.2. Stop when the state equals `trimmed.goal`. Record the shortest path length as `optimum`.
   - For 5×5 boards a vanilla BFS with a `JSON.stringify`-keyed `Set` is generally fast enough; if state space blows up, switch to IDA* with a heuristic like "number of stones not yet on their target color × 0.5". Cap search time and skip levels you can't solve in budget.
3. **Reject unsolvable.** If BFS exhausts without finding the goal, mark the design as unsolvable and surface it to the user — do not add it to `LEVELS`.
4. **Rank.** Sort the surviving solvable designs by `optimum` ascending. This is the order they'll appear in the game (easiest → hardest).
5. **Assign `id`, `name`, `optimum`:**
   - `id` = first unused integer after the max existing `id` in `LEVELS`. New levels keep their assigned id forever.
   - `name` = a short evocative phrase (2–4 words) auto-generated based on the level's shape, piece counts, and solution length. Reasonable approaches:
     - Pure synthesis from features ("Twin towers", "Drifting grays", "The pinch", "Long corridor"), avoiding collision with existing names.
     - Optionally seed via a small LLM call if the agent has one available; otherwise template from heuristics.
   - `optimum` = the BFS solution length from step 2.
6. **Emit the level object** in the shape from §3.1 using `trimmed.init` and `trimmed.goal` as `init` and `goal`. Set `rows = trimmed.rows` and `cols = trimmed.cols`. Do not include `goalMarkers` or `isGoal` unless you specifically need them.
7. **Patch `index.html`.** Append each new level object to the end of the `LEVELS` array. Preserve the existing 2-space indentation and trailing commas. Don't touch any other code.

### 3.3 Verification before declaring done

- Open the modified `index.html` in a browser, confirm the new levels appear in the level selector, and confirm the goal markers render in the right cells.
- Confirm that previously-stored bests/leaderboards for existing levels (1, 2, 3) are unaffected — the keys are id-based, so as long as you didn't change existing ids, this should be automatic.
- Optionally play through one or two of the new levels to confirm `optimum` is achievable (BFS guarantees this, but a smoke test is cheap insurance).

---

## 4. Known engine gaps to flag before integrating

If any of these apply to a design, surface it to Peter rather than silently dropping or hacking around it:

1. **Blocked interior cells (`'X'`).** The current engine treats every cell in the `rows × cols` rectangle as playable. If `trimmed.hasInactiveInside === true`, the design assumes off-board cells the engine doesn't model. Two options:
   - Add blocked-cell support to the engine (treat `'X'` as a non-empty, immovable, non-pairable cell in `grid` and `goal`; update `isValidMove` so destinations cannot land on `'X'`; update render to draw `'X'` cells as inactive).
   - Reject those designs and ask Peter to redesign them with rectangular shapes only.
2. **Custom win conditions.** Some existing levels use `isGoal(grid)` for partial goals (e.g. gray stones can land in any of several valid cells). The editor doesn't author these; if a level needs it, hand-code `isGoal` after generation.
3. **Naming collisions.** If your auto-naming scheme can produce names that already exist in `LEVELS`, suffix with a number or fall back to a generic "Design N".
4. **Threshold inflation.** `passingThreshold = floor(optimum * 1.5)`. If your auto-`optimum` is artificially low (e.g. you only ran BFS to a depth cap), the threshold becomes too tight and the level may be effectively unbeatable for normal players. Always confirm BFS terminated, not timed out.

---

## 5. TL;DR for the engineering agent

> Read `levels.json`. For each `levels[i]`:
>
> 1. Validate (W-count == B-count, no `'X'` inside, at least one empty cell, at least one adjacent pair).
> 2. BFS from `trimmed.init` to `trimmed.goal` under the move rule in §1.2. Record minimum move count as `optimum`. Drop unsolvable designs and report them.
> 3. Sort survivors by `optimum` ascending.
> 4. Assign each `id` (next unused), `name` (auto, short, non-colliding), and `optimum`.
> 5. Append each as a new entry on the end of `LEVELS` in `index.html`, using `trimmed.init` for `init` and `trimmed.goal` for `goal`, plus `rows`/`cols` from `trimmed`.
> 6. Don't touch existing levels or any other code. Smoke-test in a browser.
