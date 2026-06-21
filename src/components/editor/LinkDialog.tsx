import { useState } from 'react'

interface Props {
  onInsert: (url: string, text: string) => void
  onClose: () => void
}

export function LinkDialog({ onInsert, onClose }: Props) {
  const [url, setUrl] = useState('https://')
  const [text, setText] = useState('')

  return (
    <div className="dialog-overlay" onClick={e => { if (e.target === e.currentTarget) onClose() }}>
      <div className="dialog">
        <h3>Вставити посилання</h3>
        <label>URL</label>
        <input
          type="url"
          value={url}
          onChange={e => setUrl(e.target.value)}
          placeholder="https://example.com"
          autoFocus
          onKeyDown={e => { if (e.key === 'Enter') onInsert(url, text) }}
        />
        <label>Текст посилання (необов'язково)</label>
        <input
          type="text"
          value={text}
          onChange={e => setText(e.target.value)}
          placeholder="Залиште порожнім для URL"
          onKeyDown={e => { if (e.key === 'Enter') onInsert(url, text) }}
        />
        <div className="dialog-actions">
          <button className="btn-cancel" onClick={onClose}>Скасувати</button>
          <button className="btn-ok" onClick={() => onInsert(url, text)} disabled={!url}>Вставити</button>
        </div>
      </div>
    </div>
  )
}
