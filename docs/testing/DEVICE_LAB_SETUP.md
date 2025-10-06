# Device Lab Setup Guide

**Project:** SimplePro-v3
**Last Updated:** October 2, 2025
**Version:** 1.0

## Overview

This guide provides instructions for setting up a comprehensive mobile device testing lab for SimplePro-v3, including physical devices, emulators, remote debugging, and cloud-based testing services.

---

## Physical Device Testing

### Recommended Device Lab

#### Essential Devices (Priority 1)

| Device             | OS          | Purpose              | Cost        | Notes                   |
| ------------------ | ----------- | -------------------- | ----------- | ----------------------- |
| iPhone 13          | iOS 17+     | Primary iOS testing  | $699        | Most common iPhone      |
| iPhone SE (2022)   | iOS 17+     | Small screen testing | $429        | Budget iPhone           |
| Samsung Galaxy S21 | Android 13+ | Older Android        | $399 (used) | 3-year test             |
| Google Pixel 6     | Android 13+ | Stock Android        | $449 (used) | Google reference        |
| iPad (10th gen)    | iOS 17+     | Tablet testing       | $449        | Desktop-like experience |

**Total:** ~$2,425

#### Nice-to-Have Devices (Priority 2)

| Device                | OS          | Purpose        | Cost |
| --------------------- | ----------- | -------------- | ---- |
| iPhone 15             | iOS 17+     | Latest iPhone  | $799 |
| Samsung Galaxy S23    | Android 14  | Latest Samsung | $799 |
| Samsung Galaxy Tab S8 | Android 13+ | Android tablet | $649 |

**Total with Priority 2:** ~$4,672

#### Budget Lab (Minimum)

If budget is limited, start with:

1. **iPhone 13** ($699) - iOS testing
2. **Google Pixel 6** ($449 used) - Android testing
3. **Use emulators** for other configurations

**Minimum Total:** ~$1,148

---

### Setting Up Physical Devices

#### iPhone/iPad Setup

**1. Enable Developer Mode (iOS 16+)**

```
Settings → Privacy & Security → Developer Mode → Toggle On
```

**2. Enable Web Inspector**

```
Settings → Safari → Advanced → Web Inspector → Toggle On
```

**3. Trust Computer for Debugging**

- Connect device to Mac via USB
- On device: Tap "Trust This Computer"
- On Mac: Open Safari → Develop → [Your Device Name]

**4. Configure for Testing**

```
Settings → Display & Brightness → Auto-Lock → Never (during testing)
Settings → General → Software Update → Automatic Updates → Off
Settings → Notifications → Disable for testing apps
```

#### Android Setup

**1. Enable Developer Options**

```
Settings → About phone → Tap "Build number" 7 times
```

**2. Enable USB Debugging**

```
Settings → System → Developer options → USB debugging → Toggle On
```

**3. Trust Computer**

- Connect device via USB
- Tap "Allow USB debugging" on device

**4. Verify ADB Connection**

```bash
adb devices
# Should show: List of devices attached
#              [device-id]    device
```

**5. Configure for Testing**

```
Settings → Display → Sleep → 30 minutes
Settings → Developer options → Stay awake → Toggle On (charges only)
Settings → Developer options → Show taps → Toggle On (for recording)
```

---

## Remote Debugging Setup

### Safari Web Inspector (iOS)

**Requirements:**

- Mac with Safari
- iPhone/iPad with iOS 17+
- Lightning/USB-C cable

**Setup:**

1. Connect iOS device to Mac via USB
2. Open Safari on Mac
3. Navigate to: Develop → [Device Name] → SimplePro page
4. Web Inspector opens with full DevTools

**Features:**

- Console logging
- DOM inspection
- Network requests
- Performance profiling
- Responsive design mode

### Chrome DevTools (Android)

**Requirements:**

- Computer with Chrome
- Android device with Chrome
- USB cable
- ADB installed

**Setup:**

1. Connect Android device via USB
2. Open Chrome on computer
3. Navigate to: `chrome://inspect#devices`
4. Click "Inspect" under your device

**Features:**

- Full DevTools
- Screen mirroring
- Network throttling
- Device orientation
- Geolocation spoofing

