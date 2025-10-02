import { Readable } from 'stream';

export interface StoredFile {
  bucketName: string;
  objectName: string;
  data: Buffer;
  contentType: string;
  size: number;
  uploadedAt: Date;
  etag: string;
  metadata?: Record<string, string>;
}

export class MinIOServiceMock {
  private storage: Map<string, Map<string, StoredFile>> = new Map();
  private buckets: Set<string> = new Set();

  constructor() {
    // Create default buckets
    this.buckets.add('simplepro-documents');
    this.buckets.add('simplepro-photos');
    this.buckets.add('simplepro-signatures');
    this.buckets.add('simplepro-thumbnails');

    this.storage.set('simplepro-documents', new Map());
    this.storage.set('simplepro-photos', new Map());
    this.storage.set('simplepro-signatures', new Map());
    this.storage.set('simplepro-thumbnails', new Map());
  }

  async bucketExists(bucketName: string): Promise<boolean> {
    return this.buckets.has(bucketName);
  }

  async makeBucket(bucketName: string): Promise<void> {
    if (!this.buckets.has(bucketName)) {
      this.buckets.add(bucketName);
      this.storage.set(bucketName, new Map());
    }
  }

  async putObject(
    bucketName: string,
    objectName: string,
    data: Buffer | Readable | string,
    metadata?: Record<string, string>
  ): Promise<{ etag: string }> {
    if (!this.buckets.has(bucketName)) {
      throw new Error(`Bucket ${bucketName} does not exist`);
    }

    let buffer: Buffer;

    if (data instanceof Buffer) {
      buffer = data;
    } else if (typeof data === 'string') {
      buffer = Buffer.from(data);
    } else {
      // For Readable stream, we'll convert to buffer
      const chunks: Buffer[] = [];
      for await (const chunk of data) {
        chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
      }
      buffer = Buffer.concat(chunks);
    }

    const etag = `mock_etag_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`;

    const storedFile: StoredFile = {
      bucketName,
      objectName,
      data: buffer,
      contentType: metadata?.['Content-Type'] || 'application/octet-stream',
      size: buffer.length,
      uploadedAt: new Date(),
      etag,
      metadata,
    };

    const bucketStorage = this.storage.get(bucketName);
    bucketStorage!.set(objectName, storedFile);

    return { etag };
  }

  async getObject(bucketName: string, objectName: string): Promise<Readable> {
    if (!this.buckets.has(bucketName)) {
      throw new Error(`Bucket ${bucketName} does not exist`);
    }

    const bucketStorage = this.storage.get(bucketName);
    const file = bucketStorage!.get(objectName);

    if (!file) {
      throw new Error(`Object ${objectName} not found in bucket ${bucketName}`);
    }

    // Convert Buffer to Readable stream
    const stream = new Readable();
    stream.push(file.data);
    stream.push(null);

    return stream;
  }

  async statObject(
    bucketName: string,
    objectName: string
  ): Promise<{
    size: number;
    etag: string;
    lastModified: Date;
    metaData: Record<string, string>;
  }> {
    if (!this.buckets.has(bucketName)) {
      throw new Error(`Bucket ${bucketName} does not exist`);
    }

    const bucketStorage = this.storage.get(bucketName);
    const file = bucketStorage!.get(objectName);

    if (!file) {
      throw new Error(`Object ${objectName} not found in bucket ${bucketName}`);
    }

    return {
      size: file.size,
      etag: file.etag,
      lastModified: file.uploadedAt,
      metaData: file.metadata || {},
    };
  }

  async removeObject(bucketName: string, objectName: string): Promise<void> {
    if (!this.buckets.has(bucketName)) {
      throw new Error(`Bucket ${bucketName} does not exist`);
    }

    const bucketStorage = this.storage.get(bucketName);
    bucketStorage!.delete(objectName);
  }

  async listObjects(
    bucketName: string,
    prefix?: string
  ): Promise<
    Array<{
      name: string;
      size: number;
      etag: string;
      lastModified: Date;
    }>
  > {
    if (!this.buckets.has(bucketName)) {
      throw new Error(`Bucket ${bucketName} does not exist`);
    }

    const bucketStorage = this.storage.get(bucketName);
    const objects: Array<{
      name: string;
      size: number;
      etag: string;
      lastModified: Date;
    }> = [];

    for (const [objectName, file] of bucketStorage!.entries()) {
      if (!prefix || objectName.startsWith(prefix)) {
        objects.push({
          name: objectName,
          size: file.size,
          etag: file.etag,
          lastModified: file.uploadedAt,
        });
      }
    }

    return objects;
  }

  async presignedGetObject(
    bucketName: string,
    objectName: string,
    expiry?: number
  ): Promise<string> {
    if (!this.buckets.has(bucketName)) {
      throw new Error(`Bucket ${bucketName} does not exist`);
    }

    const bucketStorage = this.storage.get(bucketName);
    const file = bucketStorage!.get(objectName);

    if (!file) {
      throw new Error(`Object ${objectName} not found in bucket ${bucketName}`);
    }

    // Generate mock presigned URL
    const expiryTime = expiry || 604800; // Default 7 days
    const expiryTimestamp = Date.now() + expiryTime * 1000;

    return `http://localhost:9000/${bucketName}/${objectName}?X-Amz-Expires=${expiryTime}&X-Amz-Signature=mocksignature&expires=${expiryTimestamp}`;
  }

  async presignedPutObject(
    bucketName: string,
    objectName: string,
    expiry?: number
  ): Promise<string> {
    if (!this.buckets.has(bucketName)) {
      throw new Error(`Bucket ${bucketName} does not exist`);
    }

    const expiryTime = expiry || 3600; // Default 1 hour
    const expiryTimestamp = Date.now() + expiryTime * 1000;

    return `http://localhost:9000/${bucketName}/${objectName}?X-Amz-Expires=${expiryTime}&X-Amz-Signature=mocksignature&expires=${expiryTimestamp}`;
  }

  // Test helpers
  getStoredFile(bucketName: string, objectName: string): StoredFile | undefined {
    const bucketStorage = this.storage.get(bucketName);
    return bucketStorage?.get(objectName);
  }

  getAllFilesInBucket(bucketName: string): StoredFile[] {
    const bucketStorage = this.storage.get(bucketName);
    return bucketStorage ? Array.from(bucketStorage.values()) : [];
  }

  getTotalStoredSize(bucketName: string): number {
    const files = this.getAllFilesInBucket(bucketName);
    return files.reduce((total, file) => total + file.size, 0);
  }

  clear() {
    for (const bucketName of this.buckets) {
      const bucketStorage = this.storage.get(bucketName);
      if (bucketStorage) {
        bucketStorage.clear();
      }
    }
  }

  clearBucket(bucketName: string) {
    const bucketStorage = this.storage.get(bucketName);
    if (bucketStorage) {
      bucketStorage.clear();
    }
  }
}

export const minioServiceMock = new MinIOServiceMock();
