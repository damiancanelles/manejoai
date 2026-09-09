import { IsNotEmpty, IsString } from 'class-validator';

export class SaveTelegramTokenDto {
  @IsString()
  @IsNotEmpty()
  botToken!: string;
}
