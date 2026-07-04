interface PlaceholderPageProps {
  title: string
}

export function PlaceholderPage({ title }: PlaceholderPageProps) {
  return (
    <main className="flex min-h-[60vh] items-center justify-center px-6 pt-24">
      <h1 className="font-heading text-[clamp(2rem,5vw,3rem)] text-text">{title}</h1>
    </main>
  )
}
