import { IsString, IsOptional, Length, Matches } from 'class-validator';

export class AddressDto {
  @IsString()
  @Length(1, 200)
  street!: string;

  @IsString()
  @Length(1, 100)
  city!: string;

  @IsString()
  @Length(2, 2)
  @Matches(/^[A-Z]{2}$/, {
    message: 'State must be a 2-letter uppercase code (e.g., NY, CA)',
  })
  state!: string;

  @IsString()
  @Matches(/^\d{5}(-\d{4})?$/, {
    message: 'Zip code must be in format 12345 or 12345-6789',
  })
  zipCode!: string;

  @IsOptional()
  @IsString()
  @Length(1, 100)
  country?: string;
}
