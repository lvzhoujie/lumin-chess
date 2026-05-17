# Lumin Chess — Level designs

_Generated 2026-05-15T05:21:57.254Z_

5×5 canvas. Goal is implicit: every **W** must become **B** and every **B** must become **W** (gray stays put).
Final id, name, and par will be assigned later after solving and ranking.

Legend: `W` white · `B` black · `G` gray (neutral) · `.` empty · `#` blocked / off-board

## Design #1

- **Board size:** 5 × 5 (with blocked cells)
- **Canvas offset:** row 0, col 0

**Init (starting state):**

```
# B B B #
B B B B B
# . . . #
W W W W W
# W W W #
```

**Goal (derived — W↔B swap):**

```
# W W W #
W W W W W
# . . . #
B B B B B
# B B B #
```

## Design #2

- **Board size:** 3 × 3
- **Canvas offset:** row 1, col 1

**Init (starting state):**

```
B B B
G . .
W W W
```

**Goal (derived — W↔B swap):**

```
W W W
G . .
B B B
```

## Design #3

- **Board size:** 3 × 5
- **Canvas offset:** row 1, col 0

**Init (starting state):**

```
B B B B B
G . . . G
W W W W W
```

**Goal (derived — W↔B swap):**

```
W W W W W
G . . . G
B B B B B
```

## Design #4

- **Board size:** 4 × 4
- **Canvas offset:** row 1, col 1

**Init (starting state):**

```
B B B B
B . . B
W . . W
W W W W
```

**Goal (derived — W↔B swap):**

```
W W W W
W . . W
B . . B
B B B B
```

## Design #5

- **Board size:** 3 × 5
- **Canvas offset:** row 1, col 0

**Init (starting state):**

```
B B B B B
B . . . W
W W W W W
```

**Goal (derived — W↔B swap):**

```
W W W W W
W . . . B
B B B B B
```

## Design #6

- **Board size:** 5 × 5 (with blocked cells)
- **Canvas offset:** row 0, col 0

**Init (starting state):**

```
B B . B B
G # G # G
. G . G .
G # G # G
W W . W W
```

**Goal (derived — W↔B swap):**

```
W W . W W
G # G # G
. G . G .
G # G # G
B B . B B
```

## Design #7

- **Board size:** 5 × 5 (with blocked cells)
- **Canvas offset:** row 0, col 0

**Init (starting state):**

```
B B B B B
B B . B B
# G . G #
W W . W W
W W W W W
```

**Goal (derived — W↔B swap):**

```
W W W W W
W W . W W
# G . G #
B B . B B
B B B B B
```
