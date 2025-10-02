import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  UseGuards,
  Request,
} from '@nestjs/common';
import { FollowUpRulesService } from './follow-up-rules.service';
import { CreateRuleDto } from './dto/create-rule.dto';
import { UpdateRuleDto } from './dto/update-rule.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';

@Controller('api/follow-up-rules')
@UseGuards(JwtAuthGuard, RolesGuard)
export class FollowUpRulesController {
  constructor(private readonly rulesService: FollowUpRulesService) {}

  @Post()
  @Roles('super_admin', 'admin')
  async createRule(@Body() createDto: CreateRuleDto, @Request() req) {
    const rule = await this.rulesService.createRule(createDto, req.user.userId);

    return {
      success: true,
      rule,
      message: 'Follow-up rule created successfully',
    };
  }

  @Get()
  @Roles('super_admin', 'admin', 'dispatcher')
  async findAll() {
    const rules = await this.rulesService.findAll();

    return {
      success: true,
      rules,
      count: rules.length,
    };
  }

  @Get('active')
  @Roles('super_admin', 'admin', 'dispatcher')
  async findActive() {
    const rules = await this.rulesService.findActiveRules();

    return {
      success: true,
      rules,
      count: rules.length,
    };
  }

  @Get(':ruleId')
  @Roles('super_admin', 'admin', 'dispatcher')
  async findOne(@Param('ruleId') ruleId: string) {
    const rule = await this.rulesService.findById(ruleId);

    return {
      success: true,
      rule,
    };
  }

  @Patch(':ruleId')
  @Roles('super_admin', 'admin')
  async updateRule(
    @Param('ruleId') ruleId: string,
    @Body() updateDto: UpdateRuleDto,
    @Request() req
  ) {
    const rule = await this.rulesService.updateRule(
      ruleId,
      updateDto,
      req.user.userId
    );

    return {
      success: true,
      rule,
      message: 'Rule updated successfully',
    };
  }

  @Delete(':ruleId')
  @Roles('super_admin', 'admin')
  async deleteRule(@Param('ruleId') ruleId: string) {
    await this.rulesService.deleteRule(ruleId);

    return {
      success: true,
      message: 'Rule deleted successfully',
    };
  }

  @Post(':ruleId/test')
  @Roles('super_admin', 'admin')
  async testRule(@Param('ruleId') ruleId: string, @Body() sampleData: any) {
    const result = await this.rulesService.testRule(ruleId, sampleData);

    return {
      success: true,
      testResult: result,
    };
  }
}
