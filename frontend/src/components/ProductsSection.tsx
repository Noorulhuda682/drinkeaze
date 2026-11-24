"use client";

import { useEffect, useState } from "react";
import ProductCard from "@/src/components/ProductCard";
import type { CatalogResponse, RestaurantCategory } from "@/src/types/catalog";

const accentClasses: Record<number, string> = {
  0: "bg-[#48CAE4]/15 text-[#0c2d38]",
  1: "bg-cyan-50 text-[#0c2d38]",
  2: "bg-sky-50 text-slate-800",
};

function getAccentClass(index: number) {
  return accentClasses[index % 3] ?? accentClasses[0];
}

type ProductsSectionProps = {
  initialCatalog?: RestaurantCategory[] | null;
};

export default function ProductsSection({ initialCatalog = null }: ProductsSectionProps) {
  const [catalog, setCatalog] = useState<RestaurantCategory[] | null>(initialCatalog);
  const [loading, setLoading] = useState(initialCatalog === null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (initialCatalog !== null) return;
    fetch("/api/catalog", { cache: "no-store" })
      .then((res) => {
        if (!res.ok) throw new Error("Failed to load menu");
        return res.json();
      })
      .then((data: CatalogResponse) => {
        const list = data?.data?.restaurantCatalog;
        setCatalog(Array.isArray(list) ? list : []);
      })
      .catch((err) => setError(err instanceof Error ? err.message : "Error"))
      .finally(() => setLoading(false));
  }, [initialCatalog]);

  if (loading) {
    return (
      <section id="products" className="py-12 sm:py-16 scroll-mt-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-8">
          <div className="w-full rounded-[20px] bg-gradient-to-r from-[#092b36] via-[#13586e] to-[#092b36] border border-[#48CAE4]/40 py-5 px-6 text-center mb-8">
            <h2 className="font-display font-bold text-xl sm:text-2xl tracking-wider uppercase text-white">
              OUR MENU
            </h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div
                key={i}
                className="h-44 rounded-[20px] bg-white border border-slate-200/80 animate-pulse"
              />
            ))}
          </div>
        </div>
      </section>
    );
  }

  if (error || !catalog || catalog.length === 0) {
    return (
      <section id="products" className="py-12 sm:py-16 scroll-mt-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-8">
          <div className="w-full rounded-[20px] bg-gradient-to-r from-[#092b36] via-[#13586e] to-[#092b36] border border-[#48CAE4]/40 py-5 px-6 text-center mb-8">
            <h2 className="font-display font-bold text-xl sm:text-2xl tracking-wider uppercase text-white">
              OUR MENU
            </h2>
          </div>
          <div className="rounded-[20px] bg-white border border-slate-200/80 p-10 text-center">
            <p className="text-sm text-slate-500">
              {error ?? "No menu available."}
            </p>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section id="products" className="py-12 sm:py-16 scroll-mt-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-8 space-y-12">
        {catalog.map((category, categoryIndex) => (
          <div key={category.uid ?? category.name}>
            <div className="w-full rounded-[20px] bg-gradient-to-r from-[#092b36] via-[#13586e] to-[#092b36] border border-[#48CAE4]/40 py-5 px-6 text-center shadow-sm mb-7">
              <h2 className="font-display font-bold text-xl sm:text-2xl tracking-wider uppercase text-white">
                {category.name}
              </h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {category.products?.map((product) => (
                <ProductCard
                  key={product.bvid ?? product.name}
                  product={product}
                  accentClass={getAccentClass(categoryIndex)}
                />
              ))}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
