export default function KarachiBanner() {
  return (
    <section className="px-4 sm:px-6 py-4">
      <div className="max-w-6xl mx-auto rounded-[22px] bg-white border border-slate-200/80 px-6 py-8 sm:px-10 flex flex-col md:flex-row items-center justify-between gap-6">
        <div>
          <h2 className="font-display font-bold text-xl sm:text-2xl text-slate-900">
            Now serving Karachi
          </h2>
          <p className="text-slate-500 text-sm mt-1 max-w-xl">
            Fresh parfaits, smoothies, coffees and juices prepared to order with live kitchen fulfillment.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-4 text-xs font-semibold text-slate-700">
          <span className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#f8f9fa] border border-slate-200/80">
            <span className="w-2 h-2 rounded-full bg-[#48CAE4]" /> Delivery
          </span>
          <span className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#f8f9fa] border border-slate-200/80">
            <span className="w-2 h-2 rounded-full bg-[#48CAE4]" /> Pick-up
          </span>
          <span className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#f8f9fa] border border-slate-200/80">
            <span className="w-2 h-2 rounded-full bg-slate-800" /> Freshly Made
          </span>
        </div>
      </div>
    </section>
  )
}
