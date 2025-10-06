# Quick Start: Shared Documents Feature

**5-Minute Setup Guide for Developers**

## TL;DR

New public route for accessing shared documents with password protection and rate limiting.

**Route:** `/shared/[token]`
**API:** `POST /api/documents/shared/:token/access`
**Rate Limit:** 6 attempts per 5 minutes

## Quick Test (Local Development)

### 1. Start Services

```bash
# Terminal 1: Start infrastructure
npm run docker:dev

# Terminal 2: Start API
npm run dev:api

# Terminal 3: Start Web
npm run dev:web
```

### 2. Generate Share Link

1. Open browser: `http://localhost:3009`
2. Login: `admin` / `Admin123!`
3. Go to Documents page
4. Upload a test document
5. Click Share button (🔗)
6. Enable "Password Protection" toggle
7. Set password: `Test123!`
8. Click "Generate Link"
9. Copy the generated link (e.g., `http://localhost:3009/shared/abc123token`)

### 3. Test Access

1. Open link in **incognito/private window**
2. You should see password form
3. Enter password: `Test123!`
4. Click "Access Document"
5. You should see document details
6. Click "Download Document"
7. File should download

### 4. Test Rate Limiting

1. Refresh the page (incognito window)
2. Enter **wrong** password: `WrongPass123`
3. Submit 6 times
4. On 7th attempt, you should see:
   - "Too Many Attempts" notification
   - Countdown timer (5 minutes)
   - Progress bar

## File Locations

### Components

```
apps/web/src/app/components/documents/
├── SharedDocumentAccess.tsx           # Main component
├── SharedDocumentAccess.module.css
├── RateLimitNotification.tsx          # Rate limit UI
├── RateLimitNotification.module.css
└── types.ts                           # TypeScript types (updated)
```

### Services

```
apps/web/src/services/
├── documents.service.ts               # API client
└── index.ts                          # Exports
```

### Routes

```
apps/web/src/app/shared/
└── [token]/
    └── page.tsx                       # Public route
```

## Usage Examples

### Accessing Shared Document (Client-Side)

```typescript
import { accessSharedDocument } from '@/services/documents.service';
import {
  RateLimitError,
  DocumentAccessError,
} from '@/app/components/documents/types';

async function handleAccess(token: string, password: string) {
  try {
    const doc = await accessSharedDocument(token, password);
    console.log('Document URL:', doc.documentUrl);
    console.log('Document Name:', doc.documentName);
    // Download or display document
  } catch (error) {
    if (error instanceof RateLimitError) {
      console.log('Rate limited! Retry after:', error.retryAfter);
      // Show rate limit notification
    } else if (error instanceof DocumentAccessError) {
      console.log('Access error:', error.statusCode, error.message);
      // Show error message
    }
  }
}
```

### Using the Component

```tsx
import { SharedDocumentAccess } from '@/app/components/documents';

function MyPage({ token }: { token: string }) {
  return <SharedDocumentAccess token={token} />;
}
```

## API Reference

### `accessSharedDocument(token, password)`

```typescript
async function accessSharedDocument(
  token: string,
  password: string,
): Promise<AccessSharedDocumentResponse>;
```

**Parameters:**

- `token`: Share token from URL
- `password`: Document password

**Returns:**

```typescript
{
  documentUrl: string;      // Presigned download URL
  documentName: string;     // Original filename
  documentType: string;     // contract, invoice, etc.
  mimeType: string;        // MIME type
  size: number;            // File size in bytes
  expiresAt?: string;      // Optional expiration date
}
```

**Throws:**

- `RateLimitError` - Too many attempts (429)
- `DocumentAccessError` - Other errors (401, 403, 404, 410)

### `accessPublicDocument(token)`

Same as above but without password parameter. Used for non-password-protected documents.

### `downloadDocument(url, filename)`

```typescript
async function downloadDocument(
  documentUrl: string,
  filename: string,
): Promise<void>;
```

Helper function to download document from presigned URL.

## Common Issues & Solutions

### Issue: Build Errors

```bash
# Clear cache and rebuild
rm -rf apps/web/.next
npm run build
```

### Issue: TypeScript Errors

```bash
# Check types
npx tsc --noEmit --project apps/web/tsconfig.json
```

### Issue: API Not Responding

```bash
# Check API is running
curl http://localhost:3001/health

# Restart API
npm run dev:api
```

### Issue: Rate Limit Not Clearing

```bash
# Check Redis
docker ps | grep redis

# Clear rate limit keys (DEV ONLY!)
docker exec -it simplepro-redis-dev redis-cli FLUSHDB
```

## Testing Checklist

Quick testing checklist before committing:

- [ ] Build succeeds (`npm run build`)
- [ ] No TypeScript errors
- [ ] Password-protected access works
- [ ] Public (no password) access works
- [ ] Rate limiting triggers after 6 attempts
- [ ] Rate limit timer counts down correctly
- [ ] Download works
- [ ] Error messages display correctly
- [ ] Mobile responsive (test in DevTools)
- [ ] Keyboard navigation works (Tab through form)

## Performance

Current metrics (production build):

```
Route: /shared/[token]
Bundle Size: ~115 kB First Load JS
Components: 2 (SharedDocumentAccess, RateLimitNotification)
CSS: Scoped via CSS Modules
Code Splitting: Yes (route-based)
```

## Security Notes

✅ **What's Secure:**

- Passwords sent via POST body (not URL)
- Rate limiting prevents brute force
- Generic error messages
- CSRF-safe (no state-changing GET requests)

⚠️ **User Responsibility:**

- Users may share passwords insecurely (email, SMS)
- Share links can be forwarded
- Recommend setting expiration dates

## Next Steps

1. **Test Locally** - Follow quick test above
2. **Review Code** - Check components and services
3. **Deploy to Staging** - Test with real data
4. **Monitor** - Watch for errors in production
5. **Iterate** - Add features based on feedback

## Documentation

- **Full Migration Guide:** [DOCUMENT_SHARING_API_MIGRATION.md](DOCUMENT_SHARING_API_MIGRATION.md)
- **Architecture:** [COMPONENT_ARCHITECTURE.md](COMPONENT_ARCHITECTURE.md)
- **Feature README:** [apps/web/src/app/shared/README.md](../../apps/web/src/app/shared/README.md)

## Support

Questions? Check:

1. This quick start guide
2. Migration guide (comprehensive)
3. Component architecture (detailed diagrams)
4. Browser console for errors
5. API logs for backend issues

## Contributing

When adding features:

1. Follow existing patterns (see SharedDocumentAccess.tsx)
2. Add TypeScript types
3. Include error handling
4. Ensure accessibility
5. Update documentation
6. Write tests (future)

---

**Last Updated:** 2025-10-02
**Estimated Reading Time:** 5 minutes
**Difficulty:** Beginner
