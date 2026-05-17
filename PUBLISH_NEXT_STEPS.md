# Lumin Chess — Publish Plan (Revised)

## Strategy change

Discovered `lvzhoujie@gmail.com` has a **separate, older Play Console developer account ("Lumin Industries")** with **14 apps dating back to October 2012**. That account is **pre-Nov-2023 = grandfathered**, so production access is unlocked immediately — no 12-tester / 14-day rule.

We're moving Lumin Chess to that account.

## Where things stand (May 15, 2026)

### Old plan (Lumi Industries / luzhoujie@gmail.com) — abandoned
- Closed test was submitted and went active
- Subject to 12-tester / 14-day rule (this account is post-Nov-2023)
- We can leave it alone; it doesn't hurt anything sitting on closed track
- Package name `com.lumi.lumichess` is reserved by this account

### New plan (Lumin Industries / lvzhoujie@gmail.com) — in progress
- Package name changed to `com.luminindustries.luminchess` (since the old one is reserved on the other account)
- Files updated:
  - `android/app/build.gradle` — namespace + applicationId → `com.luminindustries.luminchess`
  - `capacitor.config.json` — appId → `com.luminindustries.luminchess`
  - `android/app/src/main/java/com/luminindustries/luminchess/MainActivity.java` — new MainActivity at the new package path
  - `android/app/src/main/java/com/lumi/lumichess/MainActivity.java` — old file still present (sandbox couldn't delete). Harmless — compiles as unused class. You can delete it manually: `rm -rf android/app/src/main/java/com/lumi`

## What YOU need to do — rebuild AAB

From `/Users/plyu/Downloads/apk`:

```bash
# 1. Clean up old Java package directory
rm -rf android/app/src/main/java/com/lumi

# 2. Sync Capacitor config into Android project (copies new capacitor.config.json into assets)
npm run cap:sync

# 3. Build a signed release AAB
cd android
./gradlew clean
./gradlew bundleRelease
cd ..

# 4. Verify the AAB was created
ls -lh android/app/build/outputs/bundle/release/app-release.aab

# 5. Confirm package name in the new AAB matches com.luminindustries.luminchess
# (Optional sanity check using bundletool or aapt2)
```

If gradle prompts for keystore password, use the same one as before — the keystore in `keystore.properties` still works (signing key isn't tied to package name).

## When the new AAB is ready — message me

Tell me "**AAB rebuilt**" and I'll drive Play Console end-to-end:

1. Switch to lvzhoujie@gmail.com / Lumin Industries account
2. Create new app entry "Lumin Chess" with package `com.luminindustries.luminchess`
3. Upload the new signed AAB
4. Fill in all metadata (descriptions, app icon, feature graphic, screenshots — we already have these)
5. Set privacy policy URL (existing: https://sites.google.com/view/lumi-industries-privacy)
6. Complete data safety, content rating, target audience, declarations (~5 min on a grandfathered account, no closed test required)
7. Submit production release for Google review (1-7 days typical)
8. App goes live on Play Store

## Assets already prepared in this folder

| File | Purpose | Status |
|---|---|---|
| `privacy.html` | Local copy of privacy policy (hosted at sites.google.com/view/lumi-industries-privacy) | Ready |
| `feature_graphic.png` | 1024×500 store banner (Lumin Chess) | Ready |
| `brand/icon-512.png` | App icon 512×512 | Ready |
| `store_listing.md` | Short + full description (puzzle game copy) | Ready |
| Screenshots in your asset library | 01-splash, 02-tutorial, 03-gameplay, 04-congrats | Already on Lumi Industries; you'll need to re-upload to Lumin Industries since asset libraries don't transfer across dev accounts |

## Reminder: the old closed test on Lumi Industries

The Lumin Chess closed test on luzhoujie@gmail.com is currently active with 8 testers in the email list. You can:
- Ignore it (sits there harmlessly, costs nothing)
- Optionally inform the 8 testers we're switching apps (they'll need a new opt-in link once the new app is on the public store)
- Delete the app entry at some point — Play Console requires the app to be unpublished from all tracks first, and there's typically a waiting period
