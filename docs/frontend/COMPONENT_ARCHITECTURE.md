# Document Sharing Frontend Architecture

## Component Hierarchy

```
/shared/[token] Route
│
└── SharedDocumentAccess (Main Component)
    │
    ├── RateLimitNotification (Conditional)
    │   ├── Countdown Timer
    │   ├── Progress Bar
    │   └── Dismiss Button
    │
    ├── Password Form (Conditional)
    │   ├── Password Input
    │   ├── Show/Hide Toggle
    │   └── Submit Button
    │
    └── Success View (Conditional)
        ├── Document Icon
        ├── Document Details
        └── Download Button
```

## State Flow Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                       Component Mounts                           │
│                              │                                   │
│                              ▼                                   │
│                   Try Public Access                             │
│                              │                                   │
│                    ┌─────────┴─────────┐                        │
│                    │                   │                        │
│                 Success            Needs Password                │
│                    │                   │                        │
│                    ▼                   ▼                        │
│           Show Document         Show Password Form              │
│           + Download Btn                │                        │
│                    │                   │                        │
│                    │            User Enters Password            │
│                    │                   │                        │
│                    │                   ▼                        │
│                    │          Submit POST Request               │
│                    │                   │                        │
│                    │         ┌─────────┴─────────┐              │
│                    │         │                   │              │
│                    │      Success            Error              │
│                    │         │                   │              │
│                    │         ▼           ┌───────┴────────┐     │
│                    └────> Show           │                │     │
│                           Document    Rate Limit      Other     │
│                                          │             Error    │
│                                          ▼                │     │
│                                   Show Rate Limit        │     │
│                                   Notification           │     │
│                                          │               │     │
│                                          ▼               ▼     │
│                                   Wait/Dismiss    Show Error   │
│                                          │             Message  │
│                                          ▼                      │
│                                   Show Form Again               │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

## Data Flow

```
┌──────────────────────┐
│  User Opens Link     │
│  /shared/[token]     │
└──────────┬───────────┘
           │
           ▼
┌──────────────────────────────────────────────────────────┐
│  Next.js Server Component                                │
│  - Extracts token from URL params                        │
│  - Renders SharedDocumentAccess with token prop          │
└──────────┬───────────────────────────────────────────────┘
           │
           ▼
┌──────────────────────────────────────────────────────────┐
│  SharedDocumentAccess Component (Client)                 │
│  - useEffect: Try public access on mount                 │
│  - Manages state: loading, success, error, rate_limited  │
└──────────┬───────────────────────────────────────────────┘
           │
           ▼
┌──────────────────────────────────────────────────────────┐
│  documents.service.ts                                    │
│  - accessPublicDocument(token)                           │
│  - accessSharedDocument(token, password)                 │
│  - Calls: POST /api/documents/shared/:token/access       │
└──────────┬───────────────────────────────────────────────┘
           │
           ▼
┌──────────────────────────────────────────────────────────┐
│  Backend API (NestJS)                                    │
│  - SharedDocumentsController                             │
│  - Validates token and password                          │
│  - Checks rate limit (Redis)                             │
│  - Returns presigned URL or error                        │
└──────────┬───────────────────────────────────────────────┘
           │
           ▼
┌──────────────────────────────────────────────────────────┐
│  Response                                                │
│  - 200: { documentUrl, documentName, ... }               │
│  - 401: Invalid password                                 │
│  - 404: Not found                                        │
│  - 410: Expired                                          │
│  - 429: Rate limited (Retry-After header)                │
└──────────┬───────────────────────────────────────────────┘
           │
           ▼
┌──────────────────────────────────────────────────────────┐
│  Component Updates UI                                    │
│  - Success: Show document + download button              │
│  - Error: Show error message                             │
│  - Rate Limited: Show RateLimitNotification              │
└──────────────────────────────────────────────────────────┘
```

## API Call Sequence

### Successful Password-Protected Access

