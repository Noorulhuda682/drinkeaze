"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

const HERO_SLIDES = [
  {
    title: "Layered Berry Parfait Cups",
    subtitle: "Creamy yogurt, crisp granola & vibrant berries layered fresh for Karachi.",
    imageUrl:
      "https://images.unsplash.com/photo-1488477181946-6428a0291777?auto=format&fit=crop&w=1600&q=80",
  },
  {
    title: "Chilled Orange & Citrus Juice Cups",
    subtitle: "Freshly pressed citrus cups served cold for an instant refreshment boost.",
    imageUrl:
      "https://images.unsplash.com/photo-1613478223719-2ab802602423?auto=format&fit=crop&w=1600&q=80",
  },
  {
    title: "Yogurt & Granola Parfait Cups",
    subtitle: "Rich layered parfait cups with sweet fruit & toasted crunch.",
    imageUrl:
      "https://images.unsplash.com/photo-1505252585461-04db1eb84625?auto=format&fit=crop&w=1600&q=80",
  },
  {
    title: "Fresh Tropical Juice Cups",
    subtitle: "Smooth, vibrant juice cups blended fresh and delivered across Karachi.",
    imageUrl:
      "https://images.unsplash.com/photo-1622597467836-f3285f2131b8?auto=format&fit=crop&w=1600&q=80",
  },
  {
    title: "Berry & Cream Parfait Cups",
    subtitle: "Chilled parfait cups crafted for bright flavor and smooth texture.",
    imageUrl:
      "https://images.unsplash.com/photo-1571212515416-fef01fc43637?auto=format&fit=crop&w=1600&q=80",
  },
  {
    title: "Cold-Pressed Juice Cups",
    subtitle: "Crisp, chilled juice cups made to order with Cash on Delivery or online pay.",
    imageUrl:
      "https://images.unsplash.com/photo-1600271886742-f049cd451bba?auto=format&fit=crop&w=1600&q=80",
  },
];

