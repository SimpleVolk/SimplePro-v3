# MongoDB Transactions in SimplePro-v3

## Overview

This document describes the implementation and usage of MongoDB transactions in SimplePro-v3 to ensure data consistency across multi-document operations.

## What Are Transactions?

MongoDB transactions provide ACID (Atomicity, Consistency, Isolation, Durability) guarantees across multiple document operations. All operations in a transaction succeed or fail together - there is no partial completion.

## When to Use Transactions

### ✅ DO Use Transactions For:

1. **Multi-Document Updates** - Operations that modify multiple collections
   - Example: Creating a job from an opportunity (updates both collections)
   - Example: Deleting a customer with cascading deletes (jobs, opportunities, documents)

2. **Financial Operations** - Money-related changes requiring consistency
   - Example: Processing payments with invoice updates
   - Example: Refunds with job status changes

3. **State Transitions** - Complex state changes across entities
   - Example: Updating job status with crew notifications
   - Example: Converting opportunity to won status with analytics tracking

4. **Audit Trail Requirements** - Operations needing complete tracking
   - Example: Bulk notification updates with audit logs
   - Example: Customer data deletion with compliance logging

### ❌ DON'T Use Transactions For:

1. **Single Document Operations** - MongoDB operations are already atomic
   - Example: Updating a customer name
   - Example: Adding a note to a job

2. **Read-Only Operations** - No data consistency issues
   - Example: Fetching customer list
   - Example: Getting job statistics

3. **Long-Running Operations** - Transactions should complete in < 100ms
   - Example: File uploads
   - Example: External API calls

4. **Fire-and-Forget Operations** - Non-critical background tasks
   - Example: Sending real-time notifications
   - Example: Updating cache

## How to Use TransactionService

### Basic Usage

```typescript
import { TransactionService } from '../database/transaction.service';

@Injectable()
export class MyService {
  constructor(
    @InjectModel(Model1.name) private model1: Model<Doc1>,
    @InjectModel(Model2.name) private model2: Model<Doc2>,
    private transactionService: TransactionService,
  ) {}

  async myTransactionalOperation(data: any): Promise<Result> {
    return this.transactionService.withTransaction(async (session) => {
      // 1. All database operations must use the session
      const doc1 = await this.model1.create([data], { session });

      // 2. Updates also need the session
      await this.model2.updateOne(
        { _id: someId },
        { $set: updates },
        { session },
      );

      // 3. Find operations can use session too
      const result = await this.model1.findById(id).session(session).exec();

      // 4. Return the final result
      return result;
    });
  }
}
```

### Advanced Usage with Custom Options

```typescript
async myCustomTransaction(): Promise<void> {
  return this.transactionService.withTransaction(
    async (session) => {
      // Your operations here
    },
    {
      // Custom transaction options
      readPreference: 'primaryPreferred',
      maxCommitTimeMS: 5000,
    },
    5 // Custom max retries (default is 3)
  );
}
```

### Manual Session Control

For fine-grained control, you can manage sessions manually:

```typescript
async manualTransactionControl(): Promise<void> {
  const session = await this.transactionService.startSession();

  try {
    session.startTransaction();

    await this.model1.create([data], { session });
    await this.model2.updateOne(query, update, { session });

    await session.commitTransaction();
  } catch (error) {
    await session.abortTransaction();
    throw error;
  } finally {
    await session.endSession();
  }
}
```

## Implemented Transactional Methods

### JobsService

#### `updateStatus(id, status, updatedBy)`

**Purpose**: Update job status atomically
**Operations**:

1. Update job status and timestamps
2. Schedule real-time notifications (after commit)

**Why Transaction?**: Ensures job state is consistent even if notification scheduling fails.

### CustomersService

#### `remove(id)`

**Purpose**: Delete customer with cascading cleanup
**Operations**:

1. Delete all customer jobs
2. Delete all customer opportunities
3. Archive all customer documents
4. Delete customer record

**Why Transaction?**: Prevents orphaned data if any delete operation fails.

### OpportunitiesService

#### `markAsWon(opportunityId, jobId, userId)`

**Purpose**: Convert opportunity to won status
**Operations**:

1. Update opportunity status to 'won'
2. Link opportunity to job
3. Emit conversion event (after commit)

