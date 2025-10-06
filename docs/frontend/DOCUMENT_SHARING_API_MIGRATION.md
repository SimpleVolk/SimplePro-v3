# Document Sharing API Migration Guide

**Date:** 2025-10-02
**Sprint:** Sprint 1 Week 1
**Status:** ✅ Complete

## Overview

This document describes the security improvements made to the document sharing API and the frontend changes required to support the new secure access pattern.

## What Changed

### Backend API Changes

**Before (Insecure):**

```http
GET /api/documents/shared/:token?password=secret
```

- Password sent as URL query parameter
- Visible in browser history, logs, and referrer headers
- Security vulnerability

**After (Secure):**

```http
POST /api/documents/shared/:token/access
Content-Type: application/json

{
  "password": "secret"
}
```

- Password sent in request body
- Not visible in logs or browser history
- Includes rate limiting (6 attempts per 5 minutes)
- Returns 429 status with Retry-After header when rate limited

### Frontend Changes

**New Components Created:**

1. **SharedDocumentAccess** (`apps/web/src/app/components/documents/SharedDocumentAccess.tsx`)
   - Main component for accessing shared documents
   - Handles password-protected and public documents
   - Displays document information and download button
   - Full error handling and accessibility support

2. **RateLimitNotification** (`apps/web/src/app/components/documents/RateLimitNotification.tsx`)
   - Shows rate limit warnings with countdown timer
   - Visual progress bar
   - Auto-dismisses when limit expires

3. **Document Service** (`apps/web/src/services/documents.service.ts`)
   - Centralized API client for document operations
   - `accessSharedDocument(token, password)` - Access password-protected docs
   - `accessPublicDocument(token)` - Access public docs
   - `downloadDocument(url, filename)` - Download helper
   - Proper error handling with custom error classes

**New Types Added:**

```typescript
// apps/web/src/app/components/documents/types.ts

export interface AccessSharedDocumentRequest {
  password: string;
}

export interface AccessSharedDocumentResponse {
  documentUrl: string;
  expiresAt?: string;
  documentName: string;
  documentType: string;
  mimeType: string;
  size: number;
}

export class RateLimitError extends Error {
  constructor(public retryAfter: string | null);
}

export class DocumentAccessError extends Error {
  constructor(public statusCode: number, message?: string);
}
```

**New Route Created:**

- `/shared/[token]` - Public route for accessing shared documents
- File: `apps/web/src/app/shared/[token]/page.tsx`

## Breaking Changes

### For Frontend Developers

**None** - This is a new feature. No existing frontend code was calling the shared document API.

### For Users Sharing Documents

**None** - The share link generation (in `ShareDialog.tsx`) remains unchanged. Only the access/consumption side is new.

## Components Updated

### New Components

| Component                  | Location                                                          | Purpose                      |
| -------------------------- | ----------------------------------------------------------------- | ---------------------------- |
| `SharedDocumentAccess`     | `apps/web/src/app/components/documents/SharedDocumentAccess.tsx`  | Main public access component |
| `RateLimitNotification`    | `apps/web/src/app/components/documents/RateLimitNotification.tsx` | Rate limit feedback UI       |
| `documents.service.ts`     | `apps/web/src/services/documents.service.ts`                      | API client service layer     |
| `/shared/[token]/page.tsx` | `apps/web/src/app/shared/[token]/page.tsx`                        | Public access route          |

### Existing Components (No Changes Required)

| Component                | Status        | Notes                             |
| ------------------------ | ------------- | --------------------------------- |
| `ShareDialog.tsx`        | ✅ No changes | Generates share links (unchanged) |
| `DocumentManagement.tsx` | ✅ No changes | Internal document management      |
| `DocumentViewer.tsx`     | ✅ No changes | Authenticated document viewing    |

## How to Test

### 1. Generate a Share Link

1. Login to SimplePro Web (`http://localhost:3009`)
2. Navigate to Documents page
3. Upload a document or select existing one
4. Click the Share button (🔗)
5. In the ShareDialog:
   - Set password protection (toggle on)
   - Enter password: `Test123!`
   - Click "Generate Link"
6. Copy the generated link (e.g., `http://localhost:3009/shared/abc123token`)

### 2. Test Public Access (No Password)

1. Generate a share link WITHOUT password protection
2. Open the link in an incognito/private browser window
3. Document should load immediately without password prompt
4. Click "Download Document" to verify download works

### 3. Test Password-Protected Access

1. Generate a share link WITH password protection
2. Open the link in an incognito/private browser window
3. You should see the password input form
4. Enter the correct password
5. Document information should display
6. Click "Download Document" to verify download

### 4. Test Rate Limiting

1. Open a password-protected share link
2. Enter incorrect password and submit
3. Repeat 5 more times (total 6 attempts)
4. On the 7th attempt, you should see:
   - RateLimitNotification component
   - Countdown timer showing time remaining
   - Progress bar
   - "Too Many Attempts" message
