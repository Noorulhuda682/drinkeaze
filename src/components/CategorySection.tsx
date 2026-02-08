import { ReactNode } from 'react'

type CategorySectionProps = {
  id: string
  title: string
  subtitle: string
  accentColor: string
  children: ReactNode
}

export default function CategorySection({ id, title, subtitle, accentColor, children }: CategorySectionProps) {
  return (
    <section id={id} className="py-16 sm:py-24 scroll-mt-20">
      <div className="max-w-6xl mx-auto px-4 sm:px-6">
        <div className="text-center mb-12">
          <h2 className="font-display font-bold text-3xl sm:text-4xl text-drinkeaze-dark" style={{ color: accentColor }}>
            {title}
          </h2>
          <p className="mt-3 text-drinkeaze-dark/70 max-w-xl mx-auto font-body">
            {subtitle}
          </p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8">
          {children}
        </div>
      </div>
    </section>
  )
}
