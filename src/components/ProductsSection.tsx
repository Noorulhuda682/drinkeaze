"use client";

import { useEffect, useState } from "react";
import ProductCard from "@/src/components/ProductCard";
import type { CatalogResponse, RestaurantCategory } from "@/src/types/catalog";

const accentClasses: Record<number, string> = {
  0: "bg-drinkeaze-mango/15 text-drinkeaze-mango",
  1: "bg-drinkeaze-mint/15 text-drinkeaze-mint",
  2: "bg-drinkeaze-berry/15 text-drinkeaze-berry",
  3: "bg-drinkeaze-dark/10 text-drinkeaze-dark",
  4: "bg-drinkeaze-sand/20 text-drinkeaze-dark",
};

const accentColors: Record<number, string> = {
  0: "#E67E22",
  1: "#1ABC9C",
  2: "#9B59B6",
  3: "#2C1810",
  4: "#D4A574",
};

function getAccentClass(index: number) {
  return accentClasses[index % 5] ?? accentClasses[0];
}

function getAccentColor(index: number) {
  return accentColors[index % 5] ?? accentColors[0];
}

export default function ProductsSection() {
  const [catalog, setCatalog] = useState<RestaurantCategory[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/catalog")
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
  }, []);

  if (loading) {
    return (
      <section id="products" className="py-16 sm:py-24 scroll-mt-20">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <div className="text-center mb-12">
            <h2 className="font-display font-bold text-3xl sm:text-4xl text-drinkeaze-dark">
              Our Menu
            </h2>
            <p className="mt-3 text-drinkeaze-dark/70 max-w-xl mx-auto font-body">
              Loading menu…
            </p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div
                key={i}
                className="rounded-2xl bg-white border border-drinkeaze-sand/30 overflow-hidden animate-pulse aspect-[4/3]"
              />
            ))}
          </div>
        </div>
      </section>
    );
  }

  if (error || !catalog || catalog.length === 0) {
    return (
      <section id="products" className="py-16 sm:py-24 scroll-mt-20">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 text-center">
          <h2 className="font-display font-bold text-3xl sm:text-4xl text-drinkeaze-dark">
            Our Menu
          </h2>
          <p className="mt-3 text-drinkeaze-dark/70 font-body">
            {error ?? "No menu available."}
          </p>
        </div>
      </section>
    );
  }

  return (
    <section id="products" className="py-16 sm:py-24 scroll-mt-20">
      <div className="max-w-6xl mx-auto px-4 sm:px-6">
        <div className="text-center mb-12">
          <h2 className="font-display font-bold text-3xl sm:text-4xl text-drinkeaze-dark">
            Our Menu
          </h2>
          <p className="mt-3 text-drinkeaze-dark/70 max-w-xl mx-auto font-body">
            Fresh juices, smoothies, parfaits & more.
          </p>
        </div>

        {catalog.map((category, categoryIndex) => (
          <div key={category.uid ?? category.name} className="mb-16 last:mb-0">
            <h3
              className="font-display font-bold text-2xl text-drinkeaze-dark mb-6"
              style={{ color: getAccentColor(categoryIndex) }}
            >
              {category.name}
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8">
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
