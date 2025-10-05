/**
 * Mock Model Factory
 *
 * Provides reusable mock factories for Mongoose models used in tests.
 * These mocks help isolate service logic from database operations.
 */

export interface MockModel<T = any> {
  new (data: any): MockDocument<T>;
  findOne: jest.Mock;
  findById: jest.Mock;
  find: jest.Mock;
  findByIdAndUpdate: jest.Mock;
  findOneAndUpdate: jest.Mock;
  findByIdAndDelete: jest.Mock;
  findOneAndDelete: jest.Mock;
  updateMany: jest.Mock;
  updateOne: jest.Mock;
  countDocuments: jest.Mock;
  aggregate: jest.Mock;
  deleteMany: jest.Mock;
  create: jest.Mock;
  insertMany: jest.Mock;
}

export interface MockDocument extends Record<string, any> {
  _id: string;
  save: jest.Mock;
  remove: jest.Mock;
  toObject: jest.Mock;
  toJSON: jest.Mock;
}

/**
 * Creates a mock Mongoose document with standard methods
 */
export function createMockDocument<T = any>(data: Partial<T>): MockDocument<T> {
  return {
    _id: data['_id'] || 'test-id-123',
    ...data,
    save: jest.fn().mockResolvedValue({ ...data }),
    remove: jest.fn().mockResolvedValue({ ...data }),
    toObject: jest.fn().mockReturnValue({ ...data }),
    toJSON: jest.fn().mockReturnValue({ ...data }),
  } as MockDocument<T>;
}

/**
 * Creates a mock Mongoose model with standard static methods
 */
export function createMockModel<T = any>(defaultData?: Partial<T>): MockModel<T> {
  const mockConstructor: any = jest.fn().mockImplementation((data: any) => {
    return createMockDocument({ ...defaultData, ...data });
  });

  // Add standard Mongoose static methods
  mockConstructor.findOne = jest.fn();
  mockConstructor.findById = jest.fn();
  mockConstructor.find = jest.fn();
  mockConstructor.findByIdAndUpdate = jest.fn();
  mockConstructor.findOneAndUpdate = jest.fn();
  mockConstructor.findByIdAndDelete = jest.fn();
  mockConstructor.findOneAndDelete = jest.fn();
  mockConstructor.updateMany = jest.fn();
  mockConstructor.updateOne = jest.fn();
  mockConstructor.countDocuments = jest.fn();
  mockConstructor.aggregate = jest.fn();
  mockConstructor.deleteMany = jest.fn();
  mockConstructor.create = jest.fn();
  mockConstructor.insertMany = jest.fn();

  return mockConstructor as MockModel<T>;
}

/**
 * Creates a mock query chain for Mongoose
 * Useful for methods like find().sort().limit().exec()
 */
export function createMockQueryChain<T = any>(result: T): any {
  const queryChain = {
    sort: jest.fn().mockReturnThis(),
    limit: jest.fn().mockReturnThis(),
    skip: jest.fn().mockReturnThis(),
    select: jest.fn().mockReturnThis(),
    populate: jest.fn().mockReturnThis(),
    lean: jest.fn().mockReturnThis(),
    session: jest.fn().mockReturnThis(),
    exec: jest.fn().mockResolvedValue(result),
  };

  return queryChain;
}

/**
 * Helper to reset all mocks on a model
 */
export function resetModelMocks(model: MockModel): void {
  Object.keys(model).forEach((key) => {
    if (typeof model[key] === 'function' && model[key].mockReset) {
      model[key].mockReset();
    }
  });
}

/**
 * Creates a mock EventEmitter2
 */
export function createMockEventEmitter() {
  return {
    emit: jest.fn(),
    on: jest.fn(),
    once: jest.fn(),
    removeListener: jest.fn(),
    removeAllListeners: jest.fn(),
  };
}

/**
 * Creates a mock TransactionService
 */
export function createMockTransactionService() {
  return {
    withTransaction: jest.fn().mockImplementation(async (callback) => {
      const mockSession = {
        startTransaction: jest.fn(),
        commitTransaction: jest.fn(),
        abortTransaction: jest.fn(),
        endSession: jest.fn()
      };
      return callback(mockSession);
    }),
  };
}

/**
 * Creates a mock Logger
 */
export function createMockLogger() {
  return {
    log: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn(),
    verbose: jest.fn(),
  };
}
