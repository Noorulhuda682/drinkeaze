import Link from 'next/link'

export default function Footer() {
  return (
    <footer id="contact" className="bg-drinkeaze-dark text-drinkeaze-cream">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-12 sm:py-16">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-10">
          <div>
            <h3 className="font-display font-bold text-2xl text-white mb-4">Drinkeaze</h3>
            <p className="text-drinkeaze-cream/80 text-sm leading-relaxed">
              Fresh juices, smoothies, parfaits & coffee. Proudly serving Karachi, Pakistan.
            </p>
          </div>
          <div>
            <h4 className="font-display font-semibold text-white mb-3">Quick links</h4>
            <ul className="space-y-2">
              <li>
                <Link href="/#products" className="text-drinkeaze-cream/80 hover:text-drinkeaze-mint transition text-sm">
                  Menu
                </Link>
              </li>
              <li>
                <Link href="/cart" className="text-drinkeaze-cream/80 hover:text-drinkeaze-mint transition text-sm">
                  Cart
                </Link>
              </li>
              <li>
                <Link href="/#contact" className="text-drinkeaze-cream/80 hover:text-drinkeaze-mint transition text-sm">
                  Contact
                </Link>
              </li>
            </ul>
          </div>
          <div>
            <h4 className="font-display font-semibold text-white mb-3">Karachi</h4>
            <p className="text-drinkeaze-cream/80 text-sm">
              We deliver across Karachi. Order online or visit our outlet.
            </p>
          </div>
          <div>
            <h4 className="font-display font-semibold text-white mb-3">Contact</h4>
            <ul className="space-y-2 text-sm text-drinkeaze-cream/80">
              <li>
                <a href="tel:+923001234567" className="hover:text-drinkeaze-mint transition">+92 300 1234567</a>
              </li>
              <li>
                <a href="mailto:hello@drinkeaze.pk" className="hover:text-drinkeaze-mint transition">hello@drinkeaze.pk</a>
              </li>
            </ul>
          </div>
        </div>
        <div className="mt-12 pt-8 border-t border-white/10 text-center text-drinkeaze-cream/60 text-sm">
          © {new Date().getFullYear()} Drinkeaze. Serving Karachi, Pakistan.
        </div>
      </div>
    </footer>
  )
}
