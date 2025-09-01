import React, { useEffect, useState } from 'react'

type DiagramItem = {
  id: string
  title?: string
}

const RecentDiagramStrip: React.FC = () => {
  const [items, setItems] = useState<DiagramItem[]>([])
  const [me, setMe] = useState<any>(null)
  const [msg, setMsg] = useState<string | null>(null)

  useEffect(() => {
    const load = async () => {
      try {
        const meRes = await fetch('/auth/me')
        const meJson = await meRes.json()
        if (!meJson.user) { setMe(null); setItems([]); return }
        setMe(meJson.user)
        const res = await fetch('/api/diagrams?limit=30')
        const json = await res.json()
        setItems((json.items || []).map((x: any) => ({ id: x.id, title: x.title })))
      } catch {}
    }
    load()
  }, [])

  if (!me || !items.length) return null

  return (
    <section className="w-full px-4 py-3 border-b border-gray-100 bg-white/70 backdrop-blur">
      <div
        className="flex gap-3 overflow-x-auto"
        style={{ scrollSnapType: 'x mandatory' }}
      >
        {items.map((it) => (
          <div
            key={it.id}
            className="relative shrink-0 w-56 rounded-lg border border-gray-200 bg-white overflow-hidden hover:shadow-sm transition-shadow"
            style={{ scrollSnapAlign: 'start' }}
          >
            <a href={`/d/${it.id}`} className="block">
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
            <button
              className="absolute top-1.5 right-1.5 w-6 h-6 rounded-full bg-white/90 text-gray-700 border border-gray-300 hover:bg-white"
              aria-label="削除"
              onClick={async (e) => {
                e.preventDefault(); e.stopPropagation();
                if (!confirm('この図解を削除しますか？')) return
                try {
                  const r = await fetch(`/api/diagrams/${it.id}`, { method: 'DELETE' })
                  if (r.ok) {
                    setItems((prev) => prev.filter((x) => x.id !== it.id))
                    setMsg('削除しました')
                    setTimeout(() => setMsg(null), 2000)
                  } else {
                    setMsg('削除に失敗しました')
                    setTimeout(() => setMsg(null), 2000)
                  }
                } catch {
                  setMsg('削除に失敗しました')
                  setTimeout(() => setMsg(null), 2000)
                }
              }}
            >
              ×
            </button>
          </div>
        ))}
      </div>
      {msg && (
        <div className="mt-2 text-sm text-gray-600">{msg}</div>
      )}
    </section>
  )
}

export default RecentDiagramStrip
