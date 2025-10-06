import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  UseGuards,
  HttpException,
  HttpStatus,
  Query
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { PricingRulesService } from './pricing-rules.service';
import { CreatePricingRuleDto, UpdatePricingRuleDto, TestRuleDto } from './dto/pricing-rules.dto';

@Controller('pricing-rules')
@UseGuards(JwtAuthGuard, RolesGuard)
export class PricingRulesController {
  constructor(private readonly pricingRulesService: PricingRulesService) {}

  /**
   * Get all pricing rules with optional filtering
   */
  @Get()
  @Roles('super_admin', 'admin')
  async getAllRules(
    @Query('category') category?: string,
    @Query('isActive') isActive?: boolean,
    @Query('service') service?: string
  ) {
    try {
      return await this.pricingRulesService.getAllRules({
        category: category as any,
        isActive,
        service: service as any
      });
    } catch (error) {
      throw new HttpException(
        'Failed to retrieve pricing rules',
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  /**
   * Get a specific pricing rule by ID
   */
  @Get(':id')
  @Roles('super_admin', 'admin')
  async getRuleById(@Param('id') id: string) {
    try {
      const rule = await this.pricingRulesService.getRuleById(id);
      if (!rule) {
        throw new HttpException('Pricing rule not found', HttpStatus.NOT_FOUND);
      }
      return rule;
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      throw new HttpException(
        'Failed to retrieve pricing rule',
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  /**
   * Create a new pricing rule
   */
  @Post()
  @Roles('super_admin')
  async createRule(@Body() createRuleDto: CreatePricingRuleDto) {
    try {
      return await this.pricingRulesService.createRule(createRuleDto);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      throw new HttpException(
        errorMessage || 'Failed to create pricing rule',
        HttpStatus.BAD_REQUEST
      );
    }
  }

  /**
   * Update an existing pricing rule
   */
  @Put(':id')
  @Roles('super_admin')
  async updateRule(
    @Param('id') id: string,
    @Body() updateRuleDto: UpdatePricingRuleDto
  ) {
    try {
      const updatedRule = await this.pricingRulesService.updateRule(id, updateRuleDto);
      if (!updatedRule) {
        throw new HttpException('Pricing rule not found', HttpStatus.NOT_FOUND);
      }
      return updatedRule;
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      const errorMessage = error instanceof Error ? error.message : String(error);
      throw new HttpException(
        errorMessage || 'Failed to update pricing rule',
        HttpStatus.BAD_REQUEST
      );
    }
  }

  /**
   * Delete a pricing rule (soft delete - mark as inactive)
   */
  @Delete(':id')
  @Roles('super_admin')
  async deleteRule(@Param('id') id: string) {
    try {
      const result = await this.pricingRulesService.deleteRule(id);
      if (!result) {
        throw new HttpException('Pricing rule not found', HttpStatus.NOT_FOUND);
      }
      return { message: 'Pricing rule deleted successfully' };
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      throw new HttpException(
        'Failed to delete pricing rule',
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  /**
   * Test a pricing rule against sample data
   */
  @Post('test')
  @Roles('super_admin', 'admin')
  async testRule(@Body() testRuleDto: TestRuleDto) {
    try {
      return await this.pricingRulesService.testRule(testRuleDto);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      throw new HttpException(
        errorMessage || 'Failed to test pricing rule',
        HttpStatus.BAD_REQUEST
      );
    }
  }

  /**
   * Get pricing rule categories
   */
  @Get('metadata/categories')
  @Roles('super_admin', 'admin')
  async getCategories() {
    return await this.pricingRulesService.getCategories();
  }

  /**
   * Get available operators for rule conditions
   */
  @Get('metadata/operators')
  @Roles('super_admin', 'admin')
  async getOperators() {
    return await this.pricingRulesService.getOperators();
  }

  /**
   * Get available action types for rules
   */
  @Get('metadata/action-types')
  @Roles('super_admin', 'admin')
  async getActionTypes() {
    return await this.pricingRulesService.getActionTypes();
  }

  /**
   * Export all rules to JSON
   */
  @Get('export/json')
  @Roles('super_admin')
  async exportRules() {
    try {
      return await this.pricingRulesService.exportRules();
    } catch (error) {
      throw new HttpException(
        'Failed to export pricing rules',
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  /**
   * Import rules from JSON (replaces existing rules)
   */
  @Post('import/json')
  @Roles('super_admin')
  async importRules(@Body() rulesData: any) {
    try {
      return await this.pricingRulesService.importRules(rulesData);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      throw new HttpException(
        errorMessage || 'Failed to import pricing rules',
        HttpStatus.BAD_REQUEST
      );
    }
  }

  /**
   * Get pricing rule change history
   */
  @Get(':id/history')
  @Roles('super_admin', 'admin')
  async getRuleHistory(@Param('id') id: string) {
    try {
      return await this.pricingRulesService.getRuleHistory(id);
    } catch (error) {
      throw new HttpException(
        'Failed to retrieve rule history',
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  /**
   * Backup current rules before making changes
   */
  @Post('backup')
  @Roles('super_admin')
  async backupRules() {
    try {
      return await this.pricingRulesService.createBackup();
    } catch (error) {
      throw new HttpException(
        'Failed to create rules backup',
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }
}