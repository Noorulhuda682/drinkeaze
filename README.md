# Drinkeaze

Professional Next.js website for **Drinkeaze** — fresh parfaits, smoothies, coffees and juices in **Karachi, Pakistan**.

## Run locally

```bash
cd drinkeaze
npm install
npm run dev
```

Open [http://localhost:3001](http://localhost:3001).

## Build

```bash
npm run build
npm start
```

## Stack

- **Next.js 14** (App Router)
- **TypeScript**
- **Tailwind CSS**
- Fonts: Outfit (display), DM Sans (body)

## Pages

- **Home** — Hero banner, **Menu (products)** from `src/data/drinkeaze-products.ts`, category sections (Parfaits, Smoothies, Coffee, Juices), Karachi delivery info, and contact footer.

## Products

All menu items are defined in **`src/data/drinkeaze-products.ts`**. Edit that file to add, remove, or update products. Types are in `src/types/product.ts`. No external API — everything is handled on the frontend via this data file.

Serving **Karachi only** for now; contact and delivery info are Karachi-focused.
