# Mobile Testing Checklist

**Project:** SimplePro-v3
**Last Updated:** October 2, 2025
**Version:** 1.0
**Sprint:** Sprint 1, Week 1 - Post Mobile Navigation Fix

## Overview

This comprehensive checklist covers all aspects of mobile testing for the SimplePro-v3 web application. Use this document to verify mobile functionality across different devices, screen sizes, and scenarios after implementing the mobile navigation fixes.

---

## Device Coverage Matrix

### iOS Devices

| Device | Screen Size | Resolution | Safari Version | Priority |
|--------|-------------|------------|----------------|----------|
| iPhone SE (2022) | 4.7" | 375×667 | iOS 17+ | High |
| iPhone 12/13 | 6.1" | 390×844 | iOS 17+ | Critical |
| iPhone 12/13 mini | 5.4" | 375×812 | iOS 17+ | Medium |
| iPhone 14 Pro | 6.1" | 393×852 | iOS 17+ | High |
| iPhone 14 Pro Max | 6.7" | 430×932 | iOS 17+ | High |
| iPhone 15 | 6.1" | 393×852 | iOS 17+ | Critical |
| iPad (10th gen) | 10.9" | 820×1180 | iOS 17+ | High |
| iPad Pro 11" | 11" | 834×1194 | iOS 17+ | Medium |
| iPad Pro 12.9" | 12.9" | 1024×1366 | iOS 17+ | Medium |

### Android Devices

| Device | Screen Size | Resolution | Chrome Version | Priority |
|--------|-------------|------------|----------------|----------|
| Samsung Galaxy S21 | 6.2" | 360×800 | Chrome 120+ | Critical |
| Samsung Galaxy S23 | 6.1" | 360×780 | Chrome 120+ | High |
| Google Pixel 6 | 6.4" | 412×915 | Chrome 120+ | High |
| Google Pixel 7 Pro | 6.7" | 412×892 | Chrome 120+ | Medium |
| OnePlus 10 Pro | 6.7" | 412×919 | Chrome 120+ | Medium |
| Samsung Galaxy Tab S8 | 11" | 800×1280 | Chrome 120+ | High |
| Samsung Galaxy A53 | 6.5" | 412×915 | Chrome 120+ | Low |

### Emulators/Simulators

| Platform | Recommended Sizes | Notes |
|----------|-------------------|-------|
| Chrome DevTools | 320px, 375px, 390px, 412px, 768px, 1024px | Primary testing tool |
| Xcode iOS Simulator | iPhone 13, iPhone 15, iPad Pro | Mac only |
| Android Studio Emulator | Pixel 6, Galaxy S21 | Cross-platform |
| BrowserStack/Sauce Labs | All devices listed above | Paid service, real devices |

---

## Screen Size Breakpoints

### Critical Breakpoints to Test

| Breakpoint | Width | Device Category | Sidebar Behavior |
|------------|-------|-----------------|------------------|
| Very Small | 320px | Old iPhones | Hidden, hamburger menu |
| Small | 375px | iPhone SE, 12 mini | Hidden, hamburger menu |
| Medium | 390px | iPhone 12/13/14 | Hidden, hamburger menu |
| Large Phone | 414px | iPhone 14 Pro Max | Hidden, hamburger menu |
| Small Tablet | 768px | iPad mini, portrait | Visible, static |
| Large Tablet | 1024px | iPad, landscape | Visible, collapsible |
| Desktop | 1280px+ | Desktop browsers | Visible, collapsible |

### Viewport Testing Procedure

For each breakpoint, verify:
- Layout doesn't break
- Content is readable
- Interactive elements are accessible
- No horizontal scrolling
- Proper spacing maintained
- Images scale appropriately

---

## Test Scenarios

### 1. Navigation Tests

#### 1.1 Hamburger Menu Functionality

**Mobile (<768px):**
- [ ] Hamburger menu button is visible in top-left corner
- [ ] Button is 44×44px minimum (touch target compliant)
- [ ] Button has proper color (`#1e40af` background)
- [ ] Icon changes from ☰ (hamburger) to ✕ (close) when open
- [ ] Click/tap opens sidebar with slide-in animation
- [ ] Click/tap again closes sidebar with slide-out animation
- [ ] Animation is smooth (0.3s duration, no jank)
- [ ] Z-index correct (button at 1100, above all other elements)

