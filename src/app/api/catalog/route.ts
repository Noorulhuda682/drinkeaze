import { NextResponse } from "next/server";
import catalogData from "@/src/data/restaurant-catalog.json";
import type { CatalogResponse } from "@/src/types/catalog";

/**
 * GET /api/catalog
 * Returns the Drinkeaze restaurant catalog from the local data file.
 */
export async function GET() {
  return NextResponse.json(catalogData as CatalogResponse);
}
