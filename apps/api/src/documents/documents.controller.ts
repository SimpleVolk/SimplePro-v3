import {
  Controller,
  Post,
  Get,
  Patch,
  Delete,
  Param,
  Query,
  Body,
  UseGuards,
  Request,
  UseInterceptors,
  UploadedFile,
  Res,
  BadRequestException,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { FileInterceptor } from '@nestjs/platform-express';
import type { Response } from 'express';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { Public } from '../auth/decorators/public.decorator';
import { DocumentsService } from './documents.service';
import type {
  UploadDocumentDto,
  CreateShareLinkDto,
  DocumentFiltersDto,
  UpdateDocumentDto,
  AccessSharedDocumentDto,
} from './dto';
import { MAX_FILE_SIZE } from './interfaces/document.interface';

@Controller('documents')
@UseGuards(JwtAuthGuard, RolesGuard)
export class DocumentsController {
  constructor(private readonly documentsService: DocumentsService) {}

  /**
   * Upload a new document
   * POST /api/documents/upload
   */
  @Post('upload')
  @UseInterceptors(
    FileInterceptor('file', {
      limits: {
        fileSize: MAX_FILE_SIZE,
      },
    }),
  )
  async uploadDocument(
    @UploadedFile() file: any,
    @Body() dto: UploadDocumentDto,
    @Request() req: any,
  ) {
    if (!file) {
      throw new BadRequestException('No file uploaded');
    }

    const document = await this.documentsService.uploadDocument(
      file,
      dto,
      req.user.userId,
    );

    return {
      success: true,
      message: 'Document uploaded successfully',
      document,
    };
  }

  /**
   * Get all documents with filters
   * GET /api/documents
   */
  @Get()
  async findAll(@Query() filters: DocumentFiltersDto, @Request() _req: any) {
    const documents = await this.documentsService.findAll(filters);

    return {
      success: true,
      count: documents.length,
      documents,
    };
  }

  /**
   * Get a specific document by ID
   * GET /api/documents/:id
   */
  @Get(':id')
  async findOne(@Param('id') id: string) {
    const document = await this.documentsService.findById(id);

    return {
      success: true,
      document,
    };
  }

  /**
   * Get documents for a specific entity
   * GET /api/documents/entity/:entityType/:entityId
   */
  @Get('entity/:entityType/:entityId')
  async findByEntity(
    @Param('entityType') entityType: string,
    @Param('entityId') entityId: string,
  ) {
    const documents = await this.documentsService.findByEntity(
      entityType as any,
      entityId,
    );

    return {
      success: true,
      count: documents.length,
      documents,
    };
  }

  /**
   * Download a document
   * GET /api/documents/:id/download
   */
  @Get(':id/download')
  async downloadDocument(@Param('id') id: string, @Res() res: Response) {
    const { buffer, document } = await this.documentsService.downloadDocument(id);

    // Set response headers
    res.setHeader('Content-Type', document.mimeType);
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="${document.originalName}"`,
    );
    res.setHeader('Content-Length', buffer.length);

    // Send file
    res.send(buffer);
  }

  /**
   * Delete a document (soft delete)
   * DELETE /api/documents/:id
   */
  @Delete(':id')
  @Roles('admin', 'super_admin')
  async deleteDocument(@Param('id') id: string, @Request() req: any) {
    await this.documentsService.deleteDocument(id, req.user.userId);

    return {
      success: true,
      message: 'Document deleted successfully',
    };
  }

  /**
   * Create a share link for a document
   * POST /api/documents/:id/share
   */
  @Post(':id/share')
  async createShareLink(
    @Param('id') id: string,
    @Body() dto: CreateShareLinkDto,
  ) {
    const shareLink = await this.documentsService.createShareLink(id, dto);

    return {
      success: true,
      message: 'Share link created successfully',
      shareLink,
    };
  }

  /**
   * Access a shared document (public endpoint)
   * POST /api/documents/shared/:token/access
   *
   * SECURITY: Rate limited to 5 attempts per hour per IP to prevent brute force attacks
   * Password is now in POST body instead of URL query parameter for security
   */
  @Post('shared/:token/access')
  @Public()
  @Throttle({ default: { limit: 5, ttl: 3600000 } }) // 5 attempts per hour
  async accessSharedDocument(
    @Param('token') token: string,
    @Body() dto: AccessSharedDocumentDto,
  ) {
    const document = await this.documentsService.accessSharedDocument(
      token,
      dto.password,
    );

    return {
      success: true,
      document,
    };
  }

  /**
   * Download a shared document (public endpoint)
   * POST /api/documents/shared/:token/download
   *
   * SECURITY: Rate limited to 5 attempts per hour per IP to prevent brute force attacks
   * Password is now in POST body instead of URL query parameter for security
   */
  @Post('shared/:token/download')
  @Public()
  @Throttle({ default: { limit: 5, ttl: 3600000 } }) // 5 attempts per hour
  async downloadSharedDocument(
    @Param('token') token: string,
    @Body() dto: AccessSharedDocumentDto,
    @Res() res: Response,
  ) {
    const document = await this.documentsService.accessSharedDocument(
      token,
      dto.password,
    );

    const { buffer } = await this.documentsService.downloadDocument(
      document._id?.toString() ?? '',
    );

    // Set response headers
    res.setHeader('Content-Type', document.mimeType);
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="${document.originalName}"`,
    );
    res.setHeader('Content-Length', buffer.length);

    // Send file
    res.send(buffer);
  }

  /**
   * Update document metadata
   * PATCH /api/documents/:id
   */
  @Patch(':id')
  async updateDocument(
    @Param('id') id: string,
    @Body() dto: UpdateDocumentDto,
  ) {
    const document = await this.documentsService.updateDocument(id, dto);

    return {
      success: true,
      message: 'Document updated successfully',
      document,
    };
  }

  /**
   * Get storage statistics
   * GET /api/documents/statistics/storage
   */
  @Get('statistics/storage')
  async getStorageStats(@Request() req: any) {
    // Admins can see all stats, regular users only their own
    const userId =
      req.user.role.name === 'admin' || req.user.role.name === 'super_admin'
        ? undefined
        : req.user.userId;

    const statistics = await this.documentsService.getStorageStatistics(userId);

    return {
      success: true,
      statistics,
    };
  }
}