**Remote Debugging Without USB (Wireless ADB):**

```bash
# On device, ensure WiFi connected to same network
# Enable USB debugging, connect via USB once

adb tcpip 5555
adb connect [device-ip]:5555

# Now can disconnect USB
# Verify with: adb devices
```

---

## Emulator/Simulator Setup

### iOS Simulator (macOS Only)

**Installation:**

1. Install Xcode from Mac App Store (free, ~15GB)
2. Open Xcode → Preferences → Components
3. Download additional simulators (iOS 17+)

**Launch Simulator:**

```bash
# Via Xcode
Xcode → Open Developer Tool → Simulator

# Via command line
open -a Simulator
```

**Available Devices:**

- iPhone SE (3rd gen)
- iPhone 13 / 13 Pro / 13 Pro Max
- iPhone 14 / 14 Pro / 14 Pro Max
- iPhone 15 / 15 Pro / 15 Pro Max
- iPad Pro (11", 12.9")
- iPad Air
- iPad (10th gen)

**Testing in Simulator:**

1. Launch Simulator
2. Open Safari
3. Navigate to `http://localhost:3009`
4. Use Mac's Safari → Develop → Simulator → [Page]

**Simulator Limitations:**

- ⚠️ No Face ID (use Touch ID devices)
- ⚠️ No cellular network (WiFi only)
- ⚠️ Performance not accurate (uses Mac CPU)
- ⚠️ Some sensors unavailable
- ✅ Good for UI/layout testing
- ✅ Fast iteration

### Android Studio Emulator

**Installation:**

1. Download Android Studio: developer.android.com/studio
2. Install Android Studio (~3GB)
3. Open → Tools → AVD Manager (Android Virtual Device)

**Create Emulator:**

1. AVD Manager → Create Virtual Device
2. Select device: Pixel 6, Galaxy S21, etc.
3. Select system image: Android 13 (API 33) or 14 (API 34)
4. Configure:
   - RAM: 2GB-4GB
   - Internal storage: 2GB
   - Enable hardware acceleration
5. Click "Finish"

**Launch Emulator:**

```bash
# Via Android Studio
AVD Manager → Play button

# Via command line
emulator -avd Pixel_6_API_33
```

**Testing in Emulator:**

1. Launch emulator
2. Open Chrome browser
3. Navigate to `http://10.0.2.2:3009` (special IP for host)
4. On computer Chrome: `chrome://inspect#devices`

**Emulator Limitations:**

- ⚠️ Slow startup (30s-2min)
- ⚠️ Resource intensive (4GB+ RAM)
- ⚠️ Performance not accurate
- ✅ Good for testing Android versions
- ✅ Multiple device configurations

**Recommended Emulators:**

- Pixel 6 (Android 13) - Stock Android
- Pixel 7 (Android 14) - Latest Android
- Galaxy S21 (Android 13) - Samsung UI
- Nexus 5 (320px width) - Small screen testing

### Genymotion (Alternative Android Emulator)

**Pros:**

- Faster than Android Studio emulator
- Better performance
- Easy device management

**Cons:**

- Paid ($136/year per user)
- Limited free version

**Use Case:** Large teams or CI/CD integration

---

## Browser DevTools Device Emulation

### Chrome DevTools

**Enable Device Toolbar:**

```
1. F12 (open DevTools)
2. Ctrl+Shift+M (Cmd+Shift+M on Mac)
3. Or click device icon in DevTools
```

**Features:**

- Responsive dimensions
- Preset devices (iPhone, iPad, Pixel, Galaxy, etc.)
- Custom screen sizes
- Device pixel ratio
- Touch emulation
- Network throttling
- Geolocation
- Orientation (portrait/landscape)
- User agent override

**Preset Devices:**

- iPhone SE (375×667)
- iPhone 12/13 (390×844)
- iPhone 14 Pro Max (430×932)
- Pixel 5 (393×851)
- Pixel 7 (412×915)
- Galaxy S20 Ultra (412×915)
- iPad (768×1024)
- iPad Pro (1024×1366)

**Custom Device:**

