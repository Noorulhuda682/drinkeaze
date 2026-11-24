import { IsNumber, IsString, Length, Max, Min } from 'class-validator';

export class CreateRecipeIngredientDto {
  @IsString()
  @Length(1, 100)
  ingredientId!: string;

  @IsNumber({
    maxDecimalPlaces: 3,
    allowNaN: false,
    allowInfinity: false,
  })
  @Min(0.001)
  @Max(1000000)
  quantity!: number;
}
