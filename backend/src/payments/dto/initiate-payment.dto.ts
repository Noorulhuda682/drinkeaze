import { IsEnum, IsString, MinLength, MaxLength } from 'class-validator';

export enum OnlinePaymentMethodDto {
  CARD = 'CARD',
  JAZZCASH = 'JAZZCASH',
  EASYPAISA = 'EASYPAISA',
  RAAST = 'RAAST',
}

export class InitiatePaymentDto {
  @IsEnum(OnlinePaymentMethodDto)
  method!: OnlinePaymentMethodDto;

  @IsString()
  @MinLength(8)
  @MaxLength(100)
  idempotencyKey!: string;
}