**Tablet/Desktop (≥768px):**
- [ ] Hamburger menu button is hidden
- [ ] Sidebar is always visible
- [ ] Collapse button (◀/▶) is visible
- [ ] Collapse button toggles sidebar width

#### 1.2 Backdrop Overlay

**Mobile (<768px):**
- [ ] Backdrop appears when sidebar opens
- [ ] Backdrop has semi-transparent black background (`rgba(0,0,0,0.5)`)
- [ ] Backdrop has blur effect (`backdrop-filter: blur(2px)`)
- [ ] Click/tap on backdrop closes sidebar
- [ ] Backdrop fade-in animation smooth (0.3s)
- [ ] Z-index correct (999, below hamburger, above content)

**Tablet/Desktop (≥768px):**
- [ ] Backdrop never appears

#### 1.3 Sidebar Slide Animation

**Mobile (<768px):**
- [ ] Sidebar slides in from left smoothly
- [ ] Initial position: `translateX(-100%)`
- [ ] Final position: `translateX(0)`
- [ ] Animation uses cubic-bezier easing: `cubic-bezier(0.4, 0, 0.2, 1)`
- [ ] Duration: 0.3s
- [ ] No layout shift during animation
- [ ] Box shadow visible when open
- [ ] Sidebar covers full viewport height (`100dvh`)
- [ ] Sidebar width: 280px

#### 1.4 Navigation Item Interaction

**All Viewports:**
- [ ] All navigation items visible and readable
- [ ] Active tab highlighted correctly
- [ ] Click/tap on navigation item changes view
- [ ] Navigation labels not truncated
- [ ] Icons visible and properly sized
- [ ] Hover state works (desktop/tablet)

**Mobile (<768px) Specific:**
- [ ] Sidebar auto-closes after navigation item click
- [ ] Animation smooth when closing after navigation
- [ ] No double-tap required
- [ ] Touch targets minimum 44×44px

#### 1.5 Body Scroll Prevention

**Mobile (<768px):**
- [ ] Body scroll disabled when sidebar is open
- [ ] Background content doesn't scroll when swiping over backdrop
- [ ] Body scroll re-enabled when sidebar closes
- [ ] Scroll position preserved when reopening sidebar
- [ ] No scroll lock on page reload

**Tablet/Desktop (≥768px):**
- [ ] Body scroll always enabled (sidebar always visible)

#### 1.6 Sidebar Collapse (Desktop Only)

**Desktop (≥1024px):**
- [ ] Collapse button visible next to logo
- [ ] Click collapse button transitions sidebar from 280px to 70px
- [ ] Navigation labels hide when collapsed
- [ ] Icons remain visible when collapsed
- [ ] Tooltips appear on hover when collapsed
- [ ] Logo changes from "SimplePro" to "SP"
- [ ] Animation smooth (0.3s transition)
- [ ] Main content area expands accordingly

### 2. Touch Interaction Tests

#### 2.1 Touch Target Sizes

**All Interactive Elements:**
- [ ] Hamburger menu button: ≥44×44px
- [ ] Navigation items: ≥44px height
- [ ] Collapse button: ≥44×44px
- [ ] Form submit buttons: ≥44px height
- [ ] All clickable links: ≥44px height
- [ ] Action buttons (edit, delete, etc.): ≥44×44px
- [ ] Tab controls: ≥44px height
- [ ] Dropdown triggers: ≥44px height

#### 2.2 Accidental Tap Prevention

- [ ] No overlapping touch targets
- [ ] Adequate spacing between interactive elements (≥8px)
- [ ] No unintended actions from edge swipes
- [ ] Dropdown menus don't trigger accidentally
- [ ] No false positives on hover states

#### 2.3 Gesture Support

- [ ] Tap/click works on all buttons
- [ ] Long press doesn't break functionality
- [ ] Swipe doesn't interfere with sidebar close
- [ ] Pinch-to-zoom disabled where appropriate (forms)
- [ ] Double-tap-to-zoom disabled in app interface

### 3. Visual Rendering Tests

#### 3.1 Button Color Consistency

**Primary Buttons:**
- [ ] All primary buttons use `#2563eb` (blue-600)
- [ ] Hover state uses `#1d4ed8` (blue-700)
- [ ] Focus ring uses `#60a5fa` (blue-400) with 3px outline
- [ ] Disabled state clearly distinguishable
- [ ] No color inconsistencies across components

