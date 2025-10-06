import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { MessagesService } from './messages.service';
import { TypingService } from './typing.service';
import { CreateThreadDto } from './dto/create-thread.dto';
import { SendMessageDto } from './dto/send-message.dto';
import { EditMessageDto } from './dto/edit-message.dto';
import { ThreadFiltersDto } from './dto/thread-filters.dto';
import { PaginationDto } from './dto/pagination.dto';

@Controller('messages')
@UseGuards(JwtAuthGuard)
export class MessagesController {
  constructor(
    private readonly messagesService: MessagesService,
    private readonly typingService: TypingService,
  ) {}

  // ==================== Thread Endpoints ====================

  @Post('threads')
  async createThread(@Body() dto: CreateThreadDto, @Request() _req: any) {
    return this.messagesService.createThread(dto);
  }

  @Get('threads')
  async getThreads(@Query() filters: ThreadFiltersDto, @Request() req: any) {
    const userId = req.user.userId;
    return this.messagesService.getThreads(userId, filters);
  }

  @Get('threads/:id')
  async getThreadById(@Param('id') id: string) {
    return this.messagesService.getThreadById(id);
  }

  @Get('threads/job/:jobId')
  async getJobThread(@Param('jobId') jobId: string) {
    return this.messagesService.findOrCreateJobThread(jobId);
  }

  @Delete('threads/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteThread(@Param('id') id: string, @Request() req: any) {
    const userId = req.user.userId;
    await this.messagesService.deleteThread(id, userId);
  }

  @Post('threads/:id/archive')
  @HttpCode(HttpStatus.NO_CONTENT)
  async archiveThread(@Param('id') id: string, @Request() req: any) {
    const userId = req.user.userId;
    await this.messagesService.archiveThread(id, userId);
  }

  // ==================== Message Endpoints ====================

  @Get('threads/:threadId/messages')
  async getMessages(
    @Param('threadId') threadId: string,
    @Query() pagination: PaginationDto,
  ) {
    return this.messagesService.getMessages(threadId, pagination);
  }

  @Post('threads/:threadId/messages')
  async sendMessage(
    @Param('threadId') threadId: string,
    @Body() dto: SendMessageDto,
    @Request() req: any,
  ) {
    const userId = req.user.userId;

    // Ensure threadId matches the one in the DTO
    dto.threadId = threadId;

    return this.messagesService.sendMessage(dto, userId);
  }

  @Patch('messages/:id')
  async editMessage(
    @Param('id') id: string,
    @Body() dto: EditMessageDto,
    @Request() req: any,
  ) {
    const userId = req.user.userId;
    return this.messagesService.editMessage(id, dto.content, userId);
  }

  @Delete('messages/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteMessage(@Param('id') id: string, @Request() req: any) {
    const userId = req.user.userId;
    await this.messagesService.deleteMessage(id, userId);
  }

  @Post('messages/:id/read')
  @HttpCode(HttpStatus.NO_CONTENT)
  async markAsRead(@Param('id') id: string, @Request() req: any) {
    const userId = req.user.userId;
    const message = await this.messagesService.getMessageById(id);
    await this.messagesService.markAsRead(
      message.threadId.toString(),
      userId,
      id,
    );
  }

  @Post('threads/:threadId/read-all')
  @HttpCode(HttpStatus.NO_CONTENT)
  async markAllAsRead(
    @Param('threadId') threadId: string,
    @Request() req: any,
  ) {
    const userId = req.user.userId;
    await this.messagesService.markAsRead(threadId, userId);
  }

  @Get('unread-count')
  async getUnreadCount(@Request() req: any) {
    const userId = req.user.userId;
    const count = await this.messagesService.getUnreadCount(userId);
    return { count };
  }

  @Get('threads/:threadId/search')
  async searchMessages(
    @Param('threadId') threadId: string,
    @Query('q') query: string,
  ) {
    return this.messagesService.searchMessages(threadId, query);
  }

  // ==================== Typing Indicator Endpoints ====================

  @Post('threads/:threadId/typing')
  @HttpCode(HttpStatus.NO_CONTENT)
  async startTyping(@Param('threadId') threadId: string, @Request() req: any) {
    const userId = req.user.userId;
    await this.typingService.startTyping(threadId, userId);
  }

  @Delete('threads/:threadId/typing')
  @HttpCode(HttpStatus.NO_CONTENT)
  async stopTyping(@Param('threadId') threadId: string, @Request() req: any) {
    const userId = req.user.userId;
    await this.typingService.stopTyping(threadId, userId);
  }

  @Get('threads/:threadId/typing')
  async getTypingUsers(@Param('threadId') threadId: string) {
    const userIds = await this.typingService.getTypingUsers(threadId);
    return { typingUsers: userIds };
  }
}
