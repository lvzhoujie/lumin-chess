#!/usr/bin/env node
// Compute the optimal solution for each Lumin Chess level using
// bidirectional BFS (forward from start, backward from every goal state).
// Uses sharded Sets/Maps so V8's ~16 M-per-Set ceiling doesn't bite.

const LEVELS = [
  {
    id: 1, rows: 3, cols: 3,
    init: [
      ['B', 'B', 'B'],
      [null, null, null],
      ['W', 'W', 'W']
    ],
    goal: [
      ['W', 'W', 'W'],
      [null, null, null],
      ['B', 'B', 'B']
    ]
  },
  {
    id: 2, rows: 5, cols: 3,
    init: [
      ['B', 'B', 'B'],
      ['B', 'B', 'B'],
      [null, null, null],
      ['W', 'W', 'W'],
      ['W', 'W', 'W']
    ],
    goal: [
      ['W', 'W', 'W'],
      ['W', 'W', 'W'],
      [null, null, null],
      ['B', 'B', 'B'],
      ['B', 'B', 'B']
    ]
  },
  {
    id: 3, rows: 5, cols: 4,
    init: [
      ['B', 'B', 'B', 'B'],
      ['B', 'B', 'B', 'B'],
      ['G', null, null, 'G'],
      ['W', 'W', 'W', 'W'],
      ['W', 'W', 'W', 'W']
    ],
    enumerateGoals(R, C) {
      // top 2 rows W; bottom 2 rows B; middle row has exactly 2 G + 2 '.'
      const goals = [];
      const positions = [];
      for (let i = 0; i < C; i++) for (let j = i + 1; j < C; j++) positions.push([i, j]);
      for (const [i, j] of positions) {
        const mid = new Array(C).fill('.');
        mid[i] = 'G';
        mid[j] = 'G';
        let s = '';
        for (let r = 0; r < R; r++) {
          if (r < 2) s += 'W'.repeat(C);
          else if (r === 2) s += mid.join('');
          else s += 'B'.repeat(C);
        }
        goals.push(s);
      }
      return goals;
    }
  }
];

function gridToKey(grid) {
  let s = '';
  for (const row of grid) for (const cell of row) s += cell || '.';
  return s;
}

// Sharded Map (size beyond V8's per-Map limit)
class ShardedMap {
  constructor(n = 256) {
    this.shards = [];
    for (let i = 0; i < n; i++) this.shards.push(new Map());
    this.n = n;
    this._size = 0;
  }
  _idx(s) {
    let h = 5381;
    for (let i = 0; i < s.length; i++) h = ((h << 5) + h + s.charCodeAt(i)) | 0;
    return (h < 0 ? -h : h) % this.n;
  }
  has(s) { return this.shards[this._idx(s)].has(s); }
  get(s) { return this.shards[this._idx(s)].get(s); }
  set(s, v) {
    const sh = this.shards[this._idx(s)];
    if (!sh.has(s)) this._size++;
    sh.set(s, v);
  }
  get size() { return this._size; }
}

// Generate neighbor states (moves) for a given key.
function neighbors(key, R, C, out) {
  for (let r = 0; r < R; r++) {
    for (let c = 0; c < C; c++) {
      if (key[r * C + c] === '.') continue;
      for (let nb = 0; nb < 2; nb++) {
        const dr = nb === 0 ? 0 : 1;
        const dc = nb === 0 ? 1 : 0;
        const r2 = r + dr, c2 = c + dc;
        if (r2 >= R || c2 >= C) continue;
        if (key[r2 * C + c2] === '.') continue;
        const srcA = r * C + c, srcB = r2 * C + c2;
        for (let m = 0; m < 4; m++) {
          const mdr = m === 0 ? -1 : m === 1 ? 1 : 0;
          const mdc = m === 2 ? -1 : m === 3 ? 1 : 0;
          const nr1 = r + mdr, nc1 = c + mdc;
          const nr2 = r2 + mdr, nc2 = c2 + mdc;
          if (nr1 < 0 || nr1 >= R || nc1 < 0 || nc1 >= C) continue;
          if (nr2 < 0 || nr2 >= R || nc2 < 0 || nc2 >= C) continue;
          const dA = nr1 * C + nc1, dB = nr2 * C + nc2;
          if (dA !== srcA && dA !== srcB && key[dA] !== '.') continue;
          if (dB !== srcA && dB !== srcB && key[dB] !== '.') continue;
          const arr = key.split('');
          const a = arr[srcA], b = arr[srcB];
          arr[srcA] = '.';
          arr[srcB] = '.';
          arr[dA] = a;
          arr[dB] = b;
          out.push(arr.join(''));
        }
      }
    }
  }
}

