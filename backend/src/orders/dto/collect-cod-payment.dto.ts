import { IsOptional, IsString, MaxLength } from 'class-validator';

export class CollectCodPaymentDto {
  @IsOptional()
  @IsString()
  @MaxLength(500)
  note?: string;
}