**Why Transaction?**: Ensures opportunity conversion is atomic and trackable.

### NotificationsService

#### `markAllAsRead(userId)`

**Purpose**: Mark all notifications as read for a user
**Operations**:

1. Find all unread notifications
2. Update all to read status
3. Set readAt timestamp

**Why Transaction?**: Ensures analytics accuracy and prevents partial updates.

## Automatic Retry Logic

The TransactionService automatically retries transient errors:

### Retryable Errors

- `TransientTransactionError` - Temporary network or server issues
- `UnknownTransactionCommitResult` - Commit status uncertain
- `WriteConflict` (code 112) - Concurrent modification detected
- `SnapshotUnavailable` (code 246) - Read snapshot not available
- `LockTimeout` (code 50) - Lock acquisition timeout

### Retry Strategy

- **Max Retries**: 3 attempts (configurable)
- **Backoff**: Exponential (100ms → 200ms → 400ms)
- **Max Backoff**: 1 second

### Non-Retryable Errors

- Validation errors
- Not found errors
- Business logic errors

These fail immediately without retry.

## Performance Considerations

### Best Practices

1. **Keep Transactions Short** - Aim for < 100ms execution time

   ```typescript
   // ✅ Good - Quick operations only
   await this.transactionService.withTransaction(async (session) => {
     await this.model.create([data], { session });
     await this.otherModel.updateOne(query, update, { session });
   });

   // ❌ Bad - Includes slow external call
   await this.transactionService.withTransaction(async (session) => {
     await this.model.create([data], { session });
     await this.externalApiCall(); // Slow!
   });
   ```

2. **Minimize Document Count** - Fewer documents = faster commits

   ```typescript
   // ✅ Good - Update specific documents
   await model.updateMany({ userId, isRead: false }, updates, { session });

   // ❌ Bad - Update all documents
   await model.updateMany({}, updates, { session });
   ```

3. **Use Proper Indexes** - Ensure queries are indexed

   ```typescript
   // ✅ Good - userId is indexed
   await model.find({ userId: id }).session(session);

   // ❌ Bad - unindexed field causes collection scan
   await model.find({ randomField: value }).session(session);
   ```

4. **Schedule Side Effects After Commit** - Don't include in transaction

   ```typescript
   await this.transactionService.withTransaction(async (session) => {
     const result = await this.model.create([data], { session });

     // Schedule notification after transaction commits
     setImmediate(() => {
       this.notificationService.send(result);
     });

     return result;
   });
   ```

### Performance Monitoring

Get transaction statistics:

```typescript
const stats = await this.transactionService.getTransactionStats();
console.log('Transaction Stats:', stats);
// Output:
// {
//   currentActive: 2,
//   currentInactive: 5,
//   totalStarted: 1000,
//   totalCommitted: 950,
//   totalAborted: 50
// }
```

## Error Handling

### Categorizing Errors

```typescript
import { TransactionErrorHandler } from '../database/transaction-error.handler';

try {
  await this.transactionService.withTransaction(operation);
} catch (error) {
  const category = TransactionErrorHandler.handleError(error, 'MyOperation');
  const userMessage = TransactionErrorHandler.formatUserError(error, category);

  throw new HttpException(userMessage, HttpStatus.INTERNAL_SERVER_ERROR);
}
```

### Error Categories

- **transient** - Temporary errors, will retry
- **write_conflict** - Concurrent modification, will retry
- **timeout** - Operation took too long
- **validation** - Data validation failed
- **other** - Unexpected errors

### Getting Error Statistics

```typescript
const errorStats = TransactionErrorHandler.getErrorStats();
console.log('Error Stats:', errorStats);
// Output:
// {
//   transient: 10,
//   writeConflict: 5,
//   timeout: 2,
//   validation: 3,
//   other: 1
// }
```

## Common Pitfalls

### 1. Forgetting to Pass Session

```typescript
// ❌ Wrong - Operation not in transaction
await this.transactionService.withTransaction(async (session) => {
  await this.model.create([data]); // Missing { session }
});

// ✅ Correct - Session passed to all operations
await this.transactionService.withTransaction(async (session) => {
  await this.model.create([data], { session });
});
```

### 2. Including External API Calls

