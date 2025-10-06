# Accessibility Quick Reference - SimplePro v3

## 🎯 WCAG 2.1 AA Quick Checklist

Use this reference when developing new features or reviewing code.

---

## 📊 Color Contrast Requirements

### Minimum Contrast Ratios

| Text Size                              | Minimum Ratio | Use Case                      |
| -------------------------------------- | ------------- | ----------------------------- |
| **Normal text** (< 24px)               | **4.5:1**     | Body text, labels, buttons    |
| **Large text** (≥ 24px or ≥ 19px bold) | **3:1**       | Headings, large buttons       |
| **UI components**                      | **3:1**       | Borders, icons, form controls |

### ✅ Approved Text Colors (on dark bg #0f1419)

```css
/* Copy these values directly */
--text-primary: #ffffff; /* 16.5:1 - Use for headings */
--text-secondary: #e2e8f0; /* 11.2:1 - Use for body text */
--text-tertiary: #cbd5e1; /* 8.4:1 - Use for descriptions */
--text-muted: #94a3b8; /* 4.8:1 - Use for hints/placeholders */
--text-disabled: #64748b; /* 3.1:1 - Large text ONLY */
```

### ✅ Approved Link Colors

```css
--link-primary: #60a5fa; /* 4.52:1 - Default */
--link-hover: #93c5fd; /* 6.1:1 - Hover */
--link-visited: #a78bfa; /* 4.6:1 - Visited */
```

### ✅ Approved Status Colors

```css
--success-color: #4ade80; /* 6.8:1 */
--error-color: #f87171; /* 4.1:1 */
--warning-color: #fbbf24; /* 8.2:1 */
--info-color: #22d3ee; /* 6.2:1 */
```

### ❌ Avoid These Colors for Normal Text

```css
/* These fail WCAG AA - DO NOT USE for text */
#888888  /* 2.8:1 - Too low */
#999999  /* 3.2:1 - Too low */
#3b82f6  /* 3.1:1 - Large text only */
#2563eb  /* 2.8:1 - Too low */
```

---

## 🎨 Using the Color System

### Method 1: CSS Variables (Recommended)

```css
.my-component {
  color: var(--text-primary);
  background: var(--bg-primary);
  border-color: var(--border-accent);
}
```

### Method 2: Import Accessibility Colors

```css
@import '../styles/accessibility-colors.css';

.my-button {
  background: var(--btn-primary-bg);
  color: var(--btn-primary-text);
}
```

---

## 🔘 Button Best Practices

### Use Pre-built Accessible Buttons

```tsx
// Primary action
<button className="btn-primary">Save Changes</button>

// Secondary action
<button className="btn-secondary">Cancel</button>

// Destructive action
<button className="btn-danger">Delete</button>

// Success action
<button className="btn-success">Approve</button>

// Icon-only button (needs aria-label!)
<button className="btn-icon" aria-label="Delete item">
  <TrashIcon aria-hidden="true" />
</button>
```

### Button Requirements

- ✅ Minimum size: **44x44px** (touch-friendly)
- ✅ Clear focus indicator (3px outline)
- ✅ Sufficient contrast (4.5:1 text, 3:1 border)
- ✅ Disabled state visually distinct
- ✅ Loading state with ARIA

### Bad vs Good Examples

❌ **Bad:**

```tsx
<button style={{ color: '#888' }}>Click me</button>
```

✅ **Good:**

```tsx
<button className="btn-primary">Click me</button>
```

---

## 📝 Form Best Practices

### Always Include Labels

❌ **Bad:**

```tsx
<input type="text" placeholder="Name" />
```

✅ **Good:**

```tsx
<label htmlFor="customer-name">Customer Name</label>
<input id="customer-name" type="text" />
```

### Required Fields

```tsx
<label htmlFor="email" className="form-label-required">
  Email
  <span className="sr-only">required</span>
</label>
<input
  id="email"
  type="email"
  aria-required="true"
/>
```

### Error States

```tsx
<label htmlFor="phone">Phone Number</label>
<input
  id="phone"
  type="tel"
  aria-invalid={hasError}
  aria-describedby={hasError ? "phone-error" : undefined}
  className={hasError ? "form-input form-input-error" : "form-input"}
/>
{hasError && (
  <div id="phone-error" role="alert" className="form-error">
    Please enter a valid phone number
  </div>
)}
```

### Success States

```tsx
<input
  className="form-input form-input-success"
  aria-invalid="false"
/>
<div role="status" className="form-success">
  ✓ Email verified
</div>
```

---

## ⌨️ Keyboard Navigation

### Essential Patterns

1. **Tab Order** - Ensure logical flow
2. **Focus Indicators** - Always visible
3. **Skip Links** - First tab stop
4. **Arrow Keys** - For menus/lists
5. **Escape** - Close modals/dialogs
6. **Enter/Space** - Activate buttons

