import React, { useEffect, useState } from 'react'

type DiagramItem = {
  id: string
  title?: string
}

const RecentDiagramStrip: React.FC = () => {
  const [items, setItems] = useState<DiagramItem[]>([])

  useEffect(() => {
    const load = async () => {
      try {
        const res = await fetch('/api/diagrams?limit=30')
        const json = await res.json()
        setItems((json.items || []).map((x: any) => ({ id: x.id, title: x.title })))
      } catch {}
    }
    load()
  }, [])

  if (!items.length) return null

  return (
    <section className="w-full px-4 py-3 border-b border-gray-100 bg-white/70 backdrop-blur">
      <div
        className="flex gap-3 overflow-x-auto"
        style={{ scrollSnapType: 'x mandatory' }}
      >
        {items.map((it) => (
          <a
            key={it.id}
            href={`/d/${it.id}`}
            className="shrink-0 w-56 rounded-lg border border-gray-200 bg-white overflow-hidden hover:shadow-sm transition-shadow"
            style={{ scrollSnapAlign: 'start' }}
          >
            <div className="aspect-[16/10] bg-gray-50">
              <img
                src={`/og/${it.id}`}
                alt={it.title || 'diagram'}
                className="w-full h-full object-cover"
                loading="lazy"
              />
            </div>
            <div className="px-2 py-1.5 text-sm text-gray-900 truncate">
              {it.title || 'Untitled'}
            </div>
          </a>
        ))}
      </div>
    </section>
  )
}

export default RecentDiagramStrip