```javascript
// Add custom device via DevTools Settings
1. F12 → Settings (gear icon)
2. Devices tab
3. Add custom device:
   - Name: Galaxy S23
   - Width: 360
   - Height: 780
   - Device pixel ratio: 3
   - User agent: [Android UA]
   - Touch: Mobile
```

**Network Throttling Presets:**

- Fast 3G (1.6 Mbps down, 750 Kbps up, 150ms latency)
- Slow 3G (400 Kbps down, 400 Kbps up, 400ms latency)
- Offline

### Firefox Responsive Design Mode

**Enable:**

```
1. F12 (open DevTools)
2. Ctrl+Shift+M (Cmd+Opt+M on Mac)
3. Or Tools → Browser Tools → Responsive Design Mode
```

**Features:**

- Similar to Chrome
- Preset devices
- Touch simulation
- Network throttling
- Screenshot capture

### Safari Responsive Design Mode

**Enable:**

```
1. Open Safari
2. Develop → Enter Responsive Design Mode
3. Or Cmd+Ctrl+R
```

**Features:**

- iOS device presets
- Custom sizes
- User agent spoofing

---

## Cloud-Based Testing Services

### BrowserStack

**URL:** browserstack.com
**Pricing:** $39/month (1 parallel), $129/month (5 parallels)

**Features:**

- 3,000+ real devices
- All major browsers
- Real iOS and Android devices
- Live testing
- Automated testing
- Screenshots
- Video recording
- Network throttling
- Geolocation

**Setup:**

1. Sign up for account
2. Choose plan
3. Select device/browser
4. Enter URL: `http://localhost:3009`
5. BrowserStack Local tunnel for local testing

**BrowserStack Local (Testing localhost):**

```bash
# Download BrowserStack Local binary
# https://www.browserstack.com/local-testing

# Run tunnel
./BrowserStackLocal --key [your-key]

# Now can test http://localhost:3009 on BrowserStack devices
```

**Pros:**

- Real devices
- Comprehensive coverage
- Easy to use
- Video recording

**Cons:**

- Expensive
- Slight connection lag
- Limited session time

**Best For:**

- Pre-release testing
- Cross-browser validation
- Client demos
- Screenshot generation

### Sauce Labs

**URL:** saucelabs.com
**Pricing:** $49/month (1 parallel), $299/month (5 parallels)

**Features:**

- Similar to BrowserStack
- 2,000+ device/browser combinations
- Live testing
- Automated testing (Selenium, Appium)
- Performance analytics
- CI/CD integration

**Pros:**

- Strong automation support
- Good CI/CD integration
- Detailed reporting

**Cons:**

- Expensive
- Steeper learning curve

**Best For:**

- Automated testing
- CI/CD pipelines
- Enterprise teams

### LambdaTest

**URL:** lambdatest.com
**Pricing:** $15/month (1 parallel), $79/month (5 parallels)

**Features:**

- 3,000+ browsers/devices
- Live testing
- Automated testing
- Screenshot testing
- Video recording

**Pros:**

- More affordable
- Good feature set
- Easy to use

**Cons:**

- Smaller device selection than BrowserStack
- Less mature platform

**Best For:**

- Budget-conscious teams
- Small to medium projects

### Choosing a Service

| Feature          | BrowserStack | Sauce Labs | LambdaTest |
| ---------------- | ------------ | ---------- | ---------- |
| **Price**        | $$$          | $$$$       | $$         |
| **Device Count** | 3,000+       | 2,000+     | 3,000+     |
| **Ease of Use**  | ⭐⭐⭐⭐⭐   | ⭐⭐⭐⭐   | ⭐⭐⭐⭐   |
| **Automation**   | ⭐⭐⭐⭐     | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐   |
| **Performance**  | ⭐⭐⭐⭐     | ⭐⭐⭐⭐   | ⭐⭐⭐     |
| **Support**      | ⭐⭐⭐⭐⭐   | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐   |

**Recommendation:** BrowserStack for live testing, Sauce Labs for automation

---

## Performance Profiling Tools

### Lighthouse (Chrome DevTools)

**Access:**

```
1. Open DevTools (F12)
2. Click "Lighthouse" tab
3. Select categories: Performance, Accessibility
4. Select device: Mobile
5. Click "Analyze page load"
```