### Focus Management

```tsx
// Store ref to return focus
const triggerRef = useRef<HTMLButtonElement>(null);

const openModal = () => {
  setIsOpen(true);
  // Focus will move to modal
};

const closeModal = () => {
  setIsOpen(false);
  triggerRef.current?.focus(); // Return focus!
};
```

### Focus Trap in Modals

```tsx
// Use a library like focus-trap-react
import FocusTrap from 'focus-trap-react';

<FocusTrap active={isOpen}>
  <div role="dialog" aria-modal="true">
    {/* Modal content */}
  </div>
</FocusTrap>;
```

---

## 🔊 Screen Reader Support

### ARIA Landmarks

```tsx
// Navigation
<aside role="navigation" aria-label="Main navigation">
  {/* sidebar */}
</aside>

// Main content
<main id="main-content" role="main">
  {/* page content */}
</main>

// Banner
<header role="banner">
  {/* logo, user info */}
</header>
```

### Live Regions

```tsx
// Errors (urgent)
<div role="alert" aria-live="assertive" aria-atomic="true">
  Error: Invalid credentials
</div>

// Success (polite)
<div role="status" aria-live="polite">
  Customer saved successfully
</div>

// Loading (polite)
<div role="status" aria-live="polite" aria-busy="true">
  <Spinner aria-hidden="true" />
  <span className="sr-only">Loading data...</span>
</div>
```

### Hiding Decorative Elements

```tsx
// Hide icons from screen readers
<button>
  <SaveIcon aria-hidden="true" />
  <span>Save</span>
</button>

// Icon-only button
<button aria-label="Close dialog">
  <XIcon aria-hidden="true" />
</button>
```

### Screen Reader Only Text

```tsx
<span className="sr-only">Required field</span>
```

Or use the CSS class:

```css
.sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border: 0;
}
```

---

## 📋 Tables

### Accessible Table Structure

```tsx
<table>
  <caption>Customer List - Showing 25 of 100</caption>
  <thead>
    <tr>
      <th scope="col">Name</th>
      <th scope="col">Email</th>
      <th scope="col">Status</th>
      <th scope="col">Actions</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <th scope="row">John Doe</th>
      <td>john@example.com</td>
      <td>Active</td>
      <td>
        <button aria-label="Edit John Doe">Edit</button>
      </td>
    </tr>
  </tbody>
</table>
```

### Key Points:

- ✅ Always include `<caption>`
- ✅ Use `scope="col"` for column headers
- ✅ Use `scope="row"` for row headers
- ✅ Provide context in action buttons

---

## 🔔 Notifications & Alerts

### Error Notifications

```tsx
<div role="alert" aria-live="assertive">
  <AlertIcon aria-hidden="true" />
  <div>
    <strong>Error:</strong> Failed to save customer
  </div>
</div>
```

### Success Notifications

```tsx
<div role="status" aria-live="polite">
  <CheckIcon aria-hidden="true" />
  <div>Customer saved successfully</div>
</div>
```

### Info Notifications

```tsx
<div role="status" aria-live="polite">
  <InfoIcon aria-hidden="true" />
  <div>2 new messages</div>
</div>
```

---

## 🖼️ Images & Icons

### Images with Meaning

```tsx
<img src="customer-photo.jpg" alt="Profile photo of John Doe" />
```

### Decorative Images

```tsx
<img src="decorative-pattern.svg" alt="" role="presentation" />
```

### Icons in Buttons

```tsx
// With text - hide icon
<button>
  <SaveIcon aria-hidden="true" />
  <span>Save</span>
</button>

// Icon only - label button
<button aria-label="Save changes">
  <SaveIcon aria-hidden="true" />
</button>
```

---

## 🎭 Modals & Dialogs

### Accessible Modal

```tsx
<div
  role="dialog"
  aria-modal="true"
  aria-labelledby="dialog-title"
  aria-describedby="dialog-description"
>
  <h2 id="dialog-title">Confirm Deletion</h2>
  <p id="dialog-description">
    Are you sure you want to delete this customer? This action cannot be undone.
  </p>

  <div className="btn-group">
    <button className="btn-danger" onClick={handleDelete}>
      Delete
    </button>
    <button className="btn-secondary" onClick={handleClose}>
      Cancel
    </button>
  </div>
</div>
```

### Modal Requirements:

- ✅ `role="dialog"`
- ✅ `aria-modal="true"`
- ✅ `aria-labelledby` (points to title)
- ✅ `aria-describedby` (points to description)
- ✅ Focus trap (keep focus inside)
- ✅ Close on Escape key
- ✅ Return focus on close

---

## ✅ Pre-Flight Checklist

Before submitting code, verify:

### Color Contrast

- [ ] All text meets 4.5:1 (or 3:1 for large)
- [ ] Borders/icons meet 3:1
- [ ] Focus indicators visible (3:1)
- [ ] Use approved color variables

