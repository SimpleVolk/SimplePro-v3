import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { CompanyController } from './company.controller';
import { CompanyService } from './company.service';
import {
  CompanySettings,
  CompanySettingsSchema,
} from './schemas/company-settings.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: CompanySettings.name, schema: CompanySettingsSchema },
    ]),
  ],
  controllers: [CompanyController],
  providers: [CompanyService],
  exports: [CompanyService],
})
export class CompanyModule {}
