# Build Troubleshooting Guide

## Common Build Errors & Solutions

### Error: "Unknown error. See logs of the Build complete hook build phase"

This generic error usually means one of these issues:

#### 1. Missing Asset Files (Most Common)

Your `app.json` references these files that must exist:
- `./assets/images/icon.png` (1024x1024px)
- `./assets/images/splash-icon.png` (1284x2778px recommended)
- `./assets/images/adaptive-icon.png` (1024x1024px)
- `./assets/images/favicon.png` (48x48px)

**Solution:**
1. Create the `assets/images/` directory if it doesn't exist:
   ```bash
   mkdir -p assets/images
   ```

2. Add your icon files or use placeholder images temporarily:
   - Use a tool like https://www.appicon.co/ to generate all sizes
   - Or create simple placeholder PNGs (1024x1024px for icon, etc.)

3. Verify files exist:
   ```bash
   ls -la assets/images/
   ```

#### 2. Try Using Preview Profile Instead

The `preview` profile is simpler and often more reliable:

```bash
npx eas-cli build --platform android --profile preview
```

#### 3. Check Build Logs

View detailed logs at the URL provided:
```
See logs: https://expo.dev/accounts/reel_ruckus/projects/fileflow-ai/builds/...
```

Look for:
- Asset file errors
- Compilation errors
- Missing dependencies
- TypeScript errors

#### 4. Clear Cache and Rebuild

```bash
npx eas-cli build --platform android --profile testing --clear-cache
```

#### 5. Verify Dependencies

Ensure all dependencies are installed:
```bash
cd mobile
npm install
```

#### 6. Check for TypeScript Errors

Run type checking locally:
```bash
npx tsc --noEmit
```

---

## Quick Fix: Use Preview Profile

The `preview` profile is already configured and simpler:

```bash
cd mobile
npx eas-cli build --platform android --profile preview
```

This creates an APK without custom gradle commands and is more reliable.

---

## Creating Placeholder Assets

If you need quick placeholder assets for testing:

1. **Create a simple icon** (1024x1024px PNG):
   - Use any image editor
   - Or download a free icon from https://www.flaticon.com/
   - Save as `assets/images/icon.png`

2. **Copy icon for other assets**:
   ```bash
   cp assets/images/icon.png assets/images/splash-icon.png
   cp assets/images/icon.png assets/images/adaptive-icon.png
   cp assets/images/icon.png assets/images/favicon.png
   ```

3. **Or use Expo's default assets** temporarily by removing asset references from `app.json` (not recommended for production)

---

## Next Steps

1. **Check if assets exist:**
   ```bash
   ls -la mobile/assets/images/
   ```

2. **If missing, create them or use preview profile:**
   ```bash
   npx eas-cli build --platform android --profile preview
   ```

3. **Check build logs** at the URL provided in the error message

4. **If still failing**, share the specific error from the build logs

---

## Alternative: Build Locally

If EAS builds keep failing, you can build locally:

```bash
cd mobile
npx expo prebuild
npx expo run:android --variant release
```

This requires Android Studio and Android SDK to be installed.
