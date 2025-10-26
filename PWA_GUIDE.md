# Cocorico PWA Guide

## What is PWA Mode?

Progressive Web App (PWA) mode allows Cocorico to be installed on your device and work like a native app with offline capabilities, push notifications, and hardware access.

## Features Available in PWA Mode

### ✅ Voice Commands
- Microphone access for voice assistant
- "Say Cocorico" wake word detection
- Hands-free inventory management

### ✅ Push Notifications
- Get alerts when products are expiring
- Daily automatic checks for expiring items
- System notifications even when app is closed

### ✅ Offline Support
- Access your inventory without internet
- Automatic sync when connection returns
- Cached data for faster loading

### ✅ App-Like Experience
- Install on home screen
- Full-screen mode (no browser UI)
- Faster performance with caching

## Installation

### Desktop (Chrome, Edge, Brave)
1. Visit the Cocorico website
2. Look for the install icon in the address bar (⊕)
3. Click "Install" when prompted
4. The app will open in a standalone window

### Mobile (iOS Safari)
1. Open Cocorico in Safari
2. Tap the Share button (□↑)
3. Scroll and tap "Add to Home Screen"
4. Tap "Add" to confirm
5. The app icon will appear on your home screen

### Mobile (Android Chrome)
1. Open Cocorico in Chrome
2. Tap the three dots menu (⋮)
3. Tap "Install app" or "Add to Home Screen"
4. Tap "Install" to confirm
5. The app icon will appear on your home screen

## Permissions

### Microphone Permission
**Required for**: Voice assistant and "Say Cocorico" wake word

**How to grant**:
- When prompted, click "Allow" or "Grant permission"
- The app needs this to listen for voice commands

**Troubleshooting**:
- If denied, go to browser settings → Site permissions → Microphone
- Remove Cocorico from blocked list
- Refresh the page and grant permission when asked again

### Notification Permission
**Required for**: Expiry alerts for DLC items

**How to grant**:
- Click "Enable Notifications" when prompted
- Click "Allow" in the browser dialog

**Troubleshooting**:
- Check browser settings → Site permissions → Notifications
- Ensure Cocorico is allowed to send notifications
- On mobile, also check device settings → Notifications

## Common Issues & Solutions

### Issue: Microphone doesn't work in PWA
**Solutions**:
1. **HTTPS Required**: PWA features only work on HTTPS (secure) connections
   - In development: use `https://localhost` or ngrok
   - In production: ensure SSL certificate is valid

2. **Check Permissions**:
   - Desktop: Click the lock icon in address bar → Permissions → Microphone
   - Mobile: Settings → Apps → Cocorico → Permissions

3. **Reinstall the PWA**:
   - Uninstall the app from your device
   - Clear browser cache
   - Visit the website again and reinstall

4. **Browser Compatibility**:
   - Chrome/Edge: Full support ✅
   - Safari: Limited support (no wake word detection)
   - Firefox: Partial support

### Issue: Voice assistant doesn't activate
**Check**:
1. Microphone permission is granted
2. You're saying "Cocorico" clearly
3. Wake word toggle is enabled (hover over mic button)
4. Background noise isn't too loud

### Issue: No notifications for expiring items
**Check**:
1. Notification permission is granted
2. You clicked "Enable Notifications" on DLC page
3. Browser notifications aren't blocked in system settings
4. The app is running or installed as PWA

### Issue: App works in browser but not when installed
**This is expected**:
- PWA installed apps have stricter security requirements
- Must use HTTPS (not HTTP)
- Permissions need to be re-granted after installation
- Try uninstalling and reinstalling

## Development Setup

For developers running locally who want to test PWA features:

### Option 1: Use ngrok (Recommended)
```bash
# Start your dev server
npm run dev

# In another terminal, start ngrok
ngrok http 3000

# Use the https URL provided by ngrok
```

### Option 2: Local HTTPS
```bash
# Generate self-signed certificate
openssl req -x509 -out localhost.crt -keyout localhost.key \
  -newkey rsa:2048 -nodes -sha256 \
  -subj '/CN=localhost' -extensions EXT -config <( \
   printf "[dn]\nCN=localhost\n[req]\ndistinguished_name = dn\n[EXT]\nsubjectAltName=DNS:localhost\nkeyUsage=digitalSignature\nextendedKeyUsage=serverAuth")

# Update package.json dev script
"dev": "next dev --experimental-https --experimental-https-key ./localhost.key --experimental-https-cert ./localhost.crt"
```

## Testing Checklist

Before deploying PWA features:

- [ ] App works on HTTPS
- [ ] Manifest.json is accessible at /manifest.json
- [ ] Service worker registers successfully
- [ ] Microphone access works
- [ ] Voice assistant activates
- [ ] Wake word detection works (if enabled)
- [ ] Notifications can be sent
- [ ] App installs on home screen
- [ ] Offline mode works
- [ ] Push notifications work

## Debugging

### Check Service Worker Status
**Chrome DevTools**:
1. Open DevTools (F12)
2. Go to Application tab
3. Click "Service Workers" in sidebar
4. Check if worker is activated and running

### Check Manifest
**Chrome DevTools**:
1. Open DevTools (F12)
2. Go to Application tab
3. Click "Manifest" in sidebar
4. Verify all fields are correct

### Check Permissions
**Console**:
```javascript
// Check microphone permission
navigator.permissions.query({name: 'microphone'}).then(result => {
  console.log('Microphone:', result.state);
});

// Check notification permission
console.log('Notification:', Notification.permission);
```

## Best Practices

1. **Always test on HTTPS** - Even in development
2. **Test on real devices** - Emulators don't always match real behavior
3. **Handle permission denials gracefully** - Don't break the app
4. **Provide fallbacks** - Voice features should be optional
5. **Clear cache when updating** - PWA caches aggressively

## Resources

- [PWA Checklist](https://web.dev/pwa-checklist/)
- [Manifest Generator](https://www.simicart.com/manifest-generator.html/)
- [next-pwa Documentation](https://github.com/shadowwalker/next-pwa)
- [Web.dev PWA Guide](https://web.dev/progressive-web-apps/)

## Support

If you're still experiencing issues:
1. Check browser console for errors
2. Verify you're on HTTPS
3. Try a different browser
4. Clear cache and reinstall
5. Check this guide's troubleshooting section
