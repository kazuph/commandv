import React, { useEffect, useState } from 'react'

type User = {
  id: string
  name?: string
  picture?: string
}

const UserMenu: React.FC<{ compact?: boolean }>= ({ compact = false }) => {
  const [user, setUser] = useState<User | null>(null)
  const [open, setOpen] = useState(false)

  useEffect(() => {
    let mounted = true
    const load = async () => {
      try {
        const r = await fetch('/auth/me')
        const j = await r.json()
        if (!mounted) return
        setUser(j.user || null)
      } catch { setUser(null) }
    }
    load()
    return () => { mounted = false }
  }, [])

  if (!user) {
    return (
      <a
        href="/auth/google/login"
        className="text-sm text-gray-700 hover:underline"
      >
        Googleでログイン
      </a>
    )
  }

  const handleLogout = async () => {
    try {
      await fetch('/auth/logout', { method: 'POST' })
    } catch {}
    // フルリロードで状態クリア
    window.location.href = '/'
  }

  return (
    <div className="relative group" onMouseLeave={() => setOpen(false)}>
      <button
        className="flex items-center gap-2 px-2 py-1 rounded-full hover:bg-gray-100"
        onClick={() => setOpen((v) => !v)}
      >
        <img src={user.picture || ''} alt={user.name || 'user'} className="w-6 h-6 rounded-full bg-gray-200 object-cover"/>
        {!compact && (
          <span className="text-sm text-gray-800 max-w-[160px] truncate">{user.name || 'User'}</span>
        )}
      </button>
      <div
        className={`absolute right-0 mt-2 w-32 bg-white border border-gray-200 rounded-md shadow-lg hidden group-hover:block ${open ? '!block' : ''}`}
      >
        <button
          className="w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-gray-50"
          onClick={handleLogout}
        >
          ログアウト
        </button>
      </div>
    </div>
  )
}

export default UserMenu

