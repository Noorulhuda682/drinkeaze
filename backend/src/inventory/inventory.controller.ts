import { UseGuards } from '@nestjs/common';
import { AdminJwtGuard } from '../admin-auth/admin-jwt.guard.js';
import { Body, Controller, Get, Param, Patch, Post } from '@nestjs/common';

import { InventoryService } from './inventory.service.js';
import { CreateIngredientDto } from './dto/create-ingredient.dto.js';
import { UpdateIngredientDto } from './dto/update-ingredient.dto.js';
import { AdjustStockDto } from './dto/adjust-stock.dto.js';

@UseGuards(AdminJwtGuard)
@Controller('inventory')
export class InventoryController {
  constructor(private readonly inventoryService: InventoryService) {}

  @Post('ingredients')
  createIngredient(@Body() body: CreateIngredientDto) {
    return this.inventoryService.createIngredient(body);
  }

  @Get('ingredients')
  findAll() {
    return this.inventoryService.findAll();
  }

  @Get('low-stock')
  findLowStock() {
    return this.inventoryService.findLowStock();
  }

  @Get('ingredients/:id')
  findOne(@Param('id') id: string) {
    return this.inventoryService.findOne(id);
  }

  @Patch('ingredients/:id')
  updateIngredient(@Param('id') id: string, @Body() body: UpdateIngredientDto) {
    return this.inventoryService.updateIngredient(id, body);
  }

  @Patch('ingredients/:id/stock')
  adjustStock(@Param('id') id: string, @Body() body: AdjustStockDto) {
    return this.inventoryService.adjustStock(id, body);
  }

  @Get('ingredients/:id/movements')
  getMovementHistory(@Param('id') id: string) {
    return this.inventoryService.getMovementHistory(id);
  }
}