**Metrics Measured:**

- Performance score (0-100)
- First Contentful Paint
- Largest Contentful Paint
- Total Blocking Time
- Cumulative Layout Shift
- Speed Index
- Time to Interactive

**Mobile Simulation:**

- Slow 4G throttling
- Mobile CPU throttling (4x slowdown)
- Mobile viewport

### WebPageTest

**URL:** webpagetest.org
**Cost:** Free (with limits), $10/month (unlimited)

**Features:**

- Test from real devices
- Multiple locations worldwide
- Network throttling
- Video capture
- Waterfall charts
- Filmstrip view
- Comparison testing

**Test Configuration:**

```
1. Enter URL: http://localhost:3009 (need public URL)
2. Select location: Dulles, VA (iPhone 13)
3. Select browser: Chrome, Safari, etc.
4. Select connection: 4G, 3G, Cable
5. Advanced settings:
   - Number of runs: 3
   - Capture video: Yes
   - Disable JavaScript: No
```

### Chrome User Experience Report (CrUX)

**Access:** Chrome DevTools → Lighthouse → View Treemap

**Metrics:**

- Real user data from Chrome users
- Core Web Vitals
- Field data vs Lab data comparison

---

## Screenshot and Video Capture

### iOS Screenshot/Recording

**Screenshot:**

```
Press: Side button + Volume Up
Saves to Photos app
```

**Screen Recording:**

```
1. Settings → Control Center → Add "Screen Recording"
2. Swipe down from top-right → Tap record button
3. Tap red bar at top to stop
```

### Android Screenshot/Recording

**Screenshot:**

```
Press: Power + Volume Down
Saves to Screenshots folder
```

**Screen Recording:**

```
1. Swipe down twice → Tap "Screen Record"
2. Tap Stop to end recording
3. Or use: adb shell screenrecord /sdcard/demo.mp4
```

### Chrome DevTools

**Full Page Screenshot:**

```
1. Open DevTools (F12)
2. Ctrl+Shift+P (Cmd+Shift+P on Mac)
3. Type "screenshot"
4. Select "Capture full size screenshot"
```

**Mobile Device Screenshot:**

```
1. Enable Device Toolbar (Ctrl+Shift+M)
2. Three dots menu → Capture screenshot
```

---

## Automated Testing Integration

### Playwright Mobile Testing

**Install:**

```bash
npm install -D @playwright/test
npx playwright install
```

**Mobile Test Example:**

```typescript
import { test, devices } from '@playwright/test';

test.use({
  ...devices['iPhone 13'],
});

test('mobile navigation works', async ({ page }) => {
  await page.goto('http://localhost:3009');
  await page.click('[aria-label="Open menu"]');
  await expect(page.locator('.sidebar')).toBeVisible();
});

test.use({
  ...devices['Pixel 6'],
});

test('android navigation works', async ({ page }) => {
  await page.goto('http://localhost:3009');
  // Same tests...
});
```

**Available Devices in Playwright:**

- iPhone 13, iPhone 13 Pro, iPhone 13 Pro Max
- iPhone 14, iPhone 14 Pro, iPhone 14 Pro Max
- Pixel 5, Pixel 7
- Galaxy S23, Galaxy S23 Ultra
- iPad, iPad Pro

### CI/CD Integration

**GitHub Actions Example:**

```yaml
name: Mobile Tests

on: [push, pull_request]

jobs:
  mobile-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '20'
      - run: npm ci
      - run: npx playwright install --with-deps
      - run: npx playwright test --project=mobile
      - uses: actions/upload-artifact@v3
        if: always()
        with:
          name: playwright-report
          path: playwright-report/
```

---

## Test Lab Best Practices

### Device Management

**1. Keep Devices Updated**

- Update iOS/Android OS monthly
- Update browsers weekly
- Test on both latest and previous OS versions

**2. Device Charging**

- Use multi-port USB chargers
- Keep devices at 100% during testing
- Enable "Stay awake" on Android

**3. Device Organization**

- Label devices clearly (iPhone 13 iOS 17.2, etc.)
- Use device management spreadsheet
- Track device issues and repairs