5. Wait for timer to expire (or click dismiss)
6. Try again with correct password

### 5. Test Error Scenarios

**Invalid Token:**

```
http://localhost:3009/shared/invalid-token-12345
```

Expected: "Document not found or link has expired"

**Expired Link:**

1. Generate link with expiration date in the past (modify backend or database)
2. Access the link
3. Expected: "This share link has expired"

### 6. Mobile Testing

1. Open share link on mobile device
2. Verify:
   - Form is responsive
   - Inputs are touch-friendly
   - Password visibility toggle works
   - Submit button is accessible
   - Error messages are readable

### 7. Accessibility Testing

**Keyboard Navigation:**

1. Open share link
2. Use Tab key to navigate through form
3. Verify focus indicators are visible
4. Press Enter to submit form
5. Verify all interactive elements are reachable

**Screen Reader Testing:**

1. Enable screen reader (NVDA, JAWS, VoiceOver)
2. Navigate through the form
3. Verify all labels are read correctly
4. Verify error messages are announced
5. Verify form validation messages are clear

## Troubleshooting

### Issue: "Failed to access document" Error

**Possible Causes:**

1. API server not running
2. CORS issue
3. Invalid token

**Solutions:**

1. Verify API is running: `npm run dev:api`
2. Check API URL in `.env.local`: `NEXT_PUBLIC_API_URL=http://localhost:3001`
3. Check browser console for detailed error messages

### Issue: Rate Limit Not Clearing

**Possible Cause:** Redis cache not clearing properly

**Solution:**

1. Check Redis is running: `docker ps | grep redis`
2. Restart Redis: `npm run docker:dev:down && npm run docker:dev`
3. Wait for TTL to expire (default 5 minutes)

### Issue: Download Not Working

**Possible Causes:**

1. Presigned URL expired
2. MinIO not running
3. CORS issue with MinIO

**Solutions:**

1. Check MinIO is running: `docker ps | grep minio`
2. Access MinIO console: `http://localhost:9001`
3. Verify document exists in bucket
4. Check MinIO CORS configuration in backend

### Issue: Styling Issues

**Possible Cause:** CSS modules not loading

**Solutions:**

1. Restart Next.js dev server
2. Clear `.next` cache: `rm -rf apps/web/.next`
3. Rebuild: `npm run build`

## Security Considerations

### What's Improved

✅ **Password Security:** Passwords no longer appear in URLs
✅ **Rate Limiting:** Prevents brute force attacks (6 attempts per 5 minutes)
✅ **Audit Trail:** All access attempts logged on backend
✅ **Error Messages:** Generic messages prevent information disclosure

### Best Practices for Users

1. **Use Strong Passwords:** Recommend 12+ characters with mix of types
2. **Set Expiration Dates:** Especially for sensitive documents
3. **Monitor Access Count:** Check share history for unusual activity
4. **Revoke Links:** Delete share links when no longer needed

### Developer Notes

- Always use HTTPS in production
- Configure rate limiting based on use case
- Implement additional logging for security events
- Consider adding CAPTCHA for repeated failed attempts
- Monitor Redis for rate limit bypass attempts

## Performance Considerations

### Client-Side

- **Lazy Loading:** Components use dynamic imports where possible
- **Code Splitting:** Route-based splitting via Next.js App Router
- **Asset Optimization:** CSS modules minimize bundle size

### Server-Side

- **Rate Limiting:** Redis-based, scales horizontally
- **Presigned URLs:** Offloads download traffic to MinIO
- **Caching:** Document metadata cached for faster response

## Future Enhancements

### Planned (Not Yet Implemented)

- [ ] Email notification on access (configurable)
- [ ] Two-factor authentication option
- [ ] Watermarking for sensitive documents
- [ ] Access analytics dashboard
- [ ] Bulk share link management
- [ ] QR code generation for share links
- [ ] Time-based access windows (e.g., only accessible during business hours)

### Under Consideration

- [ ] Link password reset via email
- [ ] Share link templates with default settings
- [ ] Integration with external storage providers
- [ ] Document preview without download
- [ ] Collaborative access (multiple users)

## Related Documentation

- [Sprint 1 Week 1 Summary](../sprints/sprint-1-week-1.md)
- [API Documentation](../api/documents.md)
- [Security Guidelines](../security/guidelines.md)
- [Testing Strategy](../testing/frontend-testing.md)

## Change History

| Date       | Version | Changes                                   | Author      |
| ---------- | ------- | ----------------------------------------- | ----------- |
| 2025-10-02 | 1.0.0   | Initial migration, new components created | Claude Code |

## Support

For questions or issues:

1. Check this documentation first
2. Review backend API documentation
3. Check browser console for errors
4. Contact development team with:
   - Share token (if safe to share)
   - Error messages from console
   - Steps to reproduce
   - Browser and OS version
