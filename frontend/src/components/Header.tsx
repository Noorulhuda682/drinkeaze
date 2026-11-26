"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import CartIcon from "@/src/components/CartIcon";

const navLinks = [
  { href: "/", label: "Home" },
  { href: "/#products", label: "Menu" },
  { href: "/#contact", label: "Contact" },
  { href: "/admin", label: "Admin" },
];

export default function Header() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  if (pathname?.startsWith("/admin")) {
    return null;
  }

  return (
    <header className="sticky top-0 z-50 bg-white/95 backdrop-blur border-b border-slate-200/80">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 flex items-center justify-between h-16">
        <Link
          href="/"
          className="flex items-center gap-2.5 font-display font-bold text-xl text-slate-900 tracking-tight"
        >
          <span className="h-8 w-8 rounded-full bg-[#48CAE4] text-slate-950 flex items-center justify-center text-sm font-bold shadow-sm">
            D
          </span>
          <span>Drinkeaze</span>
        </Link>
        <nav className="hidden md:flex items-center gap-6">
          {navLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="text-sm font-medium text-slate-600 hover:text-[#48CAE4] transition"
            >
              {link.label}
            </Link>
          ))}
          <CartIcon />
        </nav>
        <div className="flex items-center gap-2 md:hidden">
          <CartIcon />
          <button
            type="button"
            className="p-2 rounded-xl text-slate-700 hover:bg-slate-100"
            onClick={() => setOpen(!open)}
            aria-label="Toggle navigation menu"
          >
            <svg
              className="w-6 h-6"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              {open ? (
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              ) : (
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 6h16M4 12h16M4 18h16"
                />
              )}
            </svg>
          </button>
        </div>
      </div>
      {open && (
        <nav className="md:hidden border-t border-slate-200/80 bg-white py-3 px-4 flex flex-col gap-1">
          {navLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="text-sm font-medium text-slate-700 hover:text-[#48CAE4] py-2 px-2 rounded-lg"
              onClick={() => setOpen(false)}
            >
              {link.label}
            </Link>
          ))}
          <Link
            href="/cart"
            className="text-sm font-medium text-slate-700 hover:text-[#48CAE4] py-2 px-2 rounded-lg"
            onClick={() => setOpen(false)}
          >
            Cart
          </Link>
        </nav>
      )}
    </header>
  );
}
