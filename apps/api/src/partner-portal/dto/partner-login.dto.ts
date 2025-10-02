import { IsString, IsNotEmpty } from 'class-validator';

export class PartnerLoginDto {
  @IsString()
  @IsNotEmpty()
  username!: string;

  @IsString()
  @IsNotEmpty()
  password!: string;
}
