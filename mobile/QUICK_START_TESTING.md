# Quick Start: Share Your App for Testing

## 🚀 Fastest Way (5 minutes)

### 1. Build Testing APK
```bash
cd mobile
npx eas-cli build --platform android --profile testing
```

### 2. Share the Download Link
- After build completes, copy the download URL from EAS
- Send it to testers via email/message

### 3. Testers Install
- Enable "Install from Unknown Sources" in Android Settings
- Download APK from your link
- Tap to install

**That's it!** Your testers can now use the app.

---

## 📱 Better Way: Google Play Internal Testing

### Setup (One-time, ~15 minutes)

1. **Create Google Play Console Account**
   - Go to https://play.google.com/console
   - Pay $25 registration fee
   - Complete setup

2. **Get Service Account Key**
   - Play Console → Settings → API Access
   - Create Service Account → Download JSON
   - Save as `mobile/google-play-service-account.json`

3. **Build & Submit**
   ```bash
   cd mobile
   npx eas-cli build --platform android --profile production
   npx eas-cli submit --platform android --profile testing
   ```

4. **Add Testers**
   - Play Console → Internal Testing → Testers
   - Add email addresses
   - Share the testing link

**Benefits:**
- ✅ Testers install from Play Store (more trusted)
- ✅ Automatic updates
- ✅ Crash reports & analytics
- ✅ Better feedback collection

---

## 📝 Before Building

Update version in `app.json` if needed:
```json
{
  "expo": {
    "version": "1.0.1"  // Increment for each release
  }
}
```

---

## 🆘 Need Help?

See `TESTING_GUIDE.md` for detailed instructions.
