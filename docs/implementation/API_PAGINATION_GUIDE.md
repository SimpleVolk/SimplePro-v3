# SimplePro-v3 API Pagination Guide

## Quick Start

All list endpoints now support pagination with the following query parameters:

- `page`: Page number (default: 1, minimum: 1)
- `limit`: Items per page (default: 20, minimum: 1, maximum: 100)

## Paginated Endpoints

### Customers

- **GET** `/api/customers?page=1&limit=20`
- Supports all existing filters (status, type, source, etc.)
- Example: `/api/customers?status=active&type=residential&page=2&limit=50`

### Jobs

- **GET** `/api/jobs?page=1&limit=20`
- Supports all existing filters (status, type, priority, etc.)
- Example: `/api/jobs?status=scheduled&priority=high&page=1&limit=30`

### Analytics Events

- **GET** `/api/analytics/events/type/:eventType?page=1&limit=20`
- **GET** `/api/analytics/events/category/:category?page=1&limit=20`
- Requires `startDate` and `endDate` parameters
- Example: `/api/analytics/events/type/job_created?startDate=2025-01-01&endDate=2025-12-31&page=1&limit=50`

### Reports

- **GET** `/api/analytics/reports?page=1&limit=20`
- Already implemented (existing feature)

## Response Format

All paginated responses follow this consistent format:

```json
{
  "success": true,
  "customers": [...], // or "jobs", "events", etc.
  "count": 20,        // Items in current page
  "pagination": {
    "page": 1,        // Current page number
    "limit": 20,      // Items per page
    "total": 150,     // Total items matching query
    "totalPages": 8   // Total number of pages
  }
}
```

## Client Implementation Examples

### JavaScript/TypeScript

```typescript
async function fetchCustomers(page = 1, limit = 20) {
  const response = await fetch(`/api/customers?page=${page}&limit=${limit}`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  const data = await response.json();

  return {
    customers: data.customers,
    currentPage: data.pagination.page,
    totalPages: data.pagination.totalPages,
    totalItems: data.pagination.total,
  };
}
```

### React Hook Example

```typescript
import { useState, useEffect } from 'react';

function useCustomers(page = 1, limit = 20, filters = {}) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const queryParams = new URLSearchParams({
          page: page.toString(),
          limit: limit.toString(),
          ...filters,
        });

        const response = await fetch(`/api/customers?${queryParams}`, {
          headers: { Authorization: `Bearer ${token}` },
        });

        const result = await response.json();
        setData(result);
      } catch (err) {
        setError(err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [page, limit, filters]);

  return { data, loading, error };
}
```

### Pagination Component Example

```typescript
interface PaginationProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
}

function Pagination({ currentPage, totalPages, onPageChange }: PaginationProps) {
  return (
    <div className="pagination">
      <button
        onClick={() => onPageChange(currentPage - 1)}
        disabled={currentPage === 1}
      >
        Previous
      </button>

      <span>Page {currentPage} of {totalPages}</span>

      <button
        onClick={() => onPageChange(currentPage + 1)}
        disabled={currentPage === totalPages}
      >
        Next
      </button>
    </div>
  );
}
```

## Best Practices

### 1. Use Appropriate Page Sizes

- Small lists: 10-20 items
- Standard lists: 20-50 items
- Large data tables: 50-100 items
- Never exceed 100 items (API enforces this)

### 2. Handle Empty Results

```typescript
if (data.pagination.total === 0) {
  // Show "no results" message
}
```

### 3. Handle Page Out of Bounds

```typescript
if (page > data.pagination.totalPages && data.pagination.totalPages > 0) {
  // Redirect to last valid page
  onPageChange(data.pagination.totalPages);
}
```

### 4. Preserve Filters Across Pages

```typescript
const [filters, setFilters] = useState({ status: 'active' });
const [page, setPage] = useState(1);

// When filters change, reset to page 1
useEffect(() => {
  setPage(1);
}, [filters]);
```

### 5. Show Total Count to Users

```typescript
<div>
  Showing {((page - 1) * limit) + 1} to {Math.min(page * limit, total)} of {total} results
</div>
```

## Performance Tips

1. **Cache Results**: Consider caching paginated results client-side
2. **Prefetch Next Page**: Improve UX by prefetching the next page in background
3. **Optimistic UI**: Update page number immediately, load data in background
4. **Use Proper Limits**: Smaller page sizes = faster responses
5. **Combine with Filters**: Reduce total dataset before pagination

## Error Handling

### Invalid Page Number

```typescript
// API will return empty array if page > totalPages
// Client should check and handle:
if (data.customers.length === 0 && page > 1) {
  // Redirect to page 1 or show error
}
```

### Invalid Limit

```typescript
// Values > 100 are automatically capped to 100
// Values < 1 default to 20
// Client should validate before sending:
const validLimit = Math.min(Math.max(userLimit, 1), 100);
```

## Migration from Non-Paginated Endpoints

### Old Code (No Pagination)

```typescript
const response = await fetch('/api/customers');
const { customers } = await response.json();
```

### New Code (With Pagination)

```typescript
// Still works! Defaults to page 1, limit 20
const response = await fetch('/api/customers');
const { customers, pagination } = await response.json();

// Or explicitly paginate
const response = await fetch('/api/customers?page=1&limit=50');
const { customers, pagination } = await response.json();
```

## Testing Checklist

- [ ] Test with page=1, limit=20 (default)
- [ ] Test with custom page size (e.g., limit=50)
- [ ] Test with page beyond total pages
- [ ] Test with limit > 100 (should cap at 100)
- [ ] Test with invalid page numbers (0, negative)
- [ ] Test pagination with filters applied
- [ ] Test with empty result sets
- [ ] Test with single-page results
- [ ] Verify total count accuracy
- [ ] Verify totalPages calculation

## Support

For issues or questions about pagination:

1. Check this guide
2. Review `PAGINATION_IMPLEMENTATION.md` for technical details
3. Check API response for error messages
4. Verify authentication token is valid
