# Testing Distribution Guide

This guide will help you share your FileFlow AI app with testers before publishing to Google Play.

## 🚀 Quick Start: Direct APK Sharing (Easiest)

### Step 1: Build a Testing APK

```bash
cd mobile
npx eas-cli build --platform android --profile testing
```

This will:
- Build a release APK optimized for testing
- Upload it to EAS servers
- Give you a download link

### Step 2: Share the APK

1. After the build completes, EAS will provide a download link
2. Share this link with your testers via:
   - Email
   - Slack/Discord
   - Google Drive
   - Direct download link

### Step 3: Testers Install the APK

Testers need to:
1. Enable "Install from Unknown Sources" on their Android device:
   - Settings → Security → Unknown Sources (enable)
   - Or Settings → Apps → Special Access → Install Unknown Apps
2. Download the APK from the link you shared
3. Open the downloaded file and tap "Install"

---

## 📱 Google Play Internal Testing (Recommended)

This is the best option for managing multiple testers and getting feedback.

### Prerequisites

1. **Google Play Console Account**
   - Sign up at https://play.google.com/console
   - Pay the one-time $25 registration fee
   - Complete developer account setup

2. **Service Account Key**
   - In Google Play Console: Settings → API Access
   - Create a service account
   - Download the JSON key file
   - Save it as `google-play-service-account.json` in the `mobile/` directory
   - Grant "Release Manager" permissions

### Step 1: Create Internal Testing Track

1. Go to Google Play Console → Your App → Testing → Internal testing
2. Click "Create new release"
3. Upload your app bundle (see Step 2)

### Step 2: Build and Submit to Internal Testing

```bash
cd mobile

# Build for Google Play (creates AAB file)
npx eas-cli build --platform android --profile production

# Submit to Internal Testing track
npx eas-cli submit --platform android --profile testing
```

Or manually:
1. After building, download the `.aab` file from EAS
2. Go to Google Play Console → Internal Testing → Create Release
3. Upload the `.aab` file
4. Add release notes (e.g., "Initial testing release")
5. Click "Save" → "Review Release" → "Start rollout to Internal testing"

### Step 3: Add Testers

1. Go to Internal Testing → Testers tab
2. Choose one of these options:

   **Option A: Email List (Up to 100 testers)**
   - Click "Create email list"
   - Add tester emails
   - Save the list

   **Option B: Google Groups**
   - Use an existing Google Group
   - Add the group email

   **Option C: Open Testing (Unlimited)**
   - Switch to "Open testing" track
   - Anyone with the link can join

### Step 4: Share Testing Link

1. Copy the testing link from Google Play Console
2. Share it with testers
3. Testers click the link and join the testing program
4. They can install/update the app directly from Google Play Store

---

## 🔧 Build Profiles Explained

### `testing` Profile
- **Purpose**: Direct APK sharing for quick testing
- **Build Type**: APK (easy to install)
- **Distribution**: Internal (no Play Store)
- **Use When**: Quick testing with a few people

### `preview` Profile  
- **Purpose**: Preview builds (same as testing)
- **Build Type**: APK
- **Use When**: Quick previews

### `production` Profile
- **Purpose**: Google Play Store release
- **Build Type**: AAB (Android App Bundle - required by Play Store)
- **Distribution**: Store
- **Use When**: Ready for Play Store submission

---

## 📋 Testing Checklist

Before sharing with testers, ensure:

- [ ] App version is updated in `app.json` (currently `1.0.0`)
- [ ] App icon and splash screen are set
- [ ] All environment variables are configured for production
- [ ] Backend server is accessible to testers
- [ ] API endpoints are working
- [ ] No debug/console logs exposing sensitive data
- [ ] App name and package name are correct

---

## 🔐 Security Notes

1. **APK Distribution**: APKs can be shared publicly, so be careful with sensitive data
2. **Backend Access**: Ensure your backend server can handle test traffic
3. **API Keys**: Never commit API keys to git
4. **Rate Limiting**: Consider rate limiting for test accounts

---

## 📊 Monitoring Testers

### Google Play Console
- View tester feedback in Play Console → User feedback
- See crash reports in Play Console → Quality → Crashes & ANRs
- Monitor installs and uninstalls

### Direct APK Testing
- Use analytics tools (Firebase Analytics, etc.)
- Collect feedback via forms or email
- Monitor backend logs for errors

---

## 🐛 Troubleshooting

### Build Fails
```bash
# Clear EAS cache
npx eas-cli build --clear-cache --platform android --profile testing
```

### Testers Can't Install APK
- Ensure "Unknown Sources" is enabled
- Check Android version compatibility (min SDK in app.json)
- Verify APK wasn't corrupted during download

### Google Play Submission Fails
- Verify service account has correct permissions
- Check that AAB file is valid (not APK)
- Ensure app signing is configured correctly

---

## 📝 Next Steps After Testing

1. Collect feedback from testers
2. Fix critical bugs
3. Update version number in `app.json`
4. Build production release:
   ```bash
   npx eas-cli build --platform android --profile production
   ```
5. Submit to production track:
   ```bash
   npx eas-cli submit --platform android --profile production
   ```

---

## 💡 Tips

- **Version Management**: Increment version in `app.json` for each test release
- **Release Notes**: Always include what's new/fixed in each release
- **Test Groups**: Create separate tracks for different tester groups (internal, alpha, beta)
- **Feedback**: Set up a simple feedback form or use Google Forms

---

## 📞 Need Help?

- EAS Build Docs: https://docs.expo.dev/build/introduction/
- Google Play Console: https://support.google.com/googleplay/android-developer
- EAS Submit Docs: https://docs.expo.dev/submit/introduction/