function bidirectionalBFS(level, opts = {}) {
  const { maxStates = 150_000_000, timeoutMs = 20 * 60_000 } = opts;
  const R = level.rows, C = level.cols;
  const start = gridToKey(level.init);
  const goals = level.enumerateGoals
    ? level.enumerateGoals(R, C)
    : [gridToKey(level.goal)];

  for (const g of goals) if (g === start) return { depth: 0 };

  const startTime = Date.now();
  const fwd = new ShardedMap(256);
  const bwd = new ShardedMap(256);
  fwd.set(start, 0);
  for (const g of goals) bwd.set(g, 0);

  let fwdFrontier = [start];
  let bwdFrontier = [...goals];
  let fwdDepth = 0;
  let bwdDepth = 0;
  let best = Infinity;
  let lastLog = Date.now();

  while (fwdFrontier.length > 0 || bwdFrontier.length > 0) {
    if (Date.now() - startTime > timeoutMs) {
      return { depth: best === Infinity ? null : best, reason: 'timeout', fwdDepth, bwdDepth, fwdSize: fwd.size, bwdSize: bwd.size };
    }
    if (fwd.size + bwd.size > maxStates) {
      return { depth: best === Infinity ? null : best, reason: 'state-limit', fwdDepth, bwdDepth, fwdSize: fwd.size, bwdSize: bwd.size };
    }
    // Termination: once any further fwd-step adds depth >= best, can't improve.
    if (best !== Infinity && best <= Math.min(fwdDepth, bwdDepth) + 1) break;

    const expandFwd =
      bwdFrontier.length === 0 ||
      (fwdFrontier.length > 0 && fwdFrontier.length <= bwdFrontier.length);

    if (expandFwd) {
      fwdDepth++;
      const next = [];
      const seenNew = new Set();
      const out = [];
      for (const k of fwdFrontier) {
        out.length = 0;
        neighbors(k, R, C, out);
        for (const nk of out) {
          if (fwd.has(nk)) continue;
          if (bwd.has(nk)) {
            const sum = fwdDepth + bwd.get(nk);
            if (sum < best) best = sum;
            continue;
          }
          if (seenNew.has(nk)) continue;
          seenNew.add(nk);
          fwd.set(nk, fwdDepth);
          next.push(nk);
        }
      }
      fwdFrontier = next;
    } else {
      bwdDepth++;
      const next = [];
      const seenNew = new Set();
      const out = [];
      for (const k of bwdFrontier) {
        out.length = 0;
        neighbors(k, R, C, out);
        for (const nk of out) {
          if (bwd.has(nk)) continue;
          if (fwd.has(nk)) {
            const sum = bwdDepth + fwd.get(nk);
            if (sum < best) best = sum;
            continue;
          }
          if (seenNew.has(nk)) continue;
          seenNew.add(nk);
          bwd.set(nk, bwdDepth);
          next.push(nk);
        }
      }
      bwdFrontier = next;
    }

    if (Date.now() - lastLog > 5000) {
      lastLog = Date.now();
      console.log(`    fwd=${fwdDepth}(${fwd.size.toLocaleString()})  bwd=${bwdDepth}(${bwd.size.toLocaleString()})  best=${best === Infinity ? '∞' : best}  ${((Date.now() - startTime) / 1000).toFixed(1)}s`);
    }
  }
  return { depth: best === Infinity ? -1 : best, fwdSize: fwd.size, bwdSize: bwd.size, fwdDepth, bwdDepth };
}

for (const lv of LEVELS) {
  console.log(`\nLevel ${lv.id}  (${lv.rows}×${lv.cols})`);
  const t0 = Date.now();
  const result = bidirectionalBFS(lv);
  const sec = ((Date.now() - t0) / 1000).toFixed(1);
  if (result.depth != null && result.depth > 0) {
    console.log(`  ★ Optimal = ${result.depth} moves  (fwd=${result.fwdSize.toLocaleString()} / bwd=${result.bwdSize.toLocaleString()}, ${sec}s)`);
  } else if (result.depth === 0) {
    console.log(`  Already at goal`);
  } else {
    console.log(`  ✕ ${result.reason}  (fwd depth ${result.fwdDepth}, bwd depth ${result.bwdDepth}, ${sec}s)`);
  }
}
