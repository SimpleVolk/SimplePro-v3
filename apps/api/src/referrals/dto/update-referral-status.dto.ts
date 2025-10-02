import { IsEnum, IsOptional, IsString } from 'class-validator';

export class UpdateReferralStatusDto {
  @IsEnum(['received', 'contacted', 'qualified', 'quoted', 'won', 'lost', 'cancelled'])
  status!: string;

  @IsOptional()
  @IsString()
  lostReason?: string;

  @IsOptional()
  @IsString()
  notes?: string;
}
