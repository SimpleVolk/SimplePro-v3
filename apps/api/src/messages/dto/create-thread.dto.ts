import { IsArray, IsEnum, IsMongoId, IsOptional, IsString, ArrayMinSize, ValidateIf } from 'class-validator';

export class CreateThreadDto {
  @IsArray()
  @IsMongoId({ each: true })
  @ArrayMinSize(2, { message: 'A thread must have at least 2 participants' })
  participants!: string[];

  @IsEnum(['direct', 'job', 'group'], { message: 'Thread type must be one of: direct, job, group' })
  threadType!: string;

  @IsMongoId()
  @IsOptional()
  @ValidateIf(o => o.threadType === 'job')
  jobId?: string;

  @IsString()
  @IsOptional()
  @ValidateIf(o => o.threadType === 'group')
  threadName?: string;
}
