import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import {
  TypingIndicator,
  TypingIndicatorDocument,
} from './schemas/typing-indicator.schema';

@Injectable()
export class TypingService {
  private readonly logger = new Logger(TypingService.name);

  constructor(
    @InjectModel(TypingIndicator.name)
    private typingIndicatorModel: Model<TypingIndicatorDocument>,
  ) {}

  async startTyping(threadId: string, userId: string): Promise<void> {
    try {
      const now = new Date();
      const expiresAt = new Date(now.getTime() + 30000); // 30 seconds from now

      await this.typingIndicatorModel.findOneAndUpdate(
        {
          threadId: new Types.ObjectId(threadId),
          userId: new Types.ObjectId(userId),
        },
        {
          $set: {
            startedAt: now,
            expiresAt: expiresAt,
          },
        },
        { upsert: true, new: true },
      );

      this.logger.debug(`User ${userId} started typing in thread ${threadId}`);
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);

      this.logger.error(`Failed to start typing indicator: ${errorMessage}`);
      throw error;
    }
  }

  async stopTyping(threadId: string, userId: string): Promise<void> {
    try {
      // Support wildcard threadId for cleanup on disconnect
      if (threadId === '*') {
        // Clear all typing indicators for this user across all threads
        await this.typingIndicatorModel.deleteMany({
          userId: new Types.ObjectId(userId),
        });
        this.logger.debug(`Cleared all typing indicators for user ${userId}`);
      } else {
        // Clear specific thread typing indicator
        await this.typingIndicatorModel.deleteOne({
          threadId: new Types.ObjectId(threadId),
          userId: new Types.ObjectId(userId),
        });
        this.logger.debug(
          `User ${userId} stopped typing in thread ${threadId}`,
        );
      }
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);

      this.logger.error(`Failed to stop typing indicator: ${errorMessage}`);
      throw error;
    }
  }

  async getTypingUsers(threadId: string): Promise<string[]> {
    try {
      const now = new Date();
      const typingIndicators = await this.typingIndicatorModel.find({
        threadId: new Types.ObjectId(threadId),
        expiresAt: { $gt: now },
      });

      return typingIndicators.map((indicator) => indicator.userId.toString());
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);

      this.logger.error(`Failed to get typing users: ${errorMessage}`);
      throw error;
    }
  }

  async cleanupExpiredIndicators(): Promise<void> {
    try {
      const result = await this.typingIndicatorModel.deleteMany({
        expiresAt: { $lt: new Date() },
      });

      if (result.deletedCount > 0) {
        this.logger.debug(
          `Cleaned up ${result.deletedCount} expired typing indicators`,
        );
      }
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);

      this.logger.error(
        `Failed to cleanup expired indicators: ${errorMessage}`,
      );
    }
  }
}
