type CategoryCardProps = {
  title: string
  description: string
  accentClass: string
  emoji: string
}

export default function CategoryCard({ title, description, accentClass, emoji }: CategoryCardProps) {
  return (
    <div className="group rounded-2xl bg-white border border-drinkeaze-sand/30 p-6 sm:p-8 shadow-sm hover:shadow-xl transition-all duration-300 hover:-translate-y-1">
      <div className={`inline-flex items-center justify-center w-14 h-14 rounded-xl ${accentClass} text-2xl mb-4`}>
        {emoji}
      </div>
      <h3 className="font-display font-semibold text-xl text-drinkeaze-dark mb-2">{title}</h3>
      <p className="text-drinkeaze-dark/70 text-sm leading-relaxed font-body">{description}</p>
    </div>
  )
}