**Affected Components:**
- [ ] LoginForm submit button
- [ ] ReportsManagement primary buttons
- [ ] CustomerManagement action buttons
- [ ] EstimateForm buttons
- [ ] JobManagement buttons
- [ ] Settings save buttons
- [ ] Dashboard action buttons

#### 3.2 Text Readability

**All Viewports:**
- [ ] Font size ≥14px for body text
- [ ] Font size ≥16px for form inputs (prevents iOS zoom)
- [ ] Headings properly sized and hierarchical
- [ ] Line height adequate (≥1.5 for body text)
- [ ] Text color contrast ≥4.5:1 (WCAG AA)
- [ ] No text truncation (unless intentional with ellipsis)

**Mobile Specific:**
- [ ] Text still readable at 320px width
- [ ] No text overflow outside containers
- [ ] Navigation labels not cut off
- [ ] Form labels properly aligned with inputs

#### 3.3 Image and Media Scaling

- [ ] Images scale proportionally
- [ ] No image distortion or stretching
- [ ] Images don't overflow containers
- [ ] Responsive images load appropriate sizes
- [ ] Icons maintain aspect ratio
- [ ] Logo scales correctly
- [ ] Avatar images render properly

#### 3.4 Layout and Spacing

**All Viewports:**
- [ ] Consistent spacing between sections
- [ ] Proper padding in containers
- [ ] No horizontal scrolling
- [ ] No content cut off at edges
- [ ] Grid layouts adapt to screen size
- [ ] Tables scroll or stack appropriately on mobile

**Mobile Specific:**
- [ ] Single column layout for forms
- [ ] Cards stack vertically
- [ ] Dashboard widgets reflow correctly
- [ ] Settings pages readable and navigable
- [ ] Data tables have horizontal scroll or responsive design

### 4. Form and Input Tests

#### 4.1 Input Field Accessibility

**All Viewports:**
- [ ] All inputs have visible labels
- [ ] Labels properly associated (for/id)
- [ ] Input font size ≥16px (prevents iOS zoom)
- [ ] Input height ≥44px (touch target)
- [ ] Placeholder text visible but not confusing
- [ ] Focus states clearly visible

**Mobile Specific:**
- [ ] Keyboard doesn't hide active input
- [ ] Page scrolls to bring input into view
- [ ] Keyboard type appropriate (email, number, tel, etc.)
- [ ] Autocomplete works correctly
- [ ] Autocapitalize appropriate for input type

#### 4.2 Validation and Error Messages

- [ ] Validation messages visible and readable
- [ ] Errors appear near relevant inputs
- [ ] Error color contrast ≥4.5:1
- [ ] Inline validation works without blocking
- [ ] Success messages visible and dismissible
- [ ] Error icons/indicators visible
- [ ] Screen readers announce errors

#### 4.3 Form Submission

- [ ] Submit button accessible and tappable
- [ ] Submit button disabled during submission
- [ ] Loading state clearly indicated
- [ ] Success confirmation visible
- [ ] Error handling graceful
- [ ] Form doesn't submit on Enter key if multi-field
- [ ] No double submissions possible

#### 4.4 Keyboard Interaction

**iOS Keyboard:**
- [ ] Keyboard appears immediately on input focus
- [ ] "Done" button closes keyboard
- [ ] "Next" button moves to next field
- [ ] Keyboard doesn't cover submit button
- [ ] Viewport adjusts for keyboard height

**Android Keyboard:**
- [ ] Keyboard appears on input focus
- [ ] Enter/Go button submits form (single field) or moves to next
- [ ] Back button closes keyboard
- [ ] Viewport adjusts correctly

### 5. Performance Tests

#### 5.1 Animation Performance

- [ ] Sidebar slide animation 60fps (no jank)
- [ ] Backdrop fade-in smooth
- [ ] No layout thrashing during animations
- [ ] Page transitions smooth
- [ ] No stuttering on older devices
- [ ] GPU-accelerated transforms used (`translateX`, not `left`)

**Testing Method:**
- Open Chrome DevTools Performance tab
- Record while opening/closing sidebar
- Check for long tasks (>50ms)
- Verify no forced reflows/layouts during animation

