import HeroBanner from "@/src/components/HeroBanner";
import CategorySection from "@/src/components/CategorySection";
import CategoryCard from "@/src/components/CategoryCard";
import KarachiBanner from "@/src/components/KarachiBanner";

const categories = [
  {
    id: "parfaits",
    title: "Parfaits",
    subtitle:
      "Layered goodness with fresh fruits, granola and yogurt. Perfect any time of day.",
    accentColor: "#9B59B6",
    items: [
      {
        title: "Berry Parfait",
        description: "Mixed berries, honey granola and creamy yogurt.",
        emoji: "🫐",
      },
      {
        title: "Tropical Parfait",
        description: "Mango, coconut and passion fruit layers.",
        emoji: "🥭",
      },
      {
        title: "Classic Parfait",
        description: "Strawberry, banana and house granola.",
        emoji: "🍓",
      },
    ],
  },
  {
    id: "smoothies",
    title: "Smoothies",
    subtitle:
      "Blended fresh fruits and superfoods. Thick, cold and full of flavour.",
    accentColor: "#1ABC9C",
    items: [
      {
        title: "Green Smoothie",
        description: "Spinach, apple, banana and a hint of lime.",
        emoji: "🥬",
      },
      {
        title: "Berry Blast",
        description: "Strawberry, blueberry, raspberry and yogurt.",
        emoji: "🫐",
      },
      {
        title: "Tropical Smoothie",
        description: "Mango, pineapple, coconut and banana.",
        emoji: "🍍",
      },
    ],
  },
  {
    id: "coffee",
    title: "Coffee",
    subtitle:
      "Espresso-based drinks and cold brews. Sourced and brewed with care.",
    accentColor: "#2C1810",
    items: [
      {
        title: "Espresso",
        description: "Single or double shot, hot or iced.",
        emoji: "☕",
      },
      {
        title: "Cold Brew",
        description: "Smooth, slow-steeped and served chilled.",
        emoji: "🧊",
      },
      {
        title: "Specialty Lattes",
        description: "Oat, almond or regular milk — your way.",
        emoji: "🥛",
      },
    ],
  },
  {
    id: "juices",
    title: "Juices",
    subtitle:
      "Cold-pressed and freshly squeezed. No added sugar, just real fruit.",
    accentColor: "#E67E22",
    items: [
      {
        title: "Orange Juice",
        description: "Freshly squeezed, pulp or no pulp.",
        emoji: "🍊",
      },
      {
        title: "Green Detox",
        description: "Cucumber, celery, apple and lemon.",
        emoji: "🥒",
      },
      {
        title: "Watermelon Mint",
        description: "Refreshing summer favourite.",
        emoji: "🍉",
      },
    ],
  },
];

const accentClasses: Record<string, string> = {
  parfaits: "bg-drinkeaze-berry/15 text-drinkeaze-berry",
  smoothies: "bg-drinkeaze-mint/15 text-drinkeaze-mint",
  coffee: "bg-drinkeaze-dark/10 text-drinkeaze-dark",
  juices: "bg-drinkeaze-mango/15 text-drinkeaze-mango",
};

export default function Home() {
  return (
    <>
      <HeroBanner />
      {categories.map((cat) => (
        <CategorySection
          key={cat.id}
          id={cat.id}
          title={cat.title}
          subtitle={cat.subtitle}
          accentColor={cat.accentColor}
        >
          {cat.items.map((item) => (
            <CategoryCard
              key={item.title}
              title={item.title}
              description={item.description}
              accentClass={
                accentClasses[cat.id] ??
                "bg-drinkeaze-sand/20 text-drinkeaze-dark"
              }
              emoji={item.emoji}
            />
          ))}
        </CategorySection>
      ))}
      <KarachiBanner />
    </>
  );
}
