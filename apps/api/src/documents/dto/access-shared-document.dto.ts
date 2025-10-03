import { IsString, IsOptional } from 'class-validator';

export class AccessSharedDocumentDto {
  @IsString()
  @IsOptional()
  password?: string;
}
