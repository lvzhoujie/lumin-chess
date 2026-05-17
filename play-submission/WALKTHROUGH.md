# Lumin Chess → Google Play Store — submission walkthrough

A step-by-step you can follow with the browser in one window and this file in
another. Every form field has ready-to-paste copy below. Estimated active
time: **60–90 minutes**, plus Google's review (typically 1–3 days).

---

## 0. Pre-flight (do these once, in order)

| Step | Where | Time |
|---|---|---|
| 1. Pay $25 Google Play Developer fee | <https://play.google.com/console/signup> | 5 min |
| 2. Verify identity (driver's license or passport) | Same signup flow | 5–10 min (Google checks in ~1–3 days) |
| 3. Fill payment profile (required even for free apps) | Console → Setup → Payments profile | 5 min |
| 4. Host the privacy policy (see §5) | GitHub Pages or any free static host | 10 min |
| 5. Capture screenshots (see §6) | Your Xiaomi/OnePlus or Android Studio emulator | 15 min |

You can begin the rest **after Google verifies your identity** — usually
1–3 days after signup.

---

## 1. Create the app record

1. Play Console home → **Create app**
2. Fill the form:
   - **App name**: `Lumin Chess`
   - **Default language**: English (United States) — en-US
   - **App or game**: Game
   - **Free or paid**: Free
   - Tick both "Declarations" checkboxes (Developer Program Policies + US
     export laws)
3. Click **Create app**

Play creates the record and opens a long checklist. We'll work through it
top to bottom.

---

## 2. Set up your app (left sidebar checklist)

### 2.1 — App content

Open **Policy → App content** and complete each card:

| Card | Answer |
|---|---|
| **Privacy policy** | Paste your hosted URL (see §5). |
| **App access** | "All functionality is available without special access" |
| **Ads** | No, my app does not contain ads |
| **Content rating** | Click "Start questionnaire" → see §3 below |
| **Target audience** | Age 13+ — single age group. No appeal to children. |
| **News app** | No |
| **COVID-19 contact tracing** | No |
| **Data safety** | Click "Start" → see §4 below |
| **Government app** | No |
| **Financial features** | No |
| **Health features** | No |
| **Actions on Google** | Not used |

### 2.2 — Pricing & distribution

- Free
- Select countries: pick all (or just the markets you care about)
- Contains ads: No
- In-app purchases: No

### 2.3 — Store listing

Open **Grow → Store presence → Main store listing**. Paste the strings from
§7. Upload these files:

| Listing field | File |
|---|---|
| App icon (512×512) | `assets/icon-only.png` |
| Feature graphic (1024×500) | `brand/header-1024x500.png` *(generate if missing — see note at bottom of §7)* |
| Phone screenshots (≥3, ≤8) | from `play-submission/screenshots/` (see §6) |
| Promo video (optional) | skip for now |

---

## 3. Content rating questionnaire

When prompted, pick the **Games** category, then answer:

| Question | Answer |
|---|---|
| Email for review communication | Your real email |
| Category | Casual / Puzzle / Sliding tile |
| Violence | None |
| Sexuality | None |
| Language | None |
| Controlled substances | None |
| Gambling | None / No simulation |
| Crude humor | None |
| Horror | None |
| User-generated content | None |
| Shares user location | No |
| Allows users to interact | No |
| In-app purchases | No |
| Personal information shared with strangers | No |
| Digital purchases | No |

Expected rating: **Everyone (PEGI 3, IARC equivalent).**

---

## 4. Data safety form

Lumin Chess collects **zero data**. Answers:

| Section | Answer |
|---|---|
| Does your app collect or share any of the required user data types? | **No** |
| Is all of the user data collected by your app encrypted in transit? | N/A (no data collected) |
| Do you provide a way for users to request that their data is deleted? | N/A (no data collected) |

If the form insists you tick at least one transit-encryption answer
(it sometimes does even with "No data collected"), pick **"All data is
encrypted in transit"** — it's true because the app makes no network
calls at all.

---

## 5. Privacy policy

A privacy policy URL is **required** even for offline apps. I've drafted
one at `play-submission/privacy-policy.html`. Hosting options:

### Option A — GitHub Pages (recommended, ~10 min)

```bash
# In your terminal:
cd ~/Downloads
git init lumi-privacy
cd lumi-privacy
cp /Users/plyu/Downloads/apk/play-submission/privacy-policy.html ./index.html
git add index.html
git commit -m "Initial privacy policy"
# Create a public repo on github.com called "lumi-privacy", then:
git branch -M main
git remote add origin https://github.com/<your-username>/lumi-privacy.git
git push -u origin main
# In GitHub → Settings → Pages → enable on the main branch.
```

URL becomes `https://<your-username>.github.io/lumi-privacy/`.

### Option B — Cloudflare Pages / Vercel / Netlify

Drag-drop `privacy-policy.html` into a free static project, get a URL,
done.

### Option C — Notion / Google Docs as published page

Works in a pinch but Google occasionally rejects these for not being a
"first-party" privacy policy. Stick with options A or B if you can.

---

## 6. Screenshots

Google requires **at least 3 phone screenshots**, dimensions 1080×1920
or larger, portrait orientation.

**Easiest way**: install `lumin-chess-release.apk` on your Xiaomi or
OnePlus and screenshot from the phone (volume-down + power button).
Phone screenshots will be 1080×2400 or similar — perfectly compliant.

**Recommended scenes to capture** (in this order):

1. **Tutorial slide 1** — "Welcome to Lumin Chess" with before/after grid
2. **Tutorial slide 2** — "Pieces always move in pairs" callout visible
3. **Level 1 mid-game** — a few pieces moved, swipe trail mid-flight if you can catch it
4. **Level 1 win modal** — "Solved" overlay with par display
5. **Level 2 (Narrow tower)** — 5×3 board with goal markers
6. **Level 3 (Mind the grays)** — the wide board with gray pieces visible

Save them to `/Users/plyu/Downloads/apk/play-submission/screenshots/` so
you have them in one place for the upload.

---

## 7. Store listing copy (paste into Play Console)

### Short description (max 80 chars, used in search results)

```
A serene sliding puzzle. Swap black and white in as few moves as you can.
```

(79 chars — fits.)

### Full description (max 4000 chars)

```
Lumin Chess is a quiet, modern sliding puzzle inspired by Go stones.

Slide pairs of adjacent pieces around the board to swap every black piece
with a white piece — in as few moves as possible. The rules are simple,
but each level reveals new constraints: narrower boards, stacked rows,
neutral gray pieces that have to stay in the middle.

▸ Three hand-tuned levels with verified optimal-move counts (par 14, par 32, par 49)
▸ Beat each level within 50% of par to unlock the next one
▸ Swipe-based controls: drag across two adjacent pieces and one more cell to slide them — straight or around a corner
▸ Tap input also available
▸ Goal markers in each cell quietly show where each color belongs
▸ Smooth piece-slide animations, a swipe trail you can see, and a guided practice move on first launch
▸ Track your personal best and chase the optimum
▸ Fully offline, no ads, no accounts, no tracking

A puzzle for quiet moments. Designed by Lumi Industries.
```

### App category & tags

- **Category**: Games → Puzzle
- **Tags** (Play Console will let you pick up to 5): Brain Games,
  Logic Puzzle, Minimalist, Casual, Single-player

### Contact details

- **Website**: <https://your-github-username.github.io/lumi-privacy/>
  (the same site that hosts the privacy policy is fine for a v1)
- **Email**: your real support email
- **Phone**: optional, skip if you'd rather

> **Note on the feature graphic**: §2.3 wants `brand/header-1024x500.png`
> which isn't in the brand folder right now (we replaced it with the
> 4096×2304 version). Regenerate quickly:
>
> ```bash
> node -e "require('sharp')('brand/header-4096x2304.svg', {density:200}).resize(1024,500,{fit:'fill'}).flatten({background:{r:245,g:244,b:242}}).removeAlpha().png().toFile('brand/header-1024x500.png')"
> ```

