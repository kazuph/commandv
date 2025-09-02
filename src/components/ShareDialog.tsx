import React from 'react'

type Props = {
  open: boolean
  onClose: () => void
  shareUrl: string | null
  expiresAt?: number | null
}

export default function ShareDialog({ open, onClose, shareUrl, expiresAt }: Props) {
  if (!open) return null

  const expiresText = (() => {
    if (!expiresAt) return '有効期限: 無期限'
    try {
      const d = new Date(expiresAt * 1000)
      return `有効期限: ${d.toLocaleString()}`
    } catch { return '有効期限: 無期限' }
  })()

  const copy = async () => {
    if (!shareUrl) return
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(shareUrl)
        alert('共有リンクをコピーしました')
      } else {
        const ta = document.createElement('textarea')
        ta.value = shareUrl
        document.body.appendChild(ta)
        ta.select()
        document.execCommand('copy')
        document.body.removeChild(ta)
        alert('共有リンクをコピーしました')
      }
    } catch {
      alert('コピーに失敗しました')
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-xl w-[92%] max-w-xl mx-auto p-6">
        <h3 className="text-lg font-medium mb-4">共有</h3>
        <p className="text-sm text-gray-600 mb-3">
          このリンクを知っている人だけが閲覧できます。検索結果には表示されません。
        </p>
        <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded px-2 py-1 mb-3 inline-block">{expiresText}</p>
        <div className="flex gap-2 items-center mb-4">
          <input
            type="text"
            readOnly
            value={shareUrl || ''}
            className="flex-1 rounded border border-gray-300 px-3 py-2 text-sm bg-gray-50"
            onFocus={(e) => e.currentTarget.select()}
          />
          <button onClick={copy} className="px-3 py-2 rounded bg-blue-600 text-white text-sm hover:opacity-90">コピー</button>
        </div>
        <div className="flex justify-end gap-2">
          <button onClick={onClose} className="px-3 py-2 rounded border border-gray-300 text-sm">閉じる</button>
          {shareUrl && (
            <a href={shareUrl} target="_blank" rel="noreferrer" className="px-3 py-2 rounded bg-gray-900 text-white text-sm">リンクを開く</a>
          )}
        </div>
      </div>
    </div>
  )
}