#### 5.2 Page Load Performance

**Mobile 4G Network:**
- [ ] First Contentful Paint (FCP) < 2.5s
- [ ] Largest Contentful Paint (LCP) < 2.5s
- [ ] Time to Interactive (TTI) < 3.5s
- [ ] Cumulative Layout Shift (CLS) < 0.1
- [ ] Total Blocking Time (TBT) < 200ms

**Mobile 3G Network:**
- [ ] FCP < 4s
- [ ] LCP < 4s
- [ ] TTI < 5s
- [ ] Page usable within 7s

**WiFi:**
- [ ] FCP < 1.5s
- [ ] LCP < 1.5s
- [ ] TTI < 2s

#### 5.3 Memory Usage

- [ ] No memory leaks on navigation
- [ ] Memory usage < 100MB on mobile devices
- [ ] No excessive DOM node count (< 1500 nodes)
- [ ] Event listeners properly cleaned up
- [ ] No detached DOM trees

**Testing Method:**
- Chrome DevTools Memory tab
- Take heap snapshot
- Navigate through app
- Take another snapshot
- Compare for retained objects

#### 5.4 Network Performance

- [ ] API requests complete < 1s (good network)
- [ ] Loading states shown during requests
- [ ] Failed requests handled gracefully
- [ ] Retry logic works correctly
- [ ] No unnecessary requests
- [ ] Request batching where appropriate

### 6. Browser-Specific Tests

#### 6.1 Safari iOS

- [ ] Animations smooth
- [ ] Touch events work correctly
- [ ] Viewport height correct (handles notch/safe areas)
- [ ] No 300ms tap delay
- [ ] Keyboard behavior correct
- [ ] -webkit- prefixes work where needed
- [ ] `100dvh` renders correctly

#### 6.2 Chrome Mobile (Android)

- [ ] All functionality works
- [ ] Animations smooth
- [ ] Touch events responsive
- [ ] Material design elements render correctly
- [ ] No Chrome-specific bugs
- [ ] PWA features work (if applicable)

#### 6.3 Firefox Mobile

- [ ] Core functionality works
- [ ] Animations acceptable
- [ ] No Firefox-specific layout issues
- [ ] Touch interactions work
- [ ] CSS features supported

#### 6.4 Samsung Internet

- [ ] Basic functionality works
- [ ] Layout correct
- [ ] Samsung-specific features don't break app
- [ ] Performance acceptable

### 7. Accessibility Tests (Mobile)

#### 7.1 Screen Reader Navigation

**iOS VoiceOver:**
- [ ] Hamburger button announced correctly ("Open menu" / "Close menu")
- [ ] Navigation items announced
- [ ] Active tab state announced
- [ ] Swipe navigation works
- [ ] Form labels read correctly

**Android TalkBack:**
- [ ] All interactive elements announced
- [ ] Navigation context clear
- [ ] Form validation errors announced
- [ ] Button states announced

#### 7.2 Keyboard Navigation (Bluetooth keyboard)

- [ ] Tab order logical
- [ ] Focus indicators visible
- [ ] Skip link works
- [ ] No keyboard traps
- [ ] Enter/Space activate buttons
- [ ] Escape closes modals/sidebar

#### 7.3 Zoom and Text Scaling

- [ ] App works at 200% zoom
- [ ] Text scaling doesn't break layout
- [ ] No horizontal scroll when zoomed
- [ ] Interactive elements still accessible
- [ ] Content doesn't overlap

#### 7.4 Color and Contrast

- [ ] All text contrast ≥4.5:1 (normal text)
- [ ] Large text contrast ≥3:1
- [ ] Button contrast ≥4.5:1
- [ ] Focus indicators contrast ≥3:1
- [ ] Error messages contrast ≥4.5:1
- [ ] Works in high contrast mode (Windows)

### 8. Orientation Tests

#### 8.1 Portrait Orientation

- [ ] All features accessible
- [ ] Layout optimized for portrait
- [ ] No content cut off
- [ ] Sidebar full height
- [ ] Forms usable

#### 8.2 Landscape Orientation

- [ ] Layout adapts appropriately
- [ ] Sidebar behavior correct
- [ ] Content reflows properly
- [ ] Keyboard doesn't obscure inputs
- [ ] No horizontal scroll (unless intentional)