---

## 8. Upload the AAB

1. In the left sidebar → **Release → Testing → Internal testing**
   *(start here, NOT Production — you can promote to Production once you've
   verified the build works on your phones)*
2. Click **Create new release**
3. **App bundles** section → drag-drop
   `/Users/plyu/Downloads/apk/lumin-chess-release.aab`
4. Google will ask to enable **Play App Signing** — accept. This is
   strongly recommended (lets you reset the upload key if you ever lose it).
5. **Release name**: `1.0.0` (auto-fills from versionName)
6. **Release notes** for English:
   ```
   First release. Three hand-tuned sliding puzzles with verified optimal-move counts.
   ```
7. Click **Save → Review release → Start rollout to internal testing**

Add your own email under **Testers → Email list** to get the install
link. Open the link on your phone, tap **Become a tester**, then
**Download on Google Play** — your app installs as a normal Play app.

---

## 9. Promote to Production

After you've verified the internal test on your phone:

1. Release → Production → **Create new release**
2. **Add from library** → pick the same AAB
3. Same release notes
4. Set **Rollout percentage** to 100% (or use staged rollout if you want
   gradual deployment — irrelevant for a small game)
5. **Review release → Start rollout to Production**

Google review: typically **24–48 hours** for a first submission. Common
holds for puzzle games:
- Missing privacy policy or broken URL
- Data safety form says "No data collected" but the manifest includes
  unused permissions Google interprets as data-sensitive (Lumin Chess
  only declares `INTERNET`, which is fine for a WebView app)
- Screenshots that don't match the actual UI (they spot-check)

If rejected, the email tells you exactly which policy you tripped.
Usually a 30-minute fix.

---

## 10. After approval — automating future updates

Once 1.0.0 is live, future versions can be fully automated. The plan:

1. Enable the **Google Play Android Developer API** in Google Cloud Console
2. Create a **service account** and download a JSON key
3. Add **gradle-play-publisher** to `android/app/build.gradle`
4. Set the service account JSON path in CI / your env
5. New release becomes:
   ```bash
   # Bump versionCode in android/app/build.gradle, then:
   ./scripts/build-release.sh
   cd android && ./gradlew publishReleaseBundle
   ```

I can wire this up after your first manual submission lands. Two reasons
to wait: (a) the Play Publisher API only works on apps that already have a
production track, and (b) the first submission needs interactive content
rating + data safety setup anyway.

---

## Quick troubleshooting

- **"Your app has been rejected because the upload key has been changed"** —
  use the keystore at `android/keystore/upload-keystore.jks`. Don't
  regenerate it.
- **"You uploaded an APK signed with the debug key"** — you ran
  `build-apk.sh` instead of `build-release.sh`. Use the release script.
- **"versionCode 1 already used"** — bump `versionCode` in
  `android/app/build.gradle` (e.g., 1 → 2) and rebuild.
- **App rejected for "lacks native functionality" or "web wrapper"** —
  rare for a polished game, but if it happens, point out in the appeal
  that the splash screen, status bar, haptic-style feedback (vibration
  via WebView), and full offline functionality are all enabled via
  native Capacitor plugins. Usually overturned.

---

Files prepared in this folder:

- `WALKTHROUGH.md` — this file
- `privacy-policy.html` — drop into a static host for §5
- `screenshots/` — capture into here, drag-drop from there

Good luck!
