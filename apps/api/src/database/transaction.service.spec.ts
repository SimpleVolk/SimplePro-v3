import { Test, TestingModule } from '@nestjs/testing';
import { TransactionService } from './transaction.service';
import { Connection, ClientSession } from 'mongoose';
import { getConnectionToken } from '@nestjs/mongoose';

describe('TransactionService', () => {
  let service: TransactionService;
  let mockConnection: jest.Mocked<Connection>;
  let mockSession: jest.Mocked<ClientSession>;

  beforeEach(async () => {
    // Create mock session
    mockSession = {
      startTransaction: jest.fn(),
      commitTransaction: jest.fn().mockResolvedValue(undefined),
      abortTransaction: jest.fn().mockResolvedValue(undefined),
      endSession: jest.fn().mockResolvedValue(undefined),
      inTransaction: jest.fn().mockReturnValue(false),
    } as any;

    // Create mock connection
    mockConnection = {
      startSession: jest.fn().mockResolvedValue(mockSession),
      db: {
        admin: jest.fn().mockReturnValue({
          serverStatus: jest.fn().mockResolvedValue({
            transactions: {
              currentActive: 5,
              currentInactive: 10,
              totalStarted: 1000,
              totalCommitted: 950,
              totalAborted: 50,
            },
          }),
        }),
      },
    } as any;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TransactionService,
        {
          provide: getConnectionToken(),
          useValue: mockConnection,
        },
      ],
    }).compile();

    service = module.get<TransactionService>(TransactionService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('withTransaction', () => {
    it('should execute operation successfully and commit transaction', async () => {
      const operation = jest.fn().mockResolvedValue('test result');

      const result = await service.withTransaction(operation);

      expect(result).toBe('test result');
      expect(mockConnection.startSession).toHaveBeenCalledTimes(1);
      expect(mockSession.startTransaction).toHaveBeenCalledTimes(1);
      expect(operation).toHaveBeenCalledWith(mockSession);
      expect(mockSession.commitTransaction).toHaveBeenCalledTimes(1);
      expect(mockSession.abortTransaction).not.toHaveBeenCalled();
      expect(mockSession.endSession).toHaveBeenCalledTimes(1);
    });

    it('should abort transaction on error', async () => {
      const testError = new Error('Operation failed');
      const operation = jest.fn().mockRejectedValue(testError);

      await expect(service.withTransaction(operation)).rejects.toThrow('Operation failed');

      expect(mockSession.abortTransaction).toHaveBeenCalledTimes(1);
      expect(mockSession.commitTransaction).not.toHaveBeenCalled();
      expect(mockSession.endSession).toHaveBeenCalledTimes(1);
    });

    it('should retry on transient errors', async () => {
      const transientError = {
        message: 'Transient error',
        errorLabels: ['TransientTransactionError'],
      };
      const operation = jest
        .fn()
        .mockRejectedValueOnce(transientError)
        .mockRejectedValueOnce(transientError)
        .mockResolvedValue('success after retry');

      const result = await service.withTransaction(operation);

      expect(result).toBe('success after retry');
      expect(mockConnection.startSession).toHaveBeenCalledTimes(3); // 2 retries + 1 success
      expect(mockSession.abortTransaction).toHaveBeenCalledTimes(2); // Aborted twice
      expect(mockSession.commitTransaction).toHaveBeenCalledTimes(1); // Committed once
    });

    it('should retry on write conflict errors', async () => {
      const writeConflictError = {
        message: 'WriteConflict error',
        code: 112,
      };
      const operation = jest
        .fn()
        .mockRejectedValueOnce(writeConflictError)
        .mockResolvedValue('success after retry');

      const result = await service.withTransaction(operation);

      expect(result).toBe('success after retry');
      expect(mockConnection.startSession).toHaveBeenCalledTimes(2);
    });

    it('should fail after max retries for transient errors', async () => {
      const transientError = {
        message: 'Persistent transient error',
        errorLabels: ['TransientTransactionError'],
      };
      const operation = jest.fn().mockRejectedValue(transientError);

      await expect(service.withTransaction(operation, undefined, 3)).rejects.toEqual(
        transientError,
      );

      expect(mockConnection.startSession).toHaveBeenCalledTimes(3);
      expect(mockSession.abortTransaction).toHaveBeenCalledTimes(3);
      expect(mockSession.commitTransaction).not.toHaveBeenCalled();
    });

    it('should not retry on non-transient errors', async () => {
      const nonTransientError = new Error('Validation error');
      const operation = jest.fn().mockRejectedValue(nonTransientError);

      await expect(service.withTransaction(operation)).rejects.toThrow('Validation error');

      expect(mockConnection.startSession).toHaveBeenCalledTimes(1);
      expect(mockSession.abortTransaction).toHaveBeenCalledTimes(1);
    });

    it('should use custom transaction options', async () => {
      const customOptions = {
        readPreference: 'primaryPreferred' as any,
        maxCommitTimeMS: 5000,
      };
      const operation = jest.fn().mockResolvedValue('result');

      await service.withTransaction(operation, customOptions);

      expect(mockSession.startTransaction).toHaveBeenCalledWith(
        expect.objectContaining(customOptions),
      );
    });

    it('should handle abort errors gracefully', async () => {
      const operationError = new Error('Operation failed');
      const abortError = new Error('Abort failed');
      const operation = jest.fn().mockRejectedValue(operationError);
      mockSession.abortTransaction.mockRejectedValueOnce(abortError);

      await expect(service.withTransaction(operation)).rejects.toThrow('Operation failed');

      expect(mockSession.abortTransaction).toHaveBeenCalled();
      expect(mockSession.endSession).toHaveBeenCalled();
    });
  });

  describe('startSession', () => {
    it('should create a new session', async () => {
      const session = await service.startSession();

      expect(session).toBe(mockSession);
      expect(mockConnection.startSession).toHaveBeenCalledTimes(1);
    });
  });

  describe('getTransactionStats', () => {
    it('should return transaction statistics', async () => {
      const stats = await service.getTransactionStats();

      expect(stats).toEqual({
        currentActive: 5,
        currentInactive: 10,
        totalStarted: 1000,
        totalCommitted: 950,
        totalAborted: 50,
      });
    });

    it('should return null on error', async () => {
      const adminMock = mockConnection.db.admin() as any;
      adminMock.serverStatus.mockRejectedValueOnce(new Error('Stats unavailable'));

      const stats = await service.getTransactionStats();

      expect(stats).toBeNull();
    });
  });

  describe('error classification', () => {
    it('should identify TransientTransactionError', async () => {
      const error = {
        errorLabels: ['TransientTransactionError'],
      };
      const operation = jest.fn().mockRejectedValueOnce(error).mockResolvedValue('success');

      await service.withTransaction(operation);

      expect(mockConnection.startSession).toHaveBeenCalledTimes(2);
    });

    it('should identify UnknownTransactionCommitResult', async () => {
      const error = {
        errorLabels: ['UnknownTransactionCommitResult'],
      };
      const operation = jest.fn().mockRejectedValueOnce(error).mockResolvedValue('success');

      await service.withTransaction(operation);

      expect(mockConnection.startSession).toHaveBeenCalledTimes(2);
    });

    it('should identify snapshot errors', async () => {
      const error = {
        code: 246,
        message: 'SnapshotUnavailable',
      };
      const operation = jest.fn().mockRejectedValueOnce(error).mockResolvedValue('success');

      await service.withTransaction(operation);

      expect(mockConnection.startSession).toHaveBeenCalledTimes(2);
    });

    it('should identify lock timeout errors', async () => {
      const error = {
        code: 50,
        message: 'LockTimeout',
      };
      const operation = jest.fn().mockRejectedValueOnce(error).mockResolvedValue('success');

      await service.withTransaction(operation);

      expect(mockConnection.startSession).toHaveBeenCalledTimes(2);
    });
  });

  describe('exponential backoff', () => {
    it('should apply increasing backoff delays', async () => {
      const transientError = {
        errorLabels: ['TransientTransactionError'],
      };
      const operation = jest
        .fn()
        .mockRejectedValueOnce(transientError)
        .mockRejectedValueOnce(transientError)
        .mockResolvedValue('success');

      const startTime = Date.now();
      await service.withTransaction(operation);
      const duration = Date.now() - startTime;

      // Should have at least 100ms + 200ms = 300ms backoff
      expect(duration).toBeGreaterThanOrEqual(200);
    });
  });
});
