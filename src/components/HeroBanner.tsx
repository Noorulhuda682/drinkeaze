import Link from "next/link";

export default function HeroBanner() {
  return (
    <section className="relative min-h-[85vh] flex items-center justify-center overflow-hidden bg-gradient-to-br from-drinkeaze-mango/15 via-drinkeaze-cream to-drinkeaze-mint/20">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_60%_at_50%_0%,var(--drinkeaze-mango)_0%,transparent_50%)] opacity-20" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_60%_40%_at_80%_100%,var(--drinkeaze-mint)_0%,transparent_50%)] opacity-15" />
      <div className="absolute top-20 left-10 w-40 h-40 rounded-full bg-drinkeaze-berry/10 blur-3xl" />
      <div className="absolute bottom-20 right-10 w-60 h-60 rounded-full bg-drinkeaze-mango/10 blur-3xl" />

      <div className="relative z-10 text-center px-4 max-w-4xl mx-auto">
        <p className="font-body text-drinkeaze-mango font-semibold tracking-widest uppercase text-sm mb-4 animate-fade-in">
          Fresh in Karachi
        </p>
        <h1 className="font-display font-bold text-5xl sm:text-6xl md:text-7xl lg:text-8xl text-drinkeaze-dark tracking-tight animate-slide-up">
          Drinkeaze
        </h1>
        <p
          className="mt-6 text-lg sm:text-xl text-drinkeaze-dark/70 max-w-xl mx-auto font-body animate-slide-up"
          style={{ animationDelay: "0.1s" }}
        >
          Parfaits, smoothies, coffee & juices — made fresh. Delivered across
          Karachi.
        </p>
        <div
          className="mt-10 flex flex-wrap items-center justify-center gap-4 animate-slide-up"
          style={{ animationDelay: "0.2s" }}
        >
          <Link
            href="/#parfaits"
            className="inline-flex items-center justify-center px-6 py-3 rounded-full bg-drinkeaze-mango text-white font-semibold hover:bg-drinkeaze-mango/90 transition shadow-lg shadow-drinkeaze-mango/25"
          >
            Order now
          </Link>
          <Link
            href="/#contact"
            className="inline-flex items-center justify-center px-6 py-3 rounded-full border-2 border-drinkeaze-dark/20 text-drinkeaze-dark font-semibold hover:border-drinkeaze-mango hover:text-drinkeaze-mango transition"
          >
            Find us
          </Link>
        </div>
      </div>
    </section>
  );
}
