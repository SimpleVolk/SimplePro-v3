import { IsString, MinLength, MaxLength } from 'class-validator';

export class EditMessageDto {
  @IsString()
  @MinLength(1, { message: 'Message content cannot be empty' })
  @MaxLength(5000, { message: 'Message content cannot exceed 5000 characters' })
  content!: string;
}