```
User                 Component              Service              API                Redis
│                        │                      │                  │                  │
├──Open /shared/xyz─────>│                      │                  │                  │
│                        ├─Try Public Access───>│                  │                  │
│                        │                      ├─POST /access──┬──>│                  │
│                        │                      │                │  ├─Check rate─────>│
│                        │                      │                │  │<─OK────────────┤
│                        │                      │                │  ├─Verify token────│
│                        │                      │                │  ├─Check password──│
│                        │                      │                └──│  (no password)──│
│                        │<─401 Unauthorized────┤<─────────────────┤                  │
│                        ├─Show password form───┤                  │                  │
│<─Display form──────────┤                      │                  │                  │
│                        │                      │                  │                  │
├─Enter "Test123!"──────>│                      │                  │                  │
├─Click Submit──────────>│                      │                  │                  │
│                        ├─Submit password─────>│                  │                  │
│                        │                      ├─POST /access──┬──>│                  │
│                        │                      │                │  ├─Check rate─────>│
│                        │                      │                │  │<─OK────────────┤
│                        │                      │                │  ├─Verify token────│
│                        │                      │                └──├─Check password──│
│                        │<─200 OK + doc URL────┤<─────────────────┤  (valid!)───────│
│                        ├─Show document────────┤                  │                  │
│<─Display doc + btn─────┤                      │                  │                  │
│                        │                      │                  │                  │
├─Click Download────────>│                      │                  │                  │
│                        ├─Download file───────>│                  │                  │
│                        │                      ├─GET presigned URL (MinIO)           │
│<─File downloaded───────┤<─Blob returned───────┤                  │                  │
```

### Rate Limited Scenario

```
User                 Component              Service              API                Redis
│                        │                      │                  │                  │
├─Enter wrong pwd 6x────>│                      │                  │                  │
│  (6 attempts)          ├─Each attempt────────>│                  │                  │
│                        │                      ├─POST /access──┬──>│                  │
│                        │                      │                │  ├─Check rate─────>│
│                        │                      │                │  │<─Count: 5───────┤
│                        │<─401 each time───────┤<───────────────┘  │                  │
│                        │                      │                  │                  │
├─7th attempt───────────>│                      │                  │                  │
│                        ├─Submit──────────────>│                  │                  │
│                        │                      ├─POST /access──┬──>│                  │
│                        │                      │                │  ├─Check rate─────>│
│                        │                      │                │  │<─Count: 6───────┤
│                        │                      │                └──│  LIMIT EXCEEDED!│
│                        │<─RateLimitError──────┤<─429 Too Many ────┤                  │
│                        │   (retryAfter: 300s) │  Retry-After: 300 │                  │
│                        ├─Show notification────┤                  │                  │
│<─Rate limit banner─────┤  with countdown      │                  │                  │
│  "Wait 5:00 minutes"   │                      │                  │                  │
│                        │                      │                  │                  │
│  ... wait 5 minutes ...│                      │                  │                  │
│                        │                      │                  │                  │
├─Try again─────────────>│                      │                  │                  │
│                        ├─Submit──────────────>│                  │                  │
│                        │                      ├─POST /access──┬──>│                  │
│                        │                      │                │  ├─Check rate─────>│
│                        │                      │                │  │<─Count: 0───────┤
│                        │                      │                │  │  (TTL expired)──┤
│                        │<─200 OK──────────────┤<───────────────┘  │                  │
│<─Success───────────────┤                      │                  │                  │
```

## Error Handling Strategy

```typescript
try {
  const doc = await accessSharedDocument(token, password);
  // Success: Show document
  setState('success');
  setDocument(doc);
} catch (error) {
  if (error instanceof RateLimitError) {
    // Rate limited: Show notification with countdown
    setState('rate_limited');
    setRetryAfter(error.retryAfter);
  } else if (error instanceof DocumentAccessError) {
    // Handle specific error codes
    switch (error.statusCode) {
      case 401:
      case 403:
        // Invalid password
        setError('Invalid password. Please try again.');
        break;
      case 404:
        // Not found
        setError('Document not found or link has expired');
        break;
      case 410:
        // Expired
        setError('This share link has expired');
        break;
      default:
        // Generic error
        setError(error.message);
    }
    setState('error');
  } else {
    // Unexpected error
    setError('An unexpected error occurred');
    setState('error');
  }
}
```

