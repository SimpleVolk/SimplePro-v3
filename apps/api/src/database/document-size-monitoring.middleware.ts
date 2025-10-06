import { PayloadTooLargeException } from '@nestjs/common';

/**
 * Document size monitoring middleware for Mongoose schemas
 * Prevents MongoDB 16MB document limit issues
 */

export interface SizeMonitoringOptions {
  maxSizeMB?: number;
  warnThresholdPercent?: number;
  logWarnings?: boolean;
  throwOnExceed?: boolean;
}

const DEFAULT_OPTIONS: Required<SizeMonitoringOptions> = {
  maxSizeMB: 10, // Conservative limit (MongoDB max is 16MB)
  warnThresholdPercent: 70, // Warn at 70% of limit
  logWarnings: true,
  throwOnExceed: true,
};

/**
 * Calculate document size in bytes
 * @param doc Document to measure
 * @returns Size in bytes
 */
function calculateDocumentSize(doc: any): number {
  try {
    const jsonString = JSON.stringify(doc.toObject ? doc.toObject() : doc);
    // Use Buffer to get accurate byte count (handles multi-byte UTF-8 characters)
    return Buffer.byteLength(jsonString, 'utf8');
  } catch (error) {
    console.error('Error calculating document size:', error);
    return 0;
  }
}

/**
 * Format bytes to human-readable size
 * @param bytes Number of bytes
 * @returns Formatted string (e.g., "2.5 MB")
 */
function formatBytes(bytes: number): string {
  const mb = bytes / (1024 * 1024);
  if (mb >= 1) {
    return `${mb.toFixed(2)} MB`;
  }
  const kb = bytes / 1024;
  if (kb >= 1) {
    return `${kb.toFixed(2)} KB`;
  }
  return `${bytes} bytes`;
}

/**
 * Create document size monitoring middleware
 * @param options Configuration options
 * @returns Mongoose pre-save middleware function
 */
export function createSizeMonitoringMiddleware(
  options: SizeMonitoringOptions = {},
) {
  const config = { ...DEFAULT_OPTIONS, ...options };
  const maxSizeBytes = config.maxSizeMB * 1024 * 1024;
  const warnSizeBytes = maxSizeBytes * (config.warnThresholdPercent / 100);

  return async function (this: any, next: Function) {
    try {
      const docSizeBytes = calculateDocumentSize(this);

      // Check if exceeds limit
      if (docSizeBytes > maxSizeBytes) {
        const errorMessage = `Document size (${formatBytes(docSizeBytes)}) exceeds limit of ${config.maxSizeMB}MB`;

        if (config.throwOnExceed) {
          throw new PayloadTooLargeException(errorMessage);
        } else if (config.logWarnings) {
          console.error(`[SIZE LIMIT EXCEEDED] ${errorMessage}`, {
            collection: this.collection?.name,
            id: this._id,
            size: formatBytes(docSizeBytes),
            limit: `${config.maxSizeMB}MB`,
          });
        }
      }

      // Check if approaching limit
      if (docSizeBytes > warnSizeBytes && config.logWarnings) {
        const percentUsed = ((docSizeBytes / maxSizeBytes) * 100).toFixed(1);
        console.warn(
          `[SIZE WARNING] Document approaching size limit: ${formatBytes(docSizeBytes)} (${percentUsed}% of ${config.maxSizeMB}MB limit)`,
          {
            collection: this.collection?.name,
            id: this._id,
            size: formatBytes(docSizeBytes),
            limit: `${config.maxSizeMB}MB`,
            percentUsed: `${percentUsed}%`,
          },
        );
      }

      next();
    } catch (error) {
      next(error as Error);
    }
  };
}

/**
 * Create array size monitoring middleware
 * Warns about unbounded arrays that could lead to document size issues
 * @param arrayFields Array field names to monitor
 * @param maxArraySize Maximum allowed array size
 * @returns Mongoose pre-save middleware function
 */
export function createArraySizeMonitoringMiddleware(
  arrayFields: string[],
  maxArraySize = 1000,
) {
  return async function (this: any, next: Function) {
    try {
      for (const fieldName of arrayFields) {
        const arrayValue = this[fieldName];

        if (Array.isArray(arrayValue) && arrayValue.length > maxArraySize) {
          const errorMessage = `Array field '${fieldName}' has ${arrayValue.length} items, exceeding limit of ${maxArraySize}. Consider separating this into a related collection.`;
          console.error(`[ARRAY SIZE EXCEEDED] ${errorMessage}`, {
            collection: this.collection?.name,
            id: this._id,
            field: fieldName,
            size: arrayValue.length,
            limit: maxArraySize,
          });

          throw new PayloadTooLargeException(errorMessage);
        }

        // Warn at 70% of limit
        const warnThreshold = maxArraySize * 0.7;
        if (Array.isArray(arrayValue) && arrayValue.length > warnThreshold) {
          const percentUsed = (
            (arrayValue.length / maxArraySize) *
            100
          ).toFixed(1);
          console.warn(
            `[ARRAY SIZE WARNING] Array '${fieldName}' approaching size limit: ${arrayValue.length} items (${percentUsed}% of ${maxArraySize} limit)`,
            {
              collection: this.collection?.name,
              id: this._id,
              field: fieldName,
              size: arrayValue.length,
              limit: maxArraySize,
              percentUsed: `${percentUsed}%`,
            },
          );
        }
      }

      next();
    } catch (error) {
      next(error as Error);
    }
  };
}

/**
 * Get document size information for analysis
 * @param doc Document to analyze
 * @returns Size information
 */
export function getDocumentSizeInfo(doc: any): {
  sizeBytes: number;
  sizeMB: number;
  formatted: string;
  percentOf16MB: number;
} {
  const sizeBytes = calculateDocumentSize(doc);
  const sizeMB = sizeBytes / (1024 * 1024);
  const mongoMaxBytes = 16 * 1024 * 1024; // MongoDB 16MB limit
  const percentOf16MB = (sizeBytes / mongoMaxBytes) * 100;

  return {
    sizeBytes,
    sizeMB,
    formatted: formatBytes(sizeBytes),
    percentOf16MB: parseFloat(percentOf16MB.toFixed(2)),
  };
}
