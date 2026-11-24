import { UseGuards } from '@nestjs/common';
import { AdminJwtGuard } from '../admin-auth/admin-jwt.guard.js';
import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
} from '@nestjs/common';

import { RecipesService } from './recipes.service.js';
import { CreateRecipeIngredientDto } from './dto/create-recipe-ingredient.dto.js';
import { UpdateRecipeIngredientDto } from './dto/update-recipe-ingredient.dto.js';

@UseGuards(AdminJwtGuard)
@Controller('recipes')
export class RecipesController {
  constructor(private readonly recipesService: RecipesService) {}

  @Post('variants/:variantId/ingredients')
  addIngredient(
    @Param('variantId') variantId: string,
    @Body() body: CreateRecipeIngredientDto,
  ) {
    return this.recipesService.addIngredient(variantId, body);
  }

  @Get('variants/:variantId/ingredients')
  getRecipe(@Param('variantId') variantId: string) {
    return this.recipesService.getRecipe(variantId);
  }

  @Patch('variants/:variantId/ingredients/:ingredientId')
  updateIngredient(
    @Param('variantId') variantId: string,
    @Param('ingredientId') ingredientId: string,
    @Body() body: UpdateRecipeIngredientDto,
  ) {
    return this.recipesService.updateIngredient(variantId, ingredientId, body);
  }

  @Delete('variants/:variantId/ingredients/:ingredientId')
  removeIngredient(
    @Param('variantId') variantId: string,
    @Param('ingredientId') ingredientId: string,
  ) {
    return this.recipesService.removeIngredient(variantId, ingredientId);
  }
}
