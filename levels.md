# Lumin Chess — Level designs (solved & ranked)

_Solved 6 of 7 designs · generated 2026-05-15T06:17:24Z_

Legend: `W` white · `B` black · `G` gray (neutral) · `.` empty · `#` blocked / off-board

## Ranking (fewest → most moves)

| Rank | Design # | Size | Pieces (W/B/G) | Min moves | Unlock threshold |
|---:|---:|:---:|:---:|---:|---:|
| 1 | #1 | 4×4 | 6/6/0 | 24 | 36 |
| 2 | #2 | 3×5 | 6/6/0 | 26 | 39 |
| 3 | #6 | 3×4 | 4/4/2 | 26 | 39 |
| 4 | #3 | 3×5 *blocked* | 5/5/0 | 34 | 51 |
| 5 | #4 | 5×5 *blocked* | 4/4/8 | 42 | 63 |
| 6 | #5 | 5×5 *blocked* | 8/8/0 | 44 | 66 |

## Skipped

- **Design #7** — skipped — exceeds session compute budget; redesign with more empty cells or fewer pieces

## Detail

### Rank 1 — Design #1 · 4×4 · par 24 (unlock ≤ 36)

**Init:**

```
B B B B
B . . B
W . . W
W W W W
```

**Goal (W↔B swap):**

```
W W W W
W . . W
B . . B
B B B B
```

### Rank 2 — Design #2 · 3×5 · par 26 (unlock ≤ 39)

**Init:**

```
B B B B B
B . . . W
W W W W W
```

**Goal (W↔B swap):**

```
W W W W W
W . . . B
B B B B B
```

### Rank 3 — Design #6 · 3×4 · par 26 (unlock ≤ 39)

**Init:**

```
B B B B
G . . G
W W W W
```

**Goal (W↔B swap):**

```
W W W W
G . . G
B B B B
```

### Rank 4 — Design #3 · 3×5 · par 34 (unlock ≤ 51)

**Init:**

```
B B B B B
# . . . #
W W W W W
```

**Goal (W↔B swap):**

```
W W W W W
# . . . #
B B B B B
```

### Rank 5 — Design #4 · 5×5 · par 42 (unlock ≤ 63)

**Init:**

```
B B . B B
G # G # G
. G . G .
G # G # G
W W . W W
```

**Goal (W↔B swap):**

```
W W . W W
G # G # G
. G . G .
G # G # G
B B . B B
```

### Rank 6 — Design #5 · 5×5 · par 44 (unlock ≤ 66)

**Init:**

```
# B B B #
B B B B B
# . . . #
W W W W W
# W W W #
```

**Goal (W↔B swap):**

```
# W W W #
W W W W W
# . . . #
B B B B B
# B B B #
```

### Design #7 (skipped)

> skipped — exceeds session compute budget; redesign with more empty cells or fewer pieces

**Init:**

```
B B B B B
B B B B B
. G . G .
W W W W W
W W W W W
```
