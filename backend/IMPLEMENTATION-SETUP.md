# Drinkeaze ordering integration

This update connects the existing 25-item restaurant catalog to the NestJS/PostgreSQL product and variant tables, then sends checkout orders through the existing inventory-aware order service. The Next.js app talks to NestJS through server-side route handlers; database credentials and payment secrets are not exposed to the browser.

## What changed

- The existing catalog and presentation are preserved.
- `bvid` is the stable catalog-to-database mapping key. The backend `Product.id` and `ProductVariant.id` remain the database identifiers.
- A repeatable menu sync creates/updates the four catalog categories, 25 products and one `Standard` price variant per catalog entry. It does not delete manually managed products or variants.
- The cart now stores `ProductVariant.id` as `variantId`; legacy cart entries containing only `bvid` are discarded because they cannot be submitted as valid order items.
- Checkout now creates a real order with an idempotency key. The backend remains authoritative for prices, order totals, recipes and stock.
- Online checkout redirects to Safepay hosted checkout. Card numbers and CVVs are no longer collected by Drinkeaze.
- The payment domain now depends on a `PaymentGateway` interface (initiate, fetch and provider-specific verification); Safepay is registered as the active adapter. The database already supports a `PAYFAST` provider value, but no PayFast adapter is activated without its API contract and merchant credentials.
- Payment return attempts server-side Safepay reconciliation before showing payment confirmation. Terminal unsuccessful transactions are marked failed and can be retried against the same order.
- Product variants are only addable when they are available and have at least one configured recipe ingredient.

## Setup

### 1. Backend

Copy `backend/.env.example` to `backend/.env` and set real values. Generate the secrets locally:

```bash
openssl rand -hex 32
```

Use separate random values for `JWT_SECRET`, `ADMIN_BOOTSTRAP_SECRET`, and `ORDER_TRACKING_ENCRYPTION_KEY`. The tracking key must be exactly 64 hexadecimal characters.

Install dependencies and prepare the database:

```bash
pnpm install
pnpm exec prisma generate
pnpm exec prisma migrate deploy
pnpm db:seed:menu
pnpm start:dev
```

The menu seed is safe to run again. It inserts missing categories, products and default variants using the existing `bvid` unique field and deterministic SKUs. It preserves existing database product details, variant prices, stock counts and recipe quantities.

### 2. Frontend

Copy `frontend/.env.example` to `frontend/.env.local`. Set `BACKEND_API_URL` to the backend's server-reachable URL (for local development, `http://localhost:3000`).

Install and run:

```bash
npm install
npm run dev
```

The frontend uses port `3001`; the backend uses port `3000` by default.

## Required one-time business data setup: recipes and inventory

The uploaded database schema and catalog did not contain real ingredient recipes or starting stock quantities for the 25 catalog items. Those values are business data and must not be guessed. The seed therefore creates catalog products and price variants but deliberately does not fabricate recipes or inventory.

Until a variant has a recipe, the menu displays `Setup pending` and will not let a customer add it to the cart. This prevents orders from bypassing stock accounting.

Configure each actual ingredient and its starting stock through the existing admin-protected API:

1. Bootstrap the first admin once using `POST /admin-auth/bootstrap` with the `x-admin-bootstrap-secret` header. The bootstrap endpoint permanently closes after the first admin is created.
2. Sign in using `POST /admin-auth/login`; send the returned bearer token on admin requests.
3. Create each real ingredient and initial stock using `POST /inventory/ingredients`, for example:

```json
{
  "name": "Fresh orange",
  "description": "Fresh oranges used for juice",
  "quantity": 100,
  "unit": "kg",
  "reorderLevel": 10
}
```

4. Get the catalog variant IDs from `GET /products`.
5. Add the actual measured ingredient quantities to each variant using `POST /recipes/variants/:variantId/ingredients`:

```json
{
  "ingredientId": "DATABASE_INGREDIENT_ID",
  "quantity": 0.25
}
```

Recipe quantities use the same unit as that ingredient's inventory record. Use your real measured recipe, not the illustrative quantity above. Once a variant has a recipe and is available, it becomes addable from the menu.

Existing admin APIs:
- `GET/POST/PATCH/DELETE /categories`
- `GET/POST/PATCH/DELETE /products`
- `GET/POST/PATCH/DELETE /recipes/variants/:variantId/ingredients` (the recipe controller supports add/list/update/delete routes)
- `GET /inventory/ingredients`
- `POST /inventory/ingredients`
- `PATCH /inventory/ingredients/:id`
- `PATCH /inventory/ingredients/:id/stock`
- `GET /inventory/low-stock`
- `GET /orders/admin` and order status/payment administration routes

All admin routes above require `Authorization: Bearer <accessToken>`.

## Safepay

Set the Safepay credentials only in the backend environment:

- `SAFEPAY_ENV` (`sandbox` for testing, `production` only after provider approval)
- `SAFEPAY_SECRET_KEY`
- `SAFEPAY_API_KEY`
- `SAFEPAY_WEBHOOK_SECRET`
- `SAFEPAY_REDIRECT_URL` (frontend `/checkout/payment-return`)
- `SAFEPAY_CANCEL_URL` (frontend `/checkout/payment-cancelled`)

Configure the Safepay webhook to call `POST https://YOUR_BACKEND_HOST/payments/webhooks/safepay`. Do not treat a browser redirect alone as proof of payment; the return page calls the backend reporter verification endpoint.

## Validation boundaries

The code can be built and tested locally, but a real order requires a reachable PostgreSQL database with migrations applied and actual recipes/stock configured. A real online payment additionally requires valid Safepay sandbox or production credentials and a publicly reachable webhook URL. Do not use live payment credentials for local development.
