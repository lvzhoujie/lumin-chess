# Lumin Industries — Google Play developer brand assets

Generated to match Google Play Console's exact upload requirements:
**24-bit PNG (not transparent)**, exact dimensions, under 1 MB.

| File | Upload field | Spec | Size |
|---|---|---|---|
| `icon-512.png` | **Developer icon** | 512 × 512, 24-bit RGB | ~32 KB |
| `header-4096x2304.png` | **Header image** (light) | 4096 × 2304, 24-bit RGB | ~298 KB |
| `header-dark-4096x2304.png` | Header image (optional dark variant) | 4096 × 2304, 24-bit RGB | ~349 KB |
| `header-1024x500.png` | Store listing **Feature graphic** | 1024 × 500, 24-bit RGB | ~60 KB |

All four are **24-bit RGB PNG with no alpha channel** (verified via `file` —
"8-bit/color RGB"), well under the 1 MB cap, and exact-pixel sized.

## Where to use each

- **Developer icon (`icon-512.png`)** — Play Console → Settings → Developer
  account → Developer profile → Developer icon.
- **Header image (`header-4096x2304.png`)** — same page, the wider
  "Header image" field below the developer icon. Cream / light variant matches
  Google Play's default light theme and the Lumin Chess app's cream background.
- **Dark variant (`header-dark-4096x2304.png`)** — swap in if you'd rather
  have a charcoal cover. Identical composition, `#1C1B1A` background, brighter
  indigo glow.
- **Feature graphic (`header-1024x500.png`)** — Play Console → App content →
  Main store listing → Feature graphic. Required for every Play Store app.

## Brand spec

- **Light background**: `#F5F4F2` cream
- **Dark background**: `#1C1B1A` charcoal
- **Black stone gradient**: `#5b5853 → #2b2926 → #0a0908`
- **White stone gradient**: `#FFFFFF → #f2efe6 → #c5c0af`
- **Indigo glow**: `rgba(124, 110, 240, 0.14–0.28)` radial fade
- **Wordmark font**: system sans-serif (Helvetica Neue / SF / Arial),
  weight 400, letter-spacing −9 px at 280 px size
- **Tagline font**: same family, weight 500, letter-spacing 22 px at 68 px
  size, color `#7A7770` (light) / `#9A968F` (dark)
- **Tagline**: "QUIET PUZZLES, BRIGHT MINDS"
- **Developer name**: "Lumin Industries"

## Regenerating after edits

Edit `icon.svg`, `header-4096x2304.svg`, or `header-dark-4096x2304.svg`, then run:

```bash
node scripts/build-brand-assets.js
```

The script flattens any alpha to RGB so the output meets Play's "not transparent"
requirement, downscales the cream header to 1024×500 for the feature graphic,
and re-emits PNGs at exact dimensions. Verified output with `identify`.
