-- Safe cleanup of recipes, ingredients, and inventory ONLY.
-- Preserves Admin, Order, OrderItem, Payment, Category, and Product records.
BEGIN;
DELETE FROM "ProductIngredient";
DELETE FROM "StockMovement";
DELETE FROM "IngredientPurchase";
DELETE FROM "Inventory";
DELETE FROM "Ingredient";
COMMIT;
