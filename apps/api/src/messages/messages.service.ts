import {
  Injectable,
  Logger,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import {
  MessageThread,
  MessageThreadDocument,
} from './schemas/message-thread.schema';
import { Message, MessageDocument } from './schemas/message.schema';
import { CreateThreadDto } from './dto/create-thread.dto';
import { SendMessageDto } from './dto/send-message.dto';
import { ThreadFiltersDto } from './dto/thread-filters.dto';
import { PaginationDto } from './dto/pagination.dto';
import { PaginatedMessages } from './interfaces/message.interface';

@Injectable()
export class MessagesService {
  private readonly logger = new Logger(MessagesService.name);

  constructor(
    @InjectModel(MessageThread.name)
    private messageThreadModel: Model<MessageThreadDocument>,
    @InjectModel(Message.name) private messageModel: Model<MessageDocument>,
  ) {}

  // ==================== Thread Management ====================

  async createThread(dto: CreateThreadDto): Promise<MessageThread> {
    try {
      const participantIds = dto.participants.map(
        (id) => new Types.ObjectId(id),
      );

      // Check for existing direct thread between the same participants
      if (dto.threadType === 'direct' && participantIds.length === 2) {
        const existingThread = await this.messageThreadModel.findOne({
          threadType: 'direct',
          participants: { $all: participantIds, $size: 2 },
        });

        if (existingThread) {
          this.logger.debug(
            `Returning existing direct thread: ${existingThread._id}`,
          );
          return existingThread;
        }
      }

      const thread = new this.messageThreadModel({
        participants: participantIds,
        threadType: dto.threadType,
        jobId: dto.jobId ? new Types.ObjectId(dto.jobId) : undefined,
        threadName: dto.threadName,
        lastMessageAt: new Date(),
      });

      await thread.save();
      this.logger.log(`Created new ${dto.threadType} thread: ${thread._id}`);
      return thread;
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);

      this.logger.error(`Failed to create thread: ${errorMessage}`);
      throw error;
    }
  }

  async findOrCreateDirectThread(
    user1Id: string,
    user2Id: string,
  ): Promise<MessageThread> {
    try {
      const participantIds = [
        new Types.ObjectId(user1Id),
        new Types.ObjectId(user2Id),
      ];

      let thread = await this.messageThreadModel.findOne({
        threadType: 'direct',
        participants: { $all: participantIds, $size: 2 },
      });

      if (!thread) {
        thread = new this.messageThreadModel({
          participants: participantIds,
          threadType: 'direct',
          lastMessageAt: new Date(),
        });
        await thread.save();
        this.logger.log(
          `Created direct thread between ${user1Id} and ${user2Id}`,
        );
      }

      return thread;
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);

      this.logger.error(
        `Failed to find or create direct thread: ${errorMessage}`,
      );
      throw error;
    }
  }

  async findOrCreateJobThread(jobId: string): Promise<MessageThread> {
    try {
      let thread = await this.messageThreadModel.findOne({
        threadType: 'job',
        jobId: new Types.ObjectId(jobId),
      });

      if (!thread) {
        // In a real implementation, fetch job details and add relevant participants
        // For now, create an empty thread that can be populated later
        thread = new this.messageThreadModel({
          participants: [], // Should be populated with job crew and dispatcher
          threadType: 'job',
          jobId: new Types.ObjectId(jobId),
          threadName: `Job #${jobId}`,
          lastMessageAt: new Date(),
        });
        await thread.save();
        this.logger.log(`Created job thread for job ${jobId}`);
      }

      return thread;
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);

      this.logger.error(`Failed to find or create job thread: ${errorMessage}`);
      throw error;
    }
  }

  async getThreads(
    userId: string,
    filters?: ThreadFiltersDto,
  ): Promise<MessageThread[]> {
    try {
      const userObjectId = new Types.ObjectId(userId);
      const query: any = {
        participants: userObjectId,
      };

      // Apply filters
      if (filters?.threadType) {
        query.threadType = filters.threadType;
      }

      if (filters?.jobId) {
        query.jobId = new Types.ObjectId(filters.jobId);
      }

      if (!filters?.includeArchived) {
        query.$or = [
          { isArchived: false },
          { archivedBy: { $ne: userObjectId } },
        ];
      }

      const threads = await this.messageThreadModel
        .find(query)
        .populate(
          'participants',
          'username email firstName lastName profilePicture',
        )
        .populate('lastMessageId')
        .sort({ lastMessageAt: -1 })
        .exec();

      // Filter for unread only if requested
      if (filters?.unreadOnly) {
        const threadsWithUnread = await Promise.all(
          threads.map(async (thread) => {
            const threadId = thread._id?.toString() || '';
            const unreadCount = await this.getUnreadCountForThread(
              threadId,
              userId,
            );
            return unreadCount > 0 ? thread : null;
          }),
        );
        return threadsWithUnread.filter((t) => t !== null) as MessageThread[];
      }

      return threads;
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);

      this.logger.error(`Failed to get threads: ${errorMessage}`);
      throw error;
    }
  }

  async getThreadById(threadId: string): Promise<MessageThread> {
    try {
      const thread = await this.messageThreadModel
        .findById(threadId)
        .populate(
          'participants',
          'username email firstName lastName profilePicture',
        )
        .populate('lastMessageId')
        .exec();

      if (!thread) {
        throw new NotFoundException(`Thread ${threadId} not found`);
      }

      return thread;
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);

      this.logger.error(`Failed to get thread: ${errorMessage}`);
      throw error;
    }
  }

  async deleteThread(threadId: string, userId: string): Promise<void> {
    try {
      const thread = await this.messageThreadModel.findById(threadId);

      if (!thread) {
        throw new NotFoundException(`Thread ${threadId} not found`);
      }

      // Check if user is a participant
      if (!thread.participants.some((p) => p.toString() === userId)) {
        throw new ForbiddenException(
          'You are not a participant in this thread',
        );
      }

      // Remove user from participants instead of deleting the thread
      thread.participants = thread.participants.filter(
        (p) => p.toString() !== userId,
      );

      if (thread.participants.length === 0) {
        // If no participants left, delete the thread
        await this.messageThreadModel.findByIdAndDelete(threadId);
        this.logger.log(
          `Deleted thread ${threadId} (no participants remaining)`,
        );
      } else {
        await thread.save();
        this.logger.log(`Removed user ${userId} from thread ${threadId}`);
      }
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);

      this.logger.error(`Failed to delete thread: ${errorMessage}`);
      throw error;
    }
  }

  async archiveThread(threadId: string, userId: string): Promise<void> {
    try {
      const thread = await this.messageThreadModel.findById(threadId);

      if (!thread) {
        throw new NotFoundException(`Thread ${threadId} not found`);
      }

      const userObjectId = new Types.ObjectId(userId);

      if (!thread.participants.some((p) => p.toString() === userId)) {
        throw new ForbiddenException(
          'You are not a participant in this thread',
        );
      }

      // Add user to archivedBy array if not already there
      if (!thread.archivedBy.some((id) => id.toString() === userId)) {
        thread.archivedBy.push(userObjectId);
        await thread.save();
        this.logger.log(`User ${userId} archived thread ${threadId}`);
      }
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);

      this.logger.error(`Failed to archive thread: ${errorMessage}`);
      throw error;
    }
  }

  // ==================== Message Management ====================

  async getMessages(
    threadId: string,
    pagination: PaginationDto,
  ): Promise<PaginatedMessages> {
    try {
      const limit = pagination.limit || 50;
      const query: any = {
        threadId: new Types.ObjectId(threadId),
        isDeleted: false,
      };

      // Cursor-based pagination
      if (pagination.beforeId) {
        query._id = { $lt: new Types.ObjectId(pagination.beforeId) };
      } else if (pagination.afterId) {
        query._id = { $gt: new Types.ObjectId(pagination.afterId) };
      }

      const messages = await this.messageModel
        .find(query)
        .populate(
          'senderId',
          'username email firstName lastName profilePicture',
        )
        .populate('replyToId')
        .sort({ createdAt: pagination.afterId ? 1 : -1 })
        .limit(limit + 1) // Fetch one extra to check if there are more
        .exec();

      const hasMore = messages.length > limit;
      const resultMessages = hasMore ? messages.slice(0, limit) : messages;

      // Get total count for the thread
      const totalCount = await this.messageModel.countDocuments({
        threadId: new Types.ObjectId(threadId),
        isDeleted: false,
      });

      return {
        messages: resultMessages,
        hasMore,
        totalCount,
        nextCursor: hasMore
          ? (resultMessages[resultMessages.length - 1]._id as any).toString()
          : undefined,
        prevCursor:
          resultMessages.length > 0
            ? (resultMessages[0]._id as any).toString()
            : undefined,
      };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);

      this.logger.error(`Failed to get messages: ${errorMessage}`);
      throw error;
    }
  }

  async sendMessage(dto: SendMessageDto, senderId: string): Promise<Message> {
    try {
      // Verify thread exists and user is a participant
      const thread = await this.messageThreadModel.findById(dto.threadId);

      if (!thread) {
        throw new NotFoundException(`Thread ${dto.threadId} not found`);
      }

      if (!thread.participants.some((p) => p.toString() === senderId)) {
        throw new ForbiddenException(
          'You are not a participant in this thread',
        );
      }

      // Create the message
      const message = new this.messageModel({
        threadId: new Types.ObjectId(dto.threadId),
        senderId: new Types.ObjectId(senderId),
        content: dto.content,
        messageType: dto.messageType || 'text',
        attachments: dto.attachments,
        location: dto.location,
        replyToId: dto.replyToId
          ? new Types.ObjectId(dto.replyToId)
          : undefined,
      });

      await message.save();

      // Update thread's last message
      thread.lastMessageId = message._id as Types.ObjectId;
      thread.lastMessageAt = new Date();
      await thread.save();

      // Populate sender info before returning
      await message.populate(
        'senderId',
        'username email firstName lastName profilePicture',
      );

      this.logger.log(`Message sent by ${senderId} in thread ${dto.threadId}`);
      return message;
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);

      this.logger.error(`Failed to send message: ${errorMessage}`);
      throw error;
    }
  }

  async editMessage(
    messageId: string,
    content: string,
    userId: string,
  ): Promise<Message> {
    try {
      const message = await this.messageModel.findById(messageId);

      if (!message) {
        throw new NotFoundException(`Message ${messageId} not found`);
      }

      if (message.senderId.toString() !== userId) {
        throw new ForbiddenException('You can only edit your own messages');
      }

      if (message.isDeleted) {
        throw new BadRequestException('Cannot edit deleted message');
      }

      message.content = content;
      message.isEdited = true;
      message.editedAt = new Date();

      await message.save();
      await message.populate(
        'senderId',
        'username email firstName lastName profilePicture',
      );

      this.logger.log(`Message ${messageId} edited by ${userId}`);
      return message;
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);

      this.logger.error(`Failed to edit message: ${errorMessage}`);
      throw error;
    }
  }

  async deleteMessage(messageId: string, userId: string): Promise<void> {
    try {
      const message = await this.messageModel.findById(messageId);

      if (!message) {
        throw new NotFoundException(`Message ${messageId} not found`);
      }

      if (message.senderId.toString() !== userId) {
        throw new ForbiddenException('You can only delete your own messages');
      }

      // Soft delete
      message.isDeleted = true;
      message.deletedAt = new Date();
      await message.save();

      this.logger.log(`Message ${messageId} deleted by ${userId}`);
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);

      this.logger.error(`Failed to delete message: ${errorMessage}`);
      throw error;
    }
  }

  async markAsRead(
    threadId: string,
    userId: string,
    messageId?: string,
  ): Promise<void> {
    try {
      const query: any = {
        threadId: new Types.ObjectId(threadId),
        senderId: { $ne: new Types.ObjectId(userId) }, // Don't mark own messages as read
        'readBy.userId': { $ne: new Types.ObjectId(userId) }, // Not already read
      };

      if (messageId) {
        query._id = new Types.ObjectId(messageId);
      }

      const result = await this.messageModel.updateMany(query, {
        $push: {
          readBy: {
            userId: new Types.ObjectId(userId),
            readAt: new Date(),
          },
        },
      });

      this.logger.debug(
        `Marked ${result.modifiedCount} messages as read in thread ${threadId}`,
      );
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);

      this.logger.error(`Failed to mark messages as read: ${errorMessage}`);
      throw error;
    }
  }

  async getUnreadCount(userId: string): Promise<number> {
    try {
      const userObjectId = new Types.ObjectId(userId);

      // Find all threads where user is a participant
      const threads = await this.messageThreadModel
        .find({
          participants: userObjectId,
        })
        .select('_id');

      const threadIds = threads.map((t) => t._id);

      // Count unread messages across all threads
      const count = await this.messageModel.countDocuments({
        threadId: { $in: threadIds },
        senderId: { $ne: userObjectId },
        'readBy.userId': { $ne: userObjectId },
        isDeleted: false,
      });

      return count;
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);

      this.logger.error(`Failed to get unread count: ${errorMessage}`);
      throw error;
    }
  }

  async getUnreadCountForThread(
    threadId: string,
    userId: string,
  ): Promise<number> {
    try {
      const count = await this.messageModel.countDocuments({
        threadId: new Types.ObjectId(threadId),
        senderId: { $ne: new Types.ObjectId(userId) },
        'readBy.userId': { $ne: new Types.ObjectId(userId) },
        isDeleted: false,
      });

      return count;
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);

      this.logger.error(
        `Failed to get unread count for thread: ${errorMessage}`,
      );
      throw error;
    }
  }

  async searchMessages(threadId: string, query: string): Promise<Message[]> {
    try {
      if (!query || query.trim().length === 0) {
        return [];
      }

      const messages = await this.messageModel
        .find({
          threadId: new Types.ObjectId(threadId),
          $text: { $search: query },
          isDeleted: false,
        })
        .populate(
          'senderId',
          'username email firstName lastName profilePicture',
        )
        .sort({ score: { $meta: 'textScore' } })
        .limit(50)
        .exec();

      return messages;
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);

      this.logger.error(`Failed to search messages: ${errorMessage}`);
      throw error;
    }
  }

  async getMessageById(messageId: string): Promise<Message> {
    try {
      const message = await this.messageModel
        .findById(messageId)
        .populate(
          'senderId',
          'username email firstName lastName profilePicture',
        )
        .exec();

      if (!message) {
        throw new NotFoundException(`Message ${messageId} not found`);
      }

      return message;
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);

      this.logger.error(`Failed to get message: ${errorMessage}`);
      throw error;
    }
  }
}