export default function HeroBanner() {
  const [activeIndex, setActiveIndex] = useState(0);
  const [paused, setPaused] = useState(false);

  useEffect(() => {
    if (paused) return;
    const timer = window.setInterval(() => {
      setActiveIndex((prev) => (prev + 1) % HERO_SLIDES.length);
    }, 3000);
    return () => window.clearInterval(timer);
  }, [paused]);

  const goPrev = () => {
    setActiveIndex((prev) => (prev - 1 + HERO_SLIDES.length) % HERO_SLIDES.length);
  };

  const goNext = () => {
    setActiveIndex((prev) => (prev + 1) % HERO_SLIDES.length);
  };

  const currentSlide = HERO_SLIDES[activeIndex] ?? HERO_SLIDES[0];

  return (
    <section
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      className="relative w-full overflow-hidden bg-[#05141a] text-white border-b border-[#48CAE4]/30"
    >
      <div className="relative min-h-[450px] sm:min-h-[510px] lg:min-h-[550px] w-full flex flex-col justify-center overflow-hidden">
        {/* Right-to-left sliding parfait & juice cup images */}
        {HERO_SLIDES.map((slide, idx) => {
          const total = HERO_SLIDES.length;
          const offset = (idx - activeIndex + total) % total;

          let translateClass = "translate-x-full";
          let opacityClass = "opacity-0";
          let zClass = "z-0";

          if (offset === 0) {
            translateClass = "translate-x-0";
            opacityClass = "opacity-100";
            zClass = "z-[1]";
          } else if (offset === total - 1) {
            translateClass = "-translate-x-full";
            opacityClass = "opacity-0";
            zClass = "z-0";
          }

          return (
            <div
              key={slide.title}
              aria-hidden={offset !== 0}
              className={`absolute inset-0 transition-all duration-500 ease-out will-change-transform pointer-events-none ${translateClass} ${opacityClass} ${zClass}`}
            >
              <img
                src={slide.imageUrl}
                alt={slide.title}
                className="h-full w-full object-cover"
              />
            </div>
          );
        })}

        {/* Balanced gradient scrim: keeps images clearly visible while text stays sharp */}
        <div
          aria-hidden
          className="absolute inset-0 z-[2] bg-gradient-to-r from-[#041218]/78 via-[#06222c]/45 to-transparent"
        />
        <div
          aria-hidden
          className="absolute inset-0 z-[2] bg-gradient-to-t from-[#041218]/70 via-transparent to-[#041218]/25"
        />

        {/* Vertically centered frameless foreground typography */}
        <div className="relative z-10 w-full max-w-7xl mx-auto px-12 sm:px-20 lg:px-24 my-auto py-12">
          <div className="max-w-2xl flex flex-col justify-center">
            <div className="inline-flex w-fit items-center gap-2 px-3.5 py-1 rounded-full bg-[#061c24]/75 border border-[#48CAE4]/50 text-[#48CAE4] text-xs font-semibold tracking-wide mb-4 backdrop-blur-sm">
              <span className="h-2 w-2 rounded-full bg-[#48CAE4]" />
              {currentSlide.title}
            </div>

            <h1
              className="font-display font-bold text-5xl sm:text-6xl lg:text-7xl tracking-tight leading-[1.03] text-white"
              style={{ textShadow: "0 6px 24px rgba(0, 0, 0, 0.75)" }}
            >
              Drinkeaze
            </h1>

            <p
              className="mt-4 text-base sm:text-lg lg:text-xl text-white max-w-xl leading-relaxed font-medium"
              style={{ textShadow: "0 4px 18px rgba(0, 0, 0, 0.8)" }}
            >
              {currentSlide.subtitle}
            </p>

            <div className="mt-8 flex flex-wrap items-center gap-3.5">
              <Link
                href="/#products"
                className="inline-flex items-center justify-center px-7 py-3.5 rounded-full bg-[#48CAE4] hover:bg-[#32b4cf] text-slate-950 font-bold text-sm transition shadow-lg shadow-black/30"
              >
                Explore Menu
              </Link>
              <Link
                href="/cart"
                className="inline-flex items-center justify-center px-7 py-3.5 rounded-full bg-[#061c24]/75 hover:bg-[#092936] backdrop-blur-md border border-[#48CAE4]/50 text-white font-semibold text-sm transition"
              >
                View Cart
              </Link>
            </div>
          </div>
        </div>

        {/* Left & Right Navigation Buttons */}
        <button
          type="button"
          onClick={goPrev}
          aria-label="Previous hero slide"
          className="group flex items-center justify-center absolute left-3 sm:left-5 lg:left-7 top-1/2 -translate-y-1/2 z-20 h-11 w-11 sm:h-12 sm:w-12 rounded-full bg-[#061c24]/80 hover:bg-[#48CAE4] text-[#48CAE4] hover:text-slate-950 border border-[#48CAE4]/50 backdrop-blur-md shadow-[0_10px_30px_rgba(0,0,0,0.45)] hover:shadow-[0_0_24px_rgba(72,202,228,0.55)] hover:scale-105 active:scale-95 transition-all duration-200"
        >
          <svg
            className="w-5 h-5 transition-transform duration-200 group-hover:-translate-x-0.5"
            fill="none"
            stroke="currentColor"
            strokeWidth={2.5}
            viewBox="0 0 24 24"
            aria-hidden
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
        </button>

        <button
          type="button"
          onClick={goNext}
          aria-label="Next hero slide"
          className="group flex items-center justify-center absolute right-3 sm:right-5 lg:right-7 top-1/2 -translate-y-1/2 z-20 h-11 w-11 sm:h-12 sm:w-12 rounded-full bg-[#061c24]/80 hover:bg-[#48CAE4] text-[#48CAE4] hover:text-slate-950 border border-[#48CAE4]/50 backdrop-blur-md shadow-[0_10px_30px_rgba(0,0,0,0.45)] hover:shadow-[0_0_24px_rgba(72,202,228,0.55)] hover:scale-105 active:scale-95 transition-all duration-200"
        >
          <svg
            className="w-5 h-5 transition-transform duration-200 group-hover:translate-x-0.5"
            fill="none"
            stroke="currentColor"
            strokeWidth={2.5}
            viewBox="0 0 24 24"
            aria-hidden
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
          </svg>
        </button>

        {/* Bottom slide indicator dots */}
        <div className="absolute bottom-4 left-0 right-0 z-20 flex items-center justify-center px-4">
          <div className="flex items-center gap-2 bg-[#061920]/75 backdrop-blur-md px-3.5 py-2 rounded-full border border-[#48CAE4]/30">
            {HERO_SLIDES.map((slide, idx) => {
              const active = idx === activeIndex;
              return (
                <button
                  key={slide.title}
                  type="button"
                  onClick={() => setActiveIndex(idx)}
                  aria-label={`Show ${slide.title}`}
                  className={`h-2.5 rounded-full transition-all ${
                    active ? "w-7 bg-[#48CAE4]" : "w-2.5 bg-white/40 hover:bg-white/70"
                  }`}
                />
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}
