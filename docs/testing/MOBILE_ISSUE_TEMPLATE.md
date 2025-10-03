# Mobile Issue Report Template

**Project:** SimplePro-v3
**Version:** 1.0

---

## Issue #[NUMBER]

### Basic Information

**Date Reported:** YYYY-MM-DD
**Reporter:** [Name/Team]
**Sprint:** Sprint X, Week Y
**Component:** [Navigation / Forms / Performance / Visual / etc.]
**Status:** [ ] Open [ ] In Progress [ ] Fixed [ ] Closed [ ] Won't Fix

---

### Device Information

**Device:** [e.g., iPhone 13, Samsung Galaxy S21, iPad Pro 11"]
**OS Version:** [e.g., iOS 17.2, Android 13]
**Browser:** [e.g., Safari 17.2, Chrome 121.0.6167.164]
**Screen Size:** [e.g., 390×844px, 360×800px]
**Orientation:** [ ] Portrait [ ] Landscape [ ] Both

---

### Network Conditions

**Connection Type:** [ ] WiFi [ ] 4G [ ] 3G [ ] Offline
**Speed:** [e.g., 50 Mbps, 10 Mbps, 1 Mbps]
**Latency:** [e.g., 50ms, 200ms]

---

### Issue Details

#### Title
[Concise, descriptive title]

**Example:** Mobile sidebar animation drops to 45fps on Samsung Galaxy S21

#### Severity

- [ ] **Critical** - App unusable, crashes, data loss
- [ ] **High** - Major feature broken, workaround difficult
- [ ] **Medium** - Feature partially broken, workaround exists
- [ ] **Low** - Cosmetic issue, minor inconvenience

#### Priority

- [ ] **P0** - Blocker, fix immediately
- [ ] **P1** - Must fix before release
- [ ] **P2** - Should fix soon
- [ ] **P3** - Fix when possible
- [ ] **P4** - Enhancement, not critical

#### Category

- [ ] Navigation
- [ ] Touch Interaction
- [ ] Visual Rendering
- [ ] Forms & Inputs
- [ ] Performance
- [ ] Accessibility
- [ ] Browser Compatibility
- [ ] Security
- [ ] Other: __________

---

### Description

**What happened:**
[Describe the issue in detail]

**Expected behavior:**
[What should have happened]

**Actual behavior:**
[What actually happened]

---

### Steps to Reproduce

1. [First step]
2. [Second step]
3. [Third step]
4. [Continue...]

**Reproducibility:**
- [ ] Always (100%)
- [ ] Frequently (75%)
- [ ] Sometimes (50%)
- [ ] Rarely (<25%)
- [ ] Unable to reproduce

---

### Screenshots/Videos

**Screenshot 1:**
![Screenshot Description](path/to/screenshot1.png)

**Screenshot 2:**
![Screenshot Description](path/to/screenshot2.png)

**Video:**
[Link to video recording]

**Screen Recording Notes:**
- Duration: [X seconds]
- Shows: [What is demonstrated]

---

### Technical Details

#### Console Errors

```javascript
// Copy any console errors here
Error: [Error message]
  at [Stack trace]
```

#### Network Requests

**Failed Requests:**
- `GET /api/endpoint` - 500 Internal Server Error

**Slow Requests:**
- `GET /api/data` - 3.2s (expected <1s)

#### Performance Metrics

**Lighthouse Score:** X/100

| Metric | Value | Target | Status |
|--------|-------|--------|--------|
| FCP | Xs | <2.5s | ✅/❌ |
| LCP | Xs | <2.5s | ✅/❌ |
| TTI | Xs | <3.5s | ✅/❌ |
| CLS | X | <0.1 | ✅/❌ |
| TBT | Xms | <200ms | ✅/❌ |

#### Memory Usage

**Peak Memory:** XMB
**Leak Detected:** [ ] Yes [ ] No

#### Animation Performance

**Target FPS:** 60fps
**Actual FPS:** [X]fps
**Frame Drops:** [X]% of frames

---

### Impact Assessment

**Users Affected:**
- [ ] All users
- [ ] Mobile users only
- [ ] Specific device(s): __________
- [ ] Specific browser(s): __________
- [ ] Estimated percentage: __%

**Feature Impact:**
- [ ] Feature completely broken
- [ ] Feature partially working
- [ ] Feature usable with workaround
- [ ] Cosmetic issue only

**Business Impact:**
- [ ] Critical - Blocks user workflows
- [ ] High - Significant frustration
- [ ] Medium - Minor inconvenience
- [ ] Low - Barely noticeable

---

### Workaround

**Is there a workaround?** [ ] Yes [ ] No

**Workaround steps:**
1. [Step 1]
2. [Step 2]

**Workaround limitations:**
[Describe any limitations]

---

### Root Cause Analysis

**Suspected Cause:**
[Describe what you think is causing the issue]

**Affected Code:**
```
File: apps/web/src/components/ComponentName.tsx
Lines: 123-145
Function: functionName()
```

**Related Issues:**
- Issue #[X]: [Related issue description]

---

### Proposed Solution

**Approach 1:** [Brief description]
- **Pros:** [Benefits]
- **Cons:** [Drawbacks]
- **Effort:** [X hours/days]

**Approach 2:** [Alternative]
- **Pros:** [Benefits]
- **Cons:** [Drawbacks]
- **Effort:** [X hours/days]

**Recommended:** Approach [1/2]

---

### Testing Verification

**Test On:**
- [ ] iPhone 13 (iOS 17+)
- [ ] iPhone SE (iOS 17+)
- [ ] Samsung Galaxy S21 (Android 13+)
- [ ] Google Pixel 6 (Android 13+)
- [ ] iPad Pro (iOS 17+)
- [ ] Chrome DevTools emulation
- [ ] BrowserStack (list devices)

**Test Scenarios:**
1. [Scenario 1]
2. [Scenario 2]
3. [Scenario 3]

**Acceptance Criteria:**
- [ ] [Criterion 1]
- [ ] [Criterion 2]
- [ ] [Criterion 3]

---

### WCAG Compliance

**Does this issue affect accessibility?** [ ] Yes [ ] No

**WCAG Criteria:**
- [ ] 1.1.1 Non-text Content
- [ ] 1.4.3 Contrast (Minimum)
- [ ] 2.1.1 Keyboard
- [ ] 2.4.7 Focus Visible
- [ ] 2.5.5 Target Size
- [ ] Other: __________

**Impact on users with disabilities:**
[Description]

---

### Fix Details (After Implementation)

**Fix Implemented:** [Date]
**Fixed By:** [Developer name]
**Branch:** `fix/issue-[number]-[short-description]`
**PR:** #[PR number]

**Files Changed:**
- `path/to/file1.tsx`
- `path/to/file2.css`
- `path/to/file3.ts`

**Changes Made:**
[Brief description of fix]

**Code Diff:**
```diff
- Old code
+ New code
```

---

### Verification

**Verified By:** [QA Tester name]
**Verification Date:** [Date]
**Verification Status:** [ ] Pass [ ] Fail

**Tested On:**
- [ ] iPhone 13 - ✅ Pass
- [ ] Samsung Galaxy S21 - ✅ Pass
- [ ] [Other devices]

**Regression Testing:**
- [ ] Navigation still works
- [ ] No new issues introduced
- [ ] Performance not degraded
- [ ] Accessibility maintained

---

### Regression Risk

**Could this fix break other features?** [ ] Yes [ ] No

**Areas to watch:**
- [Related feature 1]
- [Related feature 2]

**Regression tests added:**
- [ ] Unit tests
- [ ] Integration tests
- [ ] E2E tests

---

### Related Documentation

**Updated Documentation:**
- [ ] [MOBILE_NAVIGATION_FIX.md](../frontend/MOBILE_NAVIGATION_FIX.md)
- [ ] [BROWSER_COMPATIBILITY_MATRIX.md](./BROWSER_COMPATIBILITY_MATRIX.md)
- [ ] [MOBILE_TESTING_CHECKLIST.md](./MOBILE_TESTING_CHECKLIST.md)
- [ ] [README.md](../../README.md)
- [ ] [CLAUDE.md](../../CLAUDE.md)

---

### Comments/Notes

**Additional Context:**
[Any other relevant information]

**Links:**
- Slack thread: [URL]
- Jira ticket: [URL]
- Design mockup: [URL]

---

## Example: Filled Template

---

## Issue #4

### Basic Information

**Date Reported:** 2025-10-02
**Reporter:** QA Team
**Sprint:** Sprint 1, Week 1
**Component:** Performance / Animation
**Status:** [x] Open [ ] In Progress [ ] Fixed [ ] Closed [ ] Won't Fix

---

### Device Information

**Device:** Samsung Galaxy S21 5G
**OS Version:** Android 13
**Browser:** Chrome 121.0.6167.164
**Screen Size:** 360×800px
**Orientation:** [x] Portrait [ ] Landscape [ ] Both

---

### Network Conditions

**Connection Type:** [x] WiFi [ ] 4G [ ] 3G [ ] Offline
**Speed:** 50 Mbps
**Latency:** 30ms

---

### Issue Details

#### Title
Mobile sidebar animation drops to 45-50fps on Samsung Galaxy S21

#### Severity
- [ ] Critical
- [ ] High
- [x] **Medium**
- [ ] Low

#### Priority
- [ ] P0
- [ ] P1
- [x] **P2** - Should fix soon
- [ ] P3
- [ ] P4

#### Category
- [ ] Navigation
- [ ] Touch Interaction
- [ ] Visual Rendering
- [ ] Forms & Inputs
- [x] **Performance**
- [ ] Accessibility
- [ ] Browser Compatibility

---

### Description

**What happened:**
Sidebar slide-in/out animation occasionally drops below 60fps target on Samsung Galaxy S21 (3-year-old device).

**Expected behavior:**
Smooth 60fps animation as seen on newer devices (iPhone 13, Galaxy S23, Pixel 6).

**Actual behavior:**
Animation fluctuates between 45-55fps, with occasional visible stuttering. Most noticeable when opening sidebar.

---

### Steps to Reproduce

1. Open SimplePro on Samsung Galaxy S21
2. Tap hamburger menu to open sidebar
3. Observe animation smoothness
4. Close and reopen multiple times
5. Frame drops become more noticeable after 3-4 cycles

**Reproducibility:**
- [x] Always (100%) - Issue present on this device consistently

---

### Screenshots/Videos

**Screenshot 1: Chrome DevTools Performance Profile**
![Frame drops shown in timeline](screenshots/issue-4-frame-drops.png)

**Video:**
[Screen recording showing stuttering animation - 15 seconds]

---

### Technical Details

#### Console Errors
No JavaScript errors. Performance-related only.

#### Performance Metrics

**Lighthouse Score:** 89/100 (Performance)

| Metric | Value | Target | Status |
|--------|-------|--------|--------|
| FCP | 2.1s | <2.5s | ✅ |
| LCP | 2.8s | <2.5s | ⚠️ |
| TTI | 3.4s | <3.5s | ✅ |
| CLS | 0.05 | <0.1 | ✅ |
| TBT | 220ms | <200ms | ⚠️ |

#### Animation Performance

**Target FPS:** 60fps
**Actual FPS:** 45-55fps (average 48fps)
**Frame Drops:** ~20% of frames dropped during animation

**Chrome DevTools Profile:**
- Long tasks during animation (50-80ms)
- Paint operations taking longer than 16ms budget
- Layout recalculations during transform

---

### Impact Assessment

**Users Affected:**
- [ ] All users
- [ ] Mobile users only
- [x] **Specific device(s):** Galaxy S21, S20 (Exynos chip, 3+ years old)
- [ ] Specific browser(s)
- [x] **Estimated percentage:** ~5-10% of mobile users

**Feature Impact:**
- [ ] Feature completely broken
- [ ] Feature partially working
- [x] **Feature usable with workaround**
- [ ] Cosmetic issue only

**Business Impact:**
- [ ] Critical
- [ ] High
- [x] **Medium** - Minor frustration for subset of users
- [ ] Low

---

### Workaround

**Is there a workaround?** [x] Yes [ ] No

**Workaround steps:**
1. User can still navigate (animation functional, just not smooth)
2. No action required from user
3. Consider disabling animation for older devices (future enhancement)

**Workaround limitations:**
Animation still runs, just less smooth.

---

### Root Cause Analysis

**Suspected Cause:**
- Older Exynos 2100 chip (3-year-old processor)
- 8GB RAM vs 12GB in newer devices
- CSS transform + backdrop-filter both GPU-intensive
- Multiple repaints during animation

**Affected Code:**
```
File: apps/web/src/app/components/Sidebar.module.css
Lines: 45-60 (.sidebar transition)
File: apps/web/src/app/components/AppLayout.module.css
Lines: 80-95 (.backdrop backdrop-filter)
```

**Related Issues:**
- Issue #5: Backdrop blur limited on older Android (same device)

---

### Proposed Solution

**Approach 1: Implement prefers-reduced-motion for older devices**
```css
@media (prefers-reduced-motion: reduce) {
  .sidebar {
    transition: none;
  }
}
```
- **Pros:** Respects user accessibility preference
- **Cons:** User must enable setting manually
- **Effort:** 1 hour

**Approach 2: Simplify animation for older Android**
- Remove backdrop-filter during animation
- Use simpler easing function
- **Pros:** Works automatically, improves performance
- **Cons:** Slightly different visual on older devices
- **Effort:** 2 hours

**Approach 3: Device detection + conditional animation**
- Detect older devices via User Agent
- Disable backdrop-filter or reduce animation
- **Pros:** Automatic, targeted fix
- **Cons:** Maintenance overhead, UA detection fragile
- **Effort:** 4 hours

**Recommended:** Approach 2 - Simplify animation for all Android (graceful degradation)

---

### Testing Verification

**Test On:**
- [x] Samsung Galaxy S21 (Android 13)
- [x] Samsung Galaxy S20 (Android 12) - if available
- [x] Google Pixel 5 (Android 13) - older Pixel
- [x] Modern devices (S23, Pixel 6) - ensure no regression

**Test Scenarios:**
1. Open/close sidebar 10 times rapidly
2. Monitor FPS with Chrome DevTools
3. Visual inspection for stuttering
4. Compare before/after fix

**Acceptance Criteria:**
- [x] Animation ≥50fps on S21 (currently 45-50fps)
- [x] No regression on modern devices (maintain 60fps)
- [x] Acceptable visual quality

---

### WCAG Compliance

**Does this issue affect accessibility?** [x] Yes [ ] No

**WCAG Criteria:**
- [x] **2.3.3 Animation from Interactions (AAA)** - Consider reduced motion

**Impact on users with disabilities:**
Users with vestibular disorders may benefit from reduced animation. Current implementation doesn't respect prefers-reduced-motion.

---

### Fix Details (After Implementation)

**Fix Implemented:** [Date TBD]
**Fixed By:** [Developer TBD]
**Branch:** `fix/issue-4-improve-older-android-animation`
**PR:** #[PR number TBD]

---

### Verification

**Verified By:** [QA Tester]
**Verification Date:** [Date TBD]
**Verification Status:** [ ] Pass [ ] Fail

---

## Status: Open - Assigned to Sprint 2

---

**End of Template**