## Component State Machine

```
States:
┌──────────────────┐
│  initial         │ - Default state, can show password form or loading
├──────────────────┤
│  loading         │ - API request in progress
├──────────────────┤
│  success         │ - Document loaded, show download button
├──────────────────┤
│  error           │ - Error occurred, show error message
├──────────────────┤
│  rate_limited    │ - Rate limit exceeded, show notification
└──────────────────┘

Transitions:
initial ──(mount)──> loading
loading ──(public access ok)──> success
loading ──(needs password)──> initial (with needsPassword=true)
loading ──(error)──> error
loading ──(rate limited)──> rate_limited

initial ──(submit password)──> loading
loading ──(password ok)──> success
loading ──(password wrong)──> error
loading ──(rate limited)──> rate_limited

rate_limited ──(dismiss)──> initial
rate_limited ──(timer expires)──> initial

error ──(retry)──> loading
```

## Styling Architecture

### CSS Modules Approach

```
SharedDocumentAccess.module.css
├── .container          # Full-screen centered container
├── .card               # Main content card
│   ├── .header         # Header section with logo and title
│   ├── .error          # Error message banner
│   ├── .form           # Password form
│   │   ├── .formGroup
│   │   ├── .label
│   │   ├── .passwordWrapper
│   │   ├── .input
│   │   ├── .showPasswordButton
│   │   └── .submitButton
│   ├── .successHeader  # Success state header
│   ├── .documentInfo   # Document metadata display
│   ├── .downloadButton # Primary action button
│   └── .footer         # Footer with security badge
│
RateLimitNotification.module.css
├── .notification       # Main notification container
├── .iconWrapper        # Animated icon
├── .content           # Text content
├── .countdown         # Timer section
│   ├── .progressBar
│   └── .timeRemaining
└── .closeButton       # Dismiss button
```

### Design System Integration

```css
/* Color Palette (Dark Theme) */
--background: #1a1a1a
--surface: #2a2a2a
--border: #3a3a3a
--text-primary: #ffffff
--text-secondary: #b0b0b0
--text-muted: #888888
--primary: #ffa500 (orange)
--success: #4caf50 (green)
--error: #ff6b6b (red)

/* Spacing Scale */
--space-xs: 0.25rem
--space-sm: 0.5rem
--space-md: 1rem
--space-lg: 1.5rem
--space-xl: 2rem

/* Border Radius */
--radius-sm: 4px
--radius-md: 8px
--radius-lg: 12px
--radius-full: 50%

/* Typography */
--font-size-sm: 0.875rem
--font-size-base: 1rem
--font-size-lg: 1.125rem
--font-size-xl: 1.75rem
```

## Accessibility Features

### ARIA Attributes

```tsx
<div className={styles.notification} role="alert" aria-live="assertive">
  {/* Rate limit notification */}
</div>

<input
  type="password"
  id="password"
  aria-required="true"
  aria-invalid={!!error}
  aria-describedby={error ? 'password-error' : undefined}
/>

{error && (
  <p id="password-error" className={styles.fieldError}>
    {error}
  </p>
)}

<button
  onClick={togglePassword}
  aria-label={showPassword ? 'Hide password' : 'Show password'}
  tabIndex={-1}
>
  {showPassword ? '👁️' : '👁️‍🗨️'}
</button>
```

### Keyboard Navigation

```
Tab Order:
1. Password input field
2. Show/hide password button (tabIndex=-1, clickable but not in tab order)
3. Submit button
4. Close button (if rate limited)

Enter Key:
- In password field: Submit form
- On submit button: Submit form
- On close button: Dismiss notification

Escape Key:
- Dismiss modals (future enhancement)
```

### Screen Reader Announcements

