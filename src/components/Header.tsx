'use client'

import Link from 'next/link'
import { useState } from 'react'

const navLinks = [
  { href: '/', label: 'Home' },
  { href: '/#parfaits', label: 'Parfaits' },
  { href: '/#smoothies', label: 'Smoothies' },
  { href: '/#coffee', label: 'Coffee' },
  { href: '/#juices', label: 'Juices' },
  { href: '/#contact', label: 'Contact' },
]

export default function Header() {
  const [open, setOpen] = useState(false)

  return (
    <header className="sticky top-0 z-50 bg-drinkeaze-cream/95 backdrop-blur border-b border-drinkeaze-sand/30">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 flex items-center justify-between h-16 sm:h-18">
        <Link
          href="/"
          className="font-display font-bold text-xl sm:text-2xl text-drinkeaze-dark tracking-tight"
        >
          Drinkeaze
        </Link>
        <nav className="hidden md:flex items-center gap-8">
          {navLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="text-drinkeaze-dark/80 hover:text-drinkeaze-mango font-medium transition"
            >
              {link.label}
            </Link>
          ))}
        </nav>
        <button
          type="button"
          className="md:hidden p-2 rounded-lg text-drinkeaze-dark"
          onClick={() => setOpen(!open)}
          aria-label="Toggle menu"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            {open ? (
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            ) : (
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            )}
          </svg>
        </button>
      </div>
      {open && (
        <nav className="md:hidden border-t border-drinkeaze-sand/30 bg-drinkeaze-cream py-4 px-4 flex flex-col gap-3">
          {navLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="text-drinkeaze-dark/90 hover:text-drinkeaze-mango font-medium py-2"
              onClick={() => setOpen(false)}
            >
              {link.label}
            </Link>
          ))}
        </nav>
      )}
    </header>
  )
}
