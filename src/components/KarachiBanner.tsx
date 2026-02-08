export default function KarachiBanner() {
  return (
    <section className="py-12 sm:py-16 bg-drinkeaze-dark text-drinkeaze-cream">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 text-center">
        <h2 className="font-display font-bold text-2xl sm:text-3xl text-white mb-4">
          Now serving Karachi
        </h2>
        <p className="text-drinkeaze-cream/80 max-w-2xl mx-auto font-body text-sm sm:text-base">
          We deliver fresh parfaits, smoothies, coffees and juices across Karachi. Order online or visit us — your next favourite drink is just a click away.
        </p>
        <div className="mt-8 flex flex-wrap justify-center gap-6 text-sm">
          <span className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-drinkeaze-mint" /> Delivery
          </span>
          <span className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-drinkeaze-mango" /> Pick-up
          </span>
          <span className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-drinkeaze-berry" /> Dine-in
          </span>
        </div>
      </div>
    </section>
  )
}