```typescript
// Error announcement
<div className={styles.error} role="alert">
  <span>{error}</span>
</div>

// Rate limit announcement
<div className={styles.notification} role="alert" aria-live="assertive">
  <h3>Too Many Attempts</h3>
  <p>Please wait before trying again</p>
</div>

// Success announcement (implicit via content change)
<h1>Document Ready</h1>
<h2>{documentName}</h2>
```

## Performance Optimizations

### Code Splitting

```
Route: /shared/[token]
Bundle: shared-[token]-[hash].js (~50KB gzipped)
```

Not loaded on other routes (dashboard, documents, etc.)

### CSS Modules Benefits

```
✅ Scoped styles (no global pollution)
✅ Automatic dead code elimination
✅ Minimal bundle size
✅ Cache-friendly (hashed filenames)
```

### React Optimizations

```typescript
// No unnecessary re-renders
const [state, setState] = useState<AccessState>('initial');

// Efficient event handlers
const handleSubmit = useCallback(async (e: FormEvent) => {
  e.preventDefault();
  // ...
}, [token, password]);

// Cleanup on unmount
useEffect(() => {
  const interval = setInterval(/* ... */);
  return () => clearInterval(interval);
}, []);
```

## Future Architecture Enhancements

### 1. Add Document Preview

```
SharedDocumentAccess
├── PasswordForm (existing)
└── DocumentPreview (new)
    ├── PDFViewer (for PDFs)
    ├── ImageViewer (for images)
    └── VideoPlayer (for videos)
```

### 2. Add Access Analytics

```
SharedDocumentAccess
├── DocumentInfo (existing)
└── AccessAnalytics (new)
    ├── View count
    ├── Last accessed
    └── Access history
```

### 3. Add Multiple File Support

```
SharedDocumentAccess
└── DocumentList (new)
    ├── Document 1
    ├── Document 2
    └── Download All (ZIP)
```

## Testing Strategy

### Unit Tests (Future)

```typescript
// documents.service.test.ts
describe('accessSharedDocument', () => {
  it('should call POST /api/documents/shared/:token/access', async () => {
    // ...
  });

  it('should throw RateLimitError on 429 response', async () => {
    // ...
  });

  it('should parse Retry-After header', async () => {
    // ...
  });
});

// SharedDocumentAccess.test.tsx
describe('SharedDocumentAccess', () => {
  it('should show password form for protected documents', () => {
    // ...
  });

  it('should display rate limit notification after 6 failed attempts', () => {
    // ...
  });
});
```

### Integration Tests (Future)

```typescript
// shared-document.e2e.test.ts
describe('Shared Document Access E2E', () => {
  it('should allow access with correct password', async () => {
    // Generate share link
    // Access link in new session
    // Enter password
    // Verify download
  });

  it('should rate limit after 6 attempts', async () => {
    // Attempt 6 times with wrong password
    // Verify rate limit notification
    // Wait for timer
    // Retry successfully
  });
});
```

## Monitoring & Observability

### Error Tracking

```typescript
// Add error tracking (e.g., Sentry)
try {
  await accessSharedDocument(token, password);
} catch (error) {
  // Log to monitoring service
  Sentry.captureException(error, {
    tags: {
      feature: 'shared-documents',
      token: token.substring(0, 8) + '...', // Partial token for debugging
    },
  });

  // Show user-friendly error
  setError('An unexpected error occurred');
}
```

### Analytics Events

```typescript
// Track user interactions
analytics.track('Shared Document Accessed', {
  token: hashToken(token),
  hasPassword: !!needsPassword,
  success: state === 'success',
  rateLimited: state === 'rate_limited',
});
```

## Related Documentation

- [Migration Guide](DOCUMENT_SHARING_API_MIGRATION.md)
- [API Documentation](../../apps/api/README.md)
- [Component README](../../apps/web/src/app/shared/README.md)
- [Testing Guide](../testing/frontend-testing.md)

---

**Last Updated:** 2025-10-02
**Maintained By:** Development Team