### Keyboard

- [ ] All actions keyboard accessible
- [ ] Logical tab order
- [ ] Focus indicators visible
- [ ] No keyboard traps
- [ ] Escape closes modals

### Screen Readers

- [ ] All images have alt text (or alt="")
- [ ] Forms have labels
- [ ] Errors announced (role="alert")
- [ ] Loading states announced
- [ ] ARIA landmarks present

### Forms

- [ ] All inputs have labels
- [ ] Required fields indicated
- [ ] Error states with aria-invalid
- [ ] Help text with aria-describedby

### Interactive Elements

- [ ] Buttons have clear labels
- [ ] Links are descriptive
- [ ] Touch targets ≥ 44x44px
- [ ] Disabled states clear

### Responsive

- [ ] Readable at 200% zoom
- [ ] No horizontal scroll at 320px
- [ ] Touch targets adequate

---

## 🛠️ Testing Tools

### Browser DevTools

1. **Chrome Lighthouse** - Accessibility audit
2. **Firefox Accessibility Inspector** - ARIA tree
3. **Color Contrast Checker** - Built-in

### Browser Extensions

- [axe DevTools](https://www.deque.com/axe/devtools/) - Find accessibility issues
- [WAVE](https://wave.webaim.org/) - Visual feedback
- [Stark](https://www.getstark.co/) - Color contrast

### Screen Readers

- **NVDA** (Windows) - Free
- **JAWS** (Windows) - Commercial
- **VoiceOver** (macOS/iOS) - Built-in
- **TalkBack** (Android) - Built-in

### Manual Testing

```bash
# Install axe for React
npm install --save-dev @axe-core/react

# In development, add to main entry:
if (process.env.NODE_ENV === 'development') {
  import('@axe-core/react').then(axe => {
    axe.default(React, ReactDOM, 1000);
  });
}
```

---

## 📚 Common Patterns Reference

### Loading State

```tsx
const [isLoading, setIsLoading] = useState(false);

{
  isLoading && (
    <div role="status" aria-live="polite" aria-busy="true">
      <Spinner aria-hidden="true" />
      <span className="sr-only">Loading customer data...</span>
    </div>
  );
}
```

### Form Validation

```tsx
const [errors, setErrors] = useState<Record<string, string>>({});

<input
  id="email"
  type="email"
  aria-required="true"
  aria-invalid={!!errors.email}
  aria-describedby={errors.email ? 'email-error' : undefined}
  className={errors.email ? 'form-input form-input-error' : 'form-input'}
/>;
{
  errors.email && (
    <div id="email-error" role="alert" className="form-error">
      {errors.email}
    </div>
  );
}
```

### Search with Live Results

```tsx
<label htmlFor="search">Search customers</label>
<input
  id="search"
  type="search"
  aria-controls="search-results"
  aria-autocomplete="list"
/>

<div
  id="search-results"
  role="region"
  aria-live="polite"
  aria-atomic="false"
>
  {results.length} results found
</div>
```

---

## 🚨 Common Mistakes to Avoid

### ❌ Don't Do This:

```tsx
// Missing label
<input type="text" placeholder="Name" />

// Poor contrast
<button style={{ color: '#888' }}>Click</button>

// Div as button
<div onClick={handleClick}>Submit</div>

// Generic link text
<a href="/details">Click here</a>

// No alt text
<img src="logo.png" />

// Icon without label
<button><XIcon /></button>

// Missing error announcement
{error && <div>{error}</div>}
```

### ✅ Do This Instead:

```tsx
// Proper label
<label htmlFor="name">Name</label>
<input id="name" type="text" />

// Good contrast
<button className="btn-primary">Click</button>

// Real button
<button onClick={handleClick}>Submit</button>

// Descriptive link
<a href="/customers/123">View John Doe's details</a>

// Proper alt text
<img src="logo.png" alt="SimplePro logo" />

// Labeled icon
<button aria-label="Close">
  <XIcon aria-hidden="true" />
</button>

// Announced error
{error && <div role="alert">{error}</div>}
```

---

## 📖 Additional Resources

### Internal Docs

- **Full Guide**: `docs/guides/ACCESSIBILITY.md`
- **Color System**: `apps/web/src/styles/accessibility-colors.css`
- **Button Styles**: `apps/web/src/styles/accessible-buttons.css`
- **Form Styles**: `apps/web/src/styles/accessible-forms.css`

### External Resources

- [WCAG 2.1 Quick Reference](https://www.w3.org/WAI/WCAG21/quickref/)
- [MDN Accessibility](https://developer.mozilla.org/en-US/docs/Web/Accessibility)
- [WebAIM](https://webaim.org/)
- [A11y Project](https://www.a11yproject.com/)

---

**Last Updated:** October 2025
**Keep this reference handy when developing!** 🚀
