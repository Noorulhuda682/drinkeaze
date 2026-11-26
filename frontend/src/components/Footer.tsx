import Link from "next/link";

export default function Footer() {
  return (
    <footer
      id="contact"
      className="bg-white border-t border-slate-200/80 text-slate-600 mt-12"
    >
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-12">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
          <div>
            <div className="flex items-center gap-2 mb-3">
              <span className="h-7 w-7 rounded-full bg-[#48CAE4] text-slate-950 flex items-center justify-center text-xs font-bold">
                D
              </span>
              <h3 className="font-display font-bold text-lg text-slate-900">
                Drinkeaze
              </h3>
            </div>
            <p className="text-slate-500 text-sm leading-relaxed">
              Fresh juices, smoothies, parfaits & coffee. Proudly serving
              Karachi, Pakistan.
            </p>
          </div>
          <div>
            <h4 className="font-display font-semibold text-sm text-slate-900 mb-3">
              Quick links
            </h4>
            <ul className="space-y-2 text-sm">
              <li>
                <Link
                  href="/#products"
                  className="text-slate-500 hover:text-[#48CAE4] transition"
                >
                  Menu
                </Link>
              </li>
              <li>
                <Link
                  href="/cart"
                  className="text-slate-500 hover:text-[#48CAE4] transition"
                >
                  Cart
                </Link>
              </li>
              <li>
                <Link
                  href="/checkout"
                  className="text-slate-500 hover:text-[#48CAE4] transition"
                >
                  Checkout
                </Link>
              </li>
            </ul>
          </div>
          <div>
            <h4 className="font-display font-semibold text-sm text-slate-900 mb-3">
              Operations
            </h4>
            <ul className="space-y-2 text-sm">
              <li>
                <Link
                  href="/admin"
                  className="text-slate-500 hover:text-[#48CAE4] transition"
                >
                  Admin Dashboard
                </Link>
              </li>
              <li className="text-slate-500">Karachi Cloud Kitchen</li>
            </ul>
          </div>
          <div>
            <h4 className="font-display font-semibold text-sm text-slate-900 mb-3">
              Service
            </h4>
            <p className="text-slate-500 text-sm">
              Freshly blended on order with Cash on Delivery & online payment
              support.
            </p>
          </div>
        </div>
        <div className="border-t border-slate-200/70 mt-8 pt-6 text-center text-xs text-slate-400">
          © {new Date().getFullYear()} Drinkeaze. All rights reserved.
        </div>
      </div>
    </footer>
  );
}
