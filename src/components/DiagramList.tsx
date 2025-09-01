import React, { useEffect, useState } from 'react'

type DiagramItem = {
  id: string
  title?: string
  image_key?: string
  is_private?: number
  created_at?: number
}

const DiagramList: React.FC = () => {
  const [items, setItems] = useState<DiagramItem[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const load = async () => {
      try {
        const res = await fetch('/api/diagrams?limit=30')
        const json = await res.json()
        setItems(json.items || [])
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  if (loading) return null
  if (!items.length) return null

  return (
    <section className="w-full max-w-6xl mx-auto px-4 pt-6 pb-2">
      <div className="flex items-baseline justify-between mb-3">
        <h2 className="text-lg font-medium text-gray-900">最近の図解</h2>
        <a href="/" className="text-sm text-blue-600 hover:underline">更新</a>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
        {items.map((it) => (
          <a key={it.id} href={`/d/${it.id}`} className="group block bg-white border border-gray-200 rounded-lg overflow-hidden hover:shadow-sm transition-shadow">
            <div className="aspect-[16/10] bg-gray-50 overflow-hidden">
              <img
                src={`/og/${it.id}`}
                alt={it.title || 'diagram'}
                className="w-full h-full object-cover group-hover:opacity-95"
                loading="lazy"
              />
            </div>
            <div className="px-2 py-1.5">
              <div className="text-sm text-gray-900 truncate">{it.title || 'Untitled'}</div>
            </div>
          </a>
        ))}
      </div>
    </section>
  )
}

export default DiagramList