#### 8.3 Orientation Changes

- [ ] Smooth transition between orientations
- [ ] State preserved during rotation
- [ ] No layout breakage
- [ ] Sidebar state maintained
- [ ] Form data not lost

### 9. Edge Cases and Stress Tests

#### 9.1 Rapid Interactions

- [ ] Multiple rapid sidebar toggles don't break animation
- [ ] Rapid navigation clicks handled gracefully
- [ ] No race conditions in state management
- [ ] Animation queue doesn't pile up

#### 9.2 Long Content

- [ ] Long navigation lists scroll correctly
- [ ] Long page content scrolls properly
- [ ] Sidebar footer stays at bottom
- [ ] Large data tables handle scroll
- [ ] Infinite scroll works (if applicable)

#### 9.3 Slow Network

- [ ] Loading states shown
- [ ] Timeouts handled gracefully
- [ ] Retry mechanisms work
- [ ] Offline mode (if applicable)
- [ ] No white screens

#### 9.4 Low-End Devices

- [ ] App usable on older devices (3+ years old)
- [ ] Animations don't cause jank
- [ ] Memory usage reasonable
- [ ] No crashes
- [ ] Acceptable performance

---

## Testing Workflow

### 1. Pre-Test Setup

1. Clear browser cache
2. Ensure consistent test data
3. Set up device/emulator
4. Open Chrome DevTools (if applicable)
5. Prepare checklist for recording results

### 2. Test Execution

1. Start with critical devices (iPhone 13, Galaxy S21)
2. Test in order: Navigation → Touch → Visual → Forms → Performance
3. Record all issues with screenshots
4. Note any unexpected behavior
5. Test each scenario at multiple screen sizes

### 3. Issue Logging

For each issue found:
1. Record device/browser/OS version
2. Screenshot or video capture
3. Steps to reproduce
4. Expected vs actual behavior
5. Severity level (critical, high, medium, low)
6. Assign priority

### 4. Regression Testing

After fixes:
1. Retest failed scenarios
2. Verify fix doesn't break other features
3. Test on multiple devices
4. Update checklist with results

---

## Sign-Off Checklist

### Critical Criteria (Must Pass)

- [ ] Mobile navigation works on all tested iOS devices
- [ ] Mobile navigation works on all tested Android devices
- [ ] No critical accessibility violations (WCAG Level A)
- [ ] No critical performance issues (LCP > 4s)
- [ ] No broken layouts at any tested breakpoint
- [ ] All forms submittable on mobile
- [ ] Button colors consistent across app

### High Priority (Should Pass)

- [ ] Touch targets meet 44×44px minimum (90%+)
- [ ] WCAG AA compliance (color contrast, keyboard navigation)
- [ ] Performance meets 4G targets (LCP < 2.5s)
- [ ] Smooth animations on modern devices (2 years old or newer)
- [ ] No horizontal scrolling on any viewport

### Nice to Have (Recommended)

- [ ] WCAG AAA compliance where possible
- [ ] Performance meets 3G targets
- [ ] Smooth animations on older devices (3+ years old)
- [ ] Gesture support (swipe to close, etc.)
- [ ] Perfect 100% touch target compliance

---

## Automated Testing Integration

### Playwright Mobile Tests

```typescript
// Example test structure
test.describe('Mobile Navigation', () => {
  test('should open sidebar on hamburger click', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('/');
    await page.click('[aria-label="Open menu"]');
    await expect(page.locator('.sidebar.open')).toBeVisible();
  });
});
```

### Visual Regression Testing

- Use Percy, Chromatic, or similar
- Capture screenshots at each breakpoint
- Compare against baseline
- Flag any visual changes for review

### Performance Monitoring

- Lighthouse CI integration
- Real User Monitoring (RUM)
- Synthetic monitoring for key flows
- Performance budgets enforced

---

## Revision History

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | 2025-10-02 | Claude Code | Initial checklist creation |

---

## Notes

- Test checklist should be updated after each sprint
- Use this as a template for specific feature testing
- Customize device list based on analytics data
- Add new scenarios as edge cases are discovered
- Reference BROWSER_COMPATIBILITY_MATRIX.md for browser-specific tests
- Reference MOBILE_ACCESSIBILITY_TESTING.md for detailed a11y tests
