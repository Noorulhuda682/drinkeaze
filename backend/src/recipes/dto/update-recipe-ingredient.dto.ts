import { IsNumber, Max, Min } from 'class-validator';

export class UpdateRecipeIngredientDto {
  @IsNumber({
    maxDecimalPlaces: 3,
    allowNaN: false,
    allowInfinity: false,
  })
  @Min(0.001)
  @Max(1000000)
  quantity!: number;
}
