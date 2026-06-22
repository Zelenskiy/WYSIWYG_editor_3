import { useEffect, useRef, useState, type RefObject } from 'react'

interface Props {
  editorRef: RefObject<HTMLDivElement | null>
  onChange: () => void
}

type Dir = 'nw' | 'n' | 'ne' | 'e' | 'se' | 's' | 'sw' | 'w'
const HANDLES: Dir[] = ['nw', 'n', 'ne', 'e', 'se', 's', 'sw', 'w']

export function ImageTools({ editorRef, onChange }: Props) {
  const [img, setImg] = useState<HTMLImageElement | null>(null)
  const [, force] = useState(0)
  const dragRef = useRef<{
    dir: Dir
    startX: number
    startY: number
    startW: number
    startH: number
    ratio: number
  } | null>(null)

  // Detect clicks on images
  useEffect(() => {
    const el = editorRef.current
    if (!el) return
    const onClick = (e: MouseEvent) => {
      const t = e.target as HTMLElement
      if (t.tagName === 'IMG') {
        setImg(t as HTMLImageElement)
      } else if (!(t.closest && t.closest('.image-tools'))) {
        setImg(null)
      }
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setImg(null)
    }
    el.addEventListener('click', onClick)
    document.addEventListener('keydown', onKey)
    return () => {
      el.removeEventListener('click', onClick)
      document.removeEventListener('keydown', onKey)
    }
  }, [editorRef])

  // Reposition on scroll/resize
  useEffect(() => {
    const el = editorRef.current
    if (!el) return
    const h = () => force(x => x + 1)
    el.addEventListener('scroll', h)
    window.addEventListener('resize', h)
    return () => {
      el.removeEventListener('scroll', h)
      window.removeEventListener('resize', h)
    }
  }, [editorRef])

  // Drop selection if img removed from DOM
  useEffect(() => {
    if (!img) return
    if (!editorRef.current?.contains(img)) setImg(null)
  })

  if (!img || !editorRef.current) return null

  const editor = editorRef.current
  const iRect = img.getBoundingClientRect()
  const top = iRect.top
  const left = iRect.left
  const width = iRect.width
  const height = iRect.height
  void editor

  const startResize = (e: React.MouseEvent, dir: Dir) => {
    e.preventDefault()
    e.stopPropagation()
    img.style.maxWidth = 'none'
    dragRef.current = {
      dir,
      startX: e.clientX,
      startY: e.clientY,
      startW: iRect.width,
      startH: iRect.height,
      ratio: iRect.width / iRect.height || 1,
    }
    const onMove = (ev: MouseEvent) => {
      const r = dragRef.current
      if (!r) return
      const dx = ev.clientX - r.startX
      const dy = ev.clientY - r.startY
      let w = r.startW
      let h = r.startH
      const isCorner = r.dir.length === 2
      if (r.dir.includes('e')) w = r.startW + dx
      if (r.dir.includes('w')) w = r.startW - dx
      if (r.dir.includes('s')) h = r.startH + dy
      if (r.dir.includes('n')) h = r.startH - dy
      w = Math.max(20, w)
      h = Math.max(20, h)
      if (isCorner) {
        // Proportional
        if (Math.abs(dx) > Math.abs(dy)) h = w / r.ratio
        else w = h * r.ratio
      }
      img.style.width = Math.round(w) + 'px'
      img.style.height = Math.round(h) + 'px'
      force(x => x + 1)
    }
    const onUp = () => {
      window.removeEventListener('mousemove', onMove)
      window.removeEventListener('mouseup', onUp)
      dragRef.current = null
      onChange()
    }
    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup', onUp)
  }

  const setFloat = (val: 'left' | 'right' | 'none' | 'center') => {
    if (val === 'center') {
      img.style.float = ''
      img.style.display = 'block'
      img.style.margin = '0.5em auto'
    } else if (val === 'none') {
      img.style.float = ''
      img.style.display = ''
      img.style.margin = ''
    } else {
      img.style.float = val
      img.style.display = ''
      img.style.margin = val === 'left' ? '0 1em 0.5em 0' : '0 0 0.5em 1em'
    }
    onChange()
    force(x => x + 1)
  }

  const remove = () => {
    img.remove()
    setImg(null)
    onChange()
  }

  return (
    <div className="image-tools-wrap" onMouseDown={e => e.preventDefault()}>
      {/* Selection outline */}
      <div
        className="image-selection"
        style={{ top, left, width, height }}
      />
      {/* Resize handles */}
      {HANDLES.map(dir => {
        const style: React.CSSProperties = { position: 'absolute' }
        const HALF = 5
        if (dir.includes('n')) style.top = top - HALF
        if (dir.includes('s')) style.top = top + height - HALF
        if (!dir.includes('n') && !dir.includes('s')) style.top = top + height / 2 - HALF
        if (dir.includes('w')) style.left = left - HALF
        if (dir.includes('e')) style.left = left + width - HALF
        if (!dir.includes('w') && !dir.includes('e')) style.left = left + width / 2 - HALF
        const cursor =
          dir === 'n' || dir === 's' ? 'ns-resize' :
          dir === 'e' || dir === 'w' ? 'ew-resize' :
          dir === 'nw' || dir === 'se' ? 'nwse-resize' : 'nesw-resize'
        return (
          <div
            key={dir}
            className="image-handle"
            style={{ ...style, cursor }}
            onMouseDown={e => startResize(e, dir)}
            title={dir.length === 2 ? 'Пропорційно' : 'Розтягнути'}
          />
        )
      })}
      {/* Mini toolbar */}
      <div
        className="image-tools"
        style={{ top: Math.max(4, top - 36), left }}
      >
        <button onClick={() => setFloat('left')} title="Обтікання зліва">⬅</button>
        <button onClick={() => setFloat('center')} title="По центру">⬌</button>
        <button onClick={() => setFloat('right')} title="Обтікання справа">➡</button>
        <button onClick={() => setFloat('none')} title="Без обтікання">⊟</button>
        <span className="tt-sep" />
        <button onClick={remove} title="Видалити">🗑</button>
      </div>
    </div>
  )
}
