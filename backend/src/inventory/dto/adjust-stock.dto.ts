import {
  IsIn,
  IsNumber,
  IsOptional,
  IsString,
  Length,
  Max,
  Min,
} from 'class-validator';

export class AdjustStockDto {
  @IsIn(['IN', 'OUT'])
  type!: 'IN' | 'OUT';

  @IsNumber({
    maxDecimalPlaces: 3,
    allowNaN: false,
    allowInfinity: false,
  })
  @Min(0.001)
  @Max(1000000)
  quantity!: number;

  @IsOptional()
  @IsString()
  @Length(0, 500)
  note?: string;
}
