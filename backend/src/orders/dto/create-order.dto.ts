import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsEmail,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Length,
  Max,
  Min,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

export class CreateOrderItemDto {
  @IsString()
  @Length(1, 100)
  variantId!: string;

  @IsInt()
  @Min(1)
  @Max(100)
  quantity!: number;
}

export class CreateOrderDto {
  @IsString()
  @Length(2, 120)
  customerName!: string;

  @IsString()
  @Length(7, 30)
  customerPhone!: string;

  @IsOptional()
  @IsEmail()
  @Length(1, 254)
  customerEmail?: string;

  @IsString()
  @Length(5, 500)
  deliveryAddress!: string;

  @IsString()
  @Length(2, 100)
  deliveryCity!: string;

  @IsOptional()
  @IsString()
  @Length(0, 500)
  deliveryInstructions?: string;

  @IsIn(['CASH_ON_DELIVERY', 'ONLINE'])
  paymentMethod!: 'CASH_ON_DELIVERY' | 'ONLINE';

  @IsOptional()
  @IsString()
  @Length(0, 1000)
  notes?: string;

  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(30)
  @ValidateNested({ each: true })
  @Type(() => CreateOrderItemDto)
  items!: CreateOrderItemDto[];
}
