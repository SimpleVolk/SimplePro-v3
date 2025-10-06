import {
  IsBoolean,
  IsOptional,
  IsString,
  MinLength,
  Matches,
} from 'class-validator';

export class EnablePortalAccessDto {
  @IsBoolean()
  enabled!: boolean;

  @IsOptional()
  @IsString()
  username?: string;

  @IsOptional()
  @IsString()
  @MinLength(8)
  @Matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/, {
    message:
      'Password must contain uppercase, lowercase, number and special character',
  })
  password?: string;
}
