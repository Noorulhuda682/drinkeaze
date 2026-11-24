import {
  IsNumber,
  IsOptional,
  IsString,
  Length,
  Matches,
  Max,
  Min,
} from 'class-validator';

export class CreateIngredientDto {
  @IsString()
  @Length(2, 100)
  name!: string;

  @IsOptional()
  @IsString()
  @Length(0, 500)
  description?: string;

  @IsNumber({ maxDecimalPlaces: 3, allowNaN: false, allowInfinity: false })
  @Min(0)
  @Max(1000000)
  quantity!: number;

  @IsString()
  @Length(1, 20)
  @Matches(/^[a-zA-Z][a-zA-Z0-9 _-]{0,19}$/)
  unit!: string;

  @IsNumber({ maxDecimalPlaces: 3, allowNaN: false, allowInfinity: false })
  @Min(0)
  @Max(1000000)
  reorderLevel!: number;
}
