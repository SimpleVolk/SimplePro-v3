import {
  Injectable,
  Logger,
  OnModuleInit,
  InternalServerErrorException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as Minio from 'minio';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class MinioService implements OnModuleInit {
  private readonly logger = new Logger(MinioService.name);
  private minioClient: Minio.Client;
  private readonly bucket: string;

  constructor(private readonly configService: ConfigService) {
    const endpoint = this.configService.get<string>('MINIO_ENDPOINT', 'minio');
    const port = this.configService.get<number>('MINIO_PORT', 9000);

    // SECURITY FIX: Enforce strong credentials in production
    // Get credentials from config, falling back to dev defaults only in non-production
    const accessKey = this.configService.get<string>('MINIO_ACCESS_KEY') ??
      (process.env.NODE_ENV !== 'production' ? 'admin' : undefined);
    const secretKey = this.configService.get<string>('MINIO_SECRET_KEY') ??
      (process.env.NODE_ENV !== 'production' ? 'simplepro_minio_2024' : undefined);

    // SECURITY FIX: Validate credentials in production
    if (process.env.NODE_ENV === 'production') {
      if (!accessKey || !secretKey) {
        throw new Error(
          'MINIO_ACCESS_KEY and MINIO_SECRET_KEY are required in production. Generate with: openssl rand -base64 32',
        );
      }
      if (secretKey.length < 32) {
        throw new Error(
          'MINIO_SECRET_KEY must be at least 32 characters in production for security',
        );
      }
    }

    const useSSL = this.configService.get<string>('MINIO_USE_SSL', 'false') === 'true';
    this.bucket = this.configService.get<string>(
      'MINIO_BUCKET',
      'simplepro-documents',
    );

    // At this point, credentials are guaranteed to exist (either from env or dev defaults)
    if (!accessKey || !secretKey) {
      throw new Error('MinIO credentials are required');
    }

    this.minioClient = new Minio.Client({
      endPoint: endpoint,
      port: port,
      useSSL: useSSL,
      accessKey: accessKey,
      secretKey: secretKey,
    });

    this.logger.log(
      `MinIO client initialized: ${endpoint}:${port}, bucket: ${this.bucket}`,
    );
  }

  async onModuleInit() {
    await this.ensureBucketExists();
  }

  /**
   * Ensure the bucket exists, create it if not
   */
  private async ensureBucketExists(): Promise<void> {
    try {
      const exists = await this.minioClient.bucketExists(this.bucket);
      if (!exists) {
        await this.minioClient.makeBucket(this.bucket, 'us-east-1');
        this.logger.log(`Bucket created: ${this.bucket}`);
      } else {
        this.logger.log(`Bucket already exists: ${this.bucket}`);
      }
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);

      const errorStack = error instanceof Error ? error.stack : undefined;

      this.logger.error(
        `Error ensuring bucket exists: ${errorMessage}`,
        errorStack,
      );
      throw new InternalServerErrorException(
        'Failed to initialize MinIO storage',
      );
    }
  }

  /**
   * Generate a unique storage key with sanitized filename
   */
  private generateStorageKey(originalFilename: string): string {
    const timestamp = Date.now();
    const uuid = uuidv4();
    const sanitizedFilename = this.sanitizeFilename(originalFilename);
    const extension = this.getFileExtension(sanitizedFilename);

    // Format: YYYY/MM/UUID-timestamp.ext
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');

    return `${year}/${month}/${uuid}-${timestamp}${extension}`;
  }

  /**
   * Sanitize filename to prevent path traversal and other security issues
   */
  private sanitizeFilename(filename: string): string {
    return filename
      .replace(/[^a-zA-Z0-9._-]/g, '_') // Replace non-alphanumeric chars except dots, hyphens, underscores
      .replace(/\.{2,}/g, '_') // Replace multiple dots
      .replace(/^\.+/, '') // Remove leading dots
      .substring(0, 255); // Limit length
  }

  /**
   * Get file extension from filename
   */
  private getFileExtension(filename: string): string {
    const lastDot = filename.lastIndexOf('.');
    return lastDot !== -1 ? filename.substring(lastDot) : '';
  }

  /**
   * Upload a file to MinIO
   * @param file Buffer containing file data
   * @param originalFilename Original filename
   * @param mimeType MIME type of the file
   * @returns Storage key of the uploaded file
   */
  async uploadFile(
    file: Buffer,
    originalFilename: string,
    mimeType: string,
  ): Promise<string> {
    try {
      const storageKey = this.generateStorageKey(originalFilename);

      const metadata = {
        'Content-Type': mimeType,
        'X-Original-Filename': originalFilename,
      };

      await this.minioClient.putObject(
        this.bucket,
        storageKey,
        file,
        file.length,
        metadata,
      );

      this.logger.log(`File uploaded: ${storageKey} (${file.length} bytes)`);
      return storageKey;
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);

      const errorStack = error instanceof Error ? error.stack : undefined;

      this.logger.error(`Error uploading file: ${errorMessage}`, errorStack);
      throw new InternalServerErrorException(
        'Failed to upload file to storage',
      );
    }
  }

  /**
   * Download a file from MinIO
   * @param storageKey Storage key of the file
   * @returns Buffer containing file data
   */
  async downloadFile(storageKey: string): Promise<Buffer> {
    try {
      const chunks: Buffer[] = [];
      const stream = await this.minioClient.getObject(this.bucket, storageKey);

      return new Promise((resolve, reject) => {
        stream.on('data', (chunk) => chunks.push(chunk));
        stream.on('end', () => resolve(Buffer.concat(chunks)));
        stream.on('error', (error) => reject(error));
      });
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);

      const errorStack = error instanceof Error ? error.stack : undefined;

      this.logger.error(`Error downloading file: ${errorMessage}`, errorStack);
      throw new InternalServerErrorException(
        'Failed to download file from storage',
      );
    }
  }

  /**
   * Delete a file from MinIO
   * @param storageKey Storage key of the file
   */
  async deleteFile(storageKey: string): Promise<void> {
    try {
      await this.minioClient.removeObject(this.bucket, storageKey);
      this.logger.log(`File deleted: ${storageKey}`);
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);

      const errorStack = error instanceof Error ? error.stack : undefined;

      this.logger.error(`Error deleting file: ${errorMessage}`, errorStack);
      throw new InternalServerErrorException(
        'Failed to delete file from storage',
      );
    }
  }

  /**
   * Generate a presigned URL for direct download
   * @param storageKey Storage key of the file
   * @param expiresIn Expiration time in seconds (default: 1 hour)
   * @returns Presigned URL
   */
  async generatePresignedUrl(
    storageKey: string,
    expiresIn = 3600,
  ): Promise<string> {
    try {
      const url = await this.minioClient.presignedGetObject(
        this.bucket,
        storageKey,
        expiresIn,
      );
      return url;
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);

      const errorStack = error instanceof Error ? error.stack : undefined;

      this.logger.error(
        `Error generating presigned URL: ${errorMessage}`,
        errorStack,
      );
      throw new InternalServerErrorException(
        'Failed to generate download link',
      );
    }
  }

  /**
   * List files with a given prefix
   * @param prefix Prefix to filter files
   * @returns Array of storage keys
   */
  async listFiles(prefix: string): Promise<string[]> {
    try {
      const stream = this.minioClient.listObjectsV2(this.bucket, prefix, true);
      const files: string[] = [];

      return new Promise((resolve, reject) => {
        stream.on('data', (obj) => {
          if (obj.name) {
            files.push(obj.name);
          }
        });
        stream.on('end', () => resolve(files));
        stream.on('error', (error) => reject(error));
      });
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);

      const errorStack = error instanceof Error ? error.stack : undefined;

      this.logger.error(`Error listing files: ${errorMessage}`, errorStack);
      throw new InternalServerErrorException('Failed to list files');
    }
  }

  /**
   * Get file statistics
   * @param storageKey Storage key of the file
   * @returns File metadata
   */
  async getFileStats(storageKey: string): Promise<Minio.BucketItemStat> {
    try {
      return await this.minioClient.statObject(this.bucket, storageKey);
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);

      const errorStack = error instanceof Error ? error.stack : undefined;

      this.logger.error(
        `Error getting file stats: ${errorMessage}`,
        errorStack,
      );
      throw new InternalServerErrorException('Failed to get file information');
    }
  }

  /**
   * Get bucket name
   */
  getBucket(): string {
    return this.bucket;
  }
}