```typescript
// ❌ Wrong - External calls in transaction
await this.transactionService.withTransaction(async (session) => {
  await this.model.create([data], { session });
  await axios.post('https://api.example.com', data); // Don't do this!
});

// ✅ Correct - External calls after transaction
const result = await this.transactionService.withTransaction(
  async (session) => {
    return await this.model.create([data], { session });
  },
);
await axios.post('https://api.example.com', result); // Call after commit
```

### 3. Not Handling Errors

```typescript
// ❌ Wrong - Silent failure
await this.transactionService
  .withTransaction(async (session) => {
    // ... operations
  })
  .catch(() => {}); // Swallowing errors!

// ✅ Correct - Proper error handling
try {
  await this.transactionService.withTransaction(async (session) => {
    // ... operations
  });
} catch (error) {
  this.logger.error('Transaction failed:', error);
  throw error; // Re-throw for controller to handle
}
```

### 4. Nesting Transactions

```typescript
// ❌ Wrong - MongoDB doesn't support nested transactions
await this.transactionService.withTransaction(async (session1) => {
  await this.transactionService.withTransaction(async (session2) => {
    // This will fail!
  });
});

// ✅ Correct - Single transaction for all operations
await this.transactionService.withTransaction(async (session) => {
  await this.operation1(session);
  await this.operation2(session);
});
```

## Testing Transactional Code

### Unit Testing

```typescript
describe('MyService', () => {
  let service: MyService;
  let mockTransactionService: jest.Mocked<TransactionService>;

  beforeEach(() => {
    mockTransactionService = {
      withTransaction: jest.fn((operation) => operation(mockSession)),
    } as any;

    // ... create testing module with mock
  });

  it('should use transaction for multi-document operation', async () => {
    await service.myMethod();

    expect(mockTransactionService.withTransaction).toHaveBeenCalled();
  });
});
```

### Integration Testing

```typescript
describe('MyService Integration', () => {
  it('should rollback on error', async () => {
    const service = app.get(MyService);

    await expect(service.failingOperation()).rejects.toThrow();

    // Verify rollback - no changes should persist
    const count = await model.countDocuments();
    expect(count).toBe(0);
  });
});
```

## Monitoring and Observability

### Logging

All transaction operations are automatically logged:

```
[TransactionService] Starting transaction attempt 1/3
[TransactionService] Transaction committed successfully on attempt 1 (duration: 45ms)
```

Failed transactions log warnings:

```
[TransactionService] Transaction attempt 1/3 failed: WriteConflict
[TransactionService] Retrying transaction after 100ms backoff
```

### Metrics

Use the transaction stats endpoint for monitoring:

```typescript
@Get('health/transactions')
async getTransactionHealth() {
  return this.transactionService.getTransactionStats();
}
```

## Database Configuration

### Required Settings

Transactions require specific MongoDB configuration:

```typescript
// apps/api/src/database/database.module.ts
MongooseModule.forRoot(uri, {
  // Required for transactions
  retryWrites: true,
  writeConcern: {
    w: 'majority',
    j: true,
  },
  readPreference: 'primary', // or 'primaryPreferred'
  readConcern: { level: 'majority' },
});
```

### Replica Set Requirement

**Important**: Transactions require a MongoDB replica set. For development:

```yaml
# docker-compose.dev.yml
services:
  mongodb:
    image: mongo:7.0
    command: --replSet rs0
    # ... other config
```

Initialize replica set:

```bash
docker exec -it simplepro-mongodb-dev mongosh --eval "rs.initiate()"
```

## Summary

- ✅ Use transactions for multi-document operations requiring consistency
- ✅ Keep transactions short (< 100ms target)
- ✅ Pass session to all database operations
- ✅ Schedule side effects (notifications, etc.) after commit
- ✅ Let automatic retry handle transient errors
- ❌ Don't use for single-document operations
- ❌ Don't include external API calls in transactions
- ❌ Don't nest transactions
- ❌ Don't forget error handling

## Additional Resources

- [MongoDB Transactions Documentation](https://docs.mongodb.com/manual/core/transactions/)
- [Mongoose Transactions Guide](https://mongoosejs.com/docs/transactions.html)
- [TransactionService Source Code](../apps/api/src/database/transaction.service.ts)
- [Transaction Error Handler](../apps/api/src/database/transaction-error.handler.ts)