**4. Clean Devices Between Tests**

- Clear browser cache
- Log out of accounts
- Reset to known state
- Remove test data

### Network Setup

**1. Dedicated WiFi Network**

- Separate SSID for testing
- Known bandwidth (50 Mbps recommended)
- No rate limiting
- Static IP for devices (optional)

**2. Mobile Hotspots**

- For real 4G/5G testing
- Use multiple carriers (T-Mobile, Verizon, AT&T)
- Monitor data usage
- Have backup hotspots

**3. Network Throttling**

- Use browser DevTools for consistency
- Test on real networks occasionally
- Document network conditions

### Security

**1. Test Devices**

- Don't use personal devices for testing
- Wipe devices before disposing
- Use test accounts only
- Don't store sensitive data

**2. Test Accounts**

- Create dedicated test accounts
- Don't use production data
- Reset passwords regularly
- Separate from personal accounts

**3. Lab Access**

- Restrict physical access
- Lock devices when not in use
- Cable locks for expensive devices
- Track device inventory

---

## Troubleshooting

### iOS Device Not Appearing in Safari

**Fix:**

1. Disconnect and reconnect device
2. Trust computer again
3. Restart Safari
4. Restart device
5. Update macOS and iOS

### Android ADB Not Detecting Device

**Fix:**

```bash
# Kill and restart ADB
adb kill-server
adb start-server
adb devices

# Check USB debugging enabled
# Try different USB cable
# Try different USB port
```

### Emulator Not Starting

**Android Studio Emulator:**

```bash
# Check virtualization enabled in BIOS
# Increase RAM allocation in AVD settings
# Cold boot emulator (wipe data)

# Check for conflicts:
netstat -ano | findstr :5554  # Windows
lsof -i :5554  # Mac/Linux
```

**iOS Simulator:**

```bash
# Reset simulator
xcrun simctl erase all

# Delete and recreate simulator
# Restart Mac
```

### BrowserStack Local Tunnel Issues

**Fix:**

1. Check firewall settings
2. Verify API key correct
3. Try different port
4. Check company proxy settings
5. Contact BrowserStack support

---

## Cost Summary

### Budget Device Lab

| Item                  | Cost        |
| --------------------- | ----------- |
| iPhone 13             | $699        |
| Google Pixel 6 (used) | $449        |
| USB cables            | $30         |
| Multi-port charger    | $40         |
| **Total**             | **~$1,218** |

### Full Device Lab

| Item                  | Cost        |
| --------------------- | ----------- |
| 5 physical devices    | ~$2,425     |
| Cables and chargers   | $100        |
| BrowserStack (annual) | $468        |
| **Total Year 1**      | **~$2,993** |

### Enterprise Lab

| Item                               | Cost         |
| ---------------------------------- | ------------ |
| 8 physical devices                 | ~$4,672      |
| Cables and accessories             | $200         |
| BrowserStack (5 parallels, annual) | $1,548       |
| Sauce Labs (annual)                | $3,588       |
| Device management cart             | $300         |
| **Total Year 1**                   | **~$10,308** |

**ROI:** Catching one critical mobile bug before release pays for entire lab.

---

## Conclusion

A well-equipped device lab ensures SimplePro-v3 works perfectly across all target devices. Start with a budget lab (iPhone + Pixel + emulators) and expand as needed. Cloud testing services (BrowserStack) complement physical devices for comprehensive coverage.

**Recommended Starting Configuration:**

1. Physical: iPhone 13 + Pixel 6 (~$1,200)
2. Emulators: Xcode Simulator + Android Studio (free)
3. Browser DevTools: Chrome, Firefox, Safari (free)
4. Cloud: BrowserStack monthly plan ($39)

**Total:** ~$1,250 upfront + $39/month

---

## Related Documents

- [MOBILE_TESTING_CHECKLIST.md](./MOBILE_TESTING_CHECKLIST.md)
- [BROWSER_COMPATIBILITY_MATRIX.md](./BROWSER_COMPATIBILITY_MATRIX.md)
- [MOBILE_TESTING_RESULTS.md](./MOBILE_TESTING_RESULTS.md)
