import HeroBanner from "@/src/components/HeroBanner";
import KarachiBanner from "@/src/components/KarachiBanner";
import ProductsSection from "@/src/components/ProductsSection";

export default function Home() {
  return (
    <>
      <HeroBanner />
      <ProductsSection />
      <KarachiBanner />
    </>
  );
}
