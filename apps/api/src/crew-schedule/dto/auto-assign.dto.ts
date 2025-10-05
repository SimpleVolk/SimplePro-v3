import {
  IsArray,
  IsString,
  IsInt,
  Min,
  Max,
  IsDateString,
  IsOptional,
  IsMongoId,
} from 'class-validator';

export class AutoAssignDto {
  @IsArray()
  @IsString({ each: true })
  requiredSkills!: string[];

  @IsInt()
  @Min(1)
  @Max(10)
  crewSize!: number;

  @IsDateString()
  jobDate!: string;

  @IsInt()
  @Min(1)
  estimatedDuration!: number; // hours

  @IsMongoId()
  @IsOptional()
  preferredCrewLeadId?: string;

  @IsArray()
  @IsMongoId({ each: true })
  @IsOptional()
  excludeCrewIds?: string[];
}

export class ManualAssignDto {
  @IsArray()
  @IsMongoId({ each: true })
  crewMemberIds!: string[];

  @IsMongoId()
  @IsOptional()
  crewLeadId?: string;

  @IsString()
  @IsOptional()
  notes?: string;
}
