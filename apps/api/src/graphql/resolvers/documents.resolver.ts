import { Resolver, Query, Mutation, Args } from '@nestjs/graphql';
import { UseGuards, Request } from '@nestjs/common';
import { DocumentsService } from '../../documents/documents.service';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { Roles } from '../../auth/decorators/roles.decorator';

@Resolver('Document')
@UseGuards(JwtAuthGuard, RolesGuard)
export class DocumentsResolver {
  constructor(private readonly documentsService: DocumentsService) {}

  // Queries
  @Query('document')
  async getDocument(@Args('id') id: string) {
    return this.documentsService.findById(id);
  }

  @Query('documents')
  async getDocuments(@Args('filters') filters?: any) {
    return this.documentsService.findAll(filters);
  }

  @Query('documentsByEntity')
  async getDocumentsByEntity(
    @Args('entityType') entityType: string,
    @Args('entityId') entityId: string,
  ) {
    return this.documentsService.findByEntity(entityType as any, entityId);
  }

  @Query('documentStorageStatistics')
  @Roles('super_admin', 'admin')
  async getStorageStatistics(@Args('userId') userId?: string) {
    return this.documentsService.getStorageStatistics(userId);
  }

  // Mutations
  @Mutation('updateDocument')
  async updateDocument(@Args('id') id: string, @Args('input') input: any) {
    return this.documentsService.updateDocument(id, input);
  }

  @Mutation('deleteDocument')
  @Roles('super_admin', 'admin')
  async deleteDocument(
    @Args('id') id: string,
    @Request() req: any,
  ): Promise<boolean> {
    const userId = req.user?.userId || 'system';
    await this.documentsService.deleteDocument(id, userId);
    return true;
  }

  @Mutation('createDocumentShareLink')
  async createShareLink(
    @Args('documentId') documentId: string,
    @Args('input') input: any,
  ) {
    return this.documentsService.createShareLink(documentId, input);
  }

  // Note: File upload cannot be done via GraphQL easily
  // Upload should use the REST endpoint POST /api/documents/upload
  // Download can be done via presigned URLs from the document metadata
}
