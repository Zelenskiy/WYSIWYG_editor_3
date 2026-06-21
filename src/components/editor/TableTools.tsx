import { useEffect, useRef, useState, type RefObject } from 'react'

interface Props {
  editorRef: RefObject<HTMLDivElement | null>
  onChange: () => void
}

const PALETTE = [
  'transparent', '#ffffff', '#f5f5f5', '#fde2e2', '#fdebc1', '#e2f0d9',
  '#d6eaf8', '#e6dcf0', '#fad7a0', '#a9dfbf', '#aed6f1', '#f1948a',
]

/* ── Cell / row / column helpers ── */
function getCurrentCell(editor: HTMLElement | null): HTMLTableCellElement | null {
  if (!editor) return null
  const sel = window.getSelection()
  if (!sel || sel.rangeCount === 0) return null
  let node: Node | null = sel.getRangeAt(0).startContainer
  while (node && node !== editor) {
    if (node instanceof HTMLTableCellElement) return node
    node = node.parentNode
  }
  return null
}

function getTable(cell: HTMLTableCellElement): HTMLTableElement | null {
  let n: HTMLElement | null = cell
  while (n && n.tagName !== 'TABLE') n = n.parentElement
  return n as HTMLTableElement | null
}

function cellIndex(cell: HTMLTableCellElement): number {
  return Array.from(cell.parentElement!.children).indexOf(cell)
}

export function TableTools({ editorRef, onChange }: Props) {
  const cell = getCurrentCell(editorRef.current)
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null)
  const [showPalette, setShowPalette] = useState(false)
  const resizingRef = useRef<{ th: HTMLElement; startX: number; startW: number } | null>(null)

  /* Position the toolbar above the current table */
  useEffect(() => {
    if (!cell || !editorRef.current) { setPos(null); return }
    const table = getTable(cell)
    if (!table) { setPos(null); return }
    const tRect = table.getBoundingClientRect()
    const eRect = editorRef.current.getBoundingClientRect()
    setPos({
      top: tRect.top - eRect.top - 38 + editorRef.current.scrollTop,
      left: tRect.left - eRect.left + editorRef.current.scrollLeft,
    })
  }, [cell, editorRef])

  /* Attach column-resize handles to header row */
  useEffect(() => {
    const root = editorRef.current
    if (!root) return
    root.querySelectorAll('table').forEach(tbl => {
      const firstRow = tbl.querySelector('tr')
      if (!firstRow) return
      Array.from(firstRow.children).forEach(c => {
        const td = c as HTMLTableCellElement
        if (td.querySelector(':scope > .col-resize-handle')) return
        const handle = document.createElement('span')
        handle.className = 'col-resize-handle'
        handle.contentEditable = 'false'
        handle.addEventListener('mousedown', e => {
          e.preventDefault()
          resizingRef.current = {
            th: td,
            startX: (e as MouseEvent).clientX,
            startW: td.getBoundingClientRect().width,
          }
        })
        td.appendChild(handle)
      })
    })

    const onMove = (e: MouseEvent) => {
      const r = resizingRef.current
      if (!r) return
      const w = Math.max(24, r.startW + (e.clientX - r.startX))
      r.th.style.width = w + 'px'
    }
    const onUp = () => {
      if (resizingRef.current) {
        resizingRef.current = null
        onChange()
      }
    }
    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup', onUp)
    return () => {
      window.removeEventListener('mousemove', onMove)
      window.removeEventListener('mouseup', onUp)
    }
  })

  if (!cell || !pos) return null

  const table = getTable(cell)
  if (!table) return null
  const row = cell.parentElement as HTMLTableRowElement
  const colIdx = cellIndex(cell)

  const refresh = () => { onChange() }

  /* ── Mutations ── */
  const addRowBelow = () => {
    const cols = row.children.length
    const newRow = row.parentElement!.insertBefore(
      document.createElement('tr'),
      row.nextSibling
    )
    for (let i = 0; i < cols; i++) {
      const td = document.createElement('td')
      td.innerHTML = '&nbsp;'
      newRow.appendChild(td)
    }
    refresh()
  }
  const addRowAbove = () => {
    const cols = row.children.length
    const newRow = row.parentElement!.insertBefore(document.createElement('tr'), row)
    for (let i = 0; i < cols; i++) {
      const td = document.createElement('td')
      td.innerHTML = '&nbsp;'
      newRow.appendChild(td)
    }
    refresh()
  }
  const delRow = () => {
    if (table.rows.length <= 1) { table.remove() } else { row.remove() }
    refresh()
  }
  const addColAfter = () => {
    Array.from(table.rows).forEach(r => {
      const ref = r.children[colIdx] as HTMLElement | undefined
      const td = document.createElement(r === table.rows[0] && r.querySelector('th') ? 'th' : 'td')
      td.innerHTML = '&nbsp;'
      r.insertBefore(td, ref ? ref.nextSibling : null)
    })
    refresh()
  }
  const addColBefore = () => {
    Array.from(table.rows).forEach(r => {
      const ref = r.children[colIdx] as HTMLElement | undefined
      const td = document.createElement(r === table.rows[0] && r.querySelector('th') ? 'th' : 'td')
      td.innerHTML = '&nbsp;'
      r.insertBefore(td, ref ?? null)
    })
    refresh()
  }
  const delCol = () => {
    if ((table.rows[0]?.children.length ?? 0) <= 1) { table.remove(); refresh(); return }
    Array.from(table.rows).forEach(r => {
      const c = r.children[colIdx]
      if (c) r.removeChild(c)
    })
    refresh()
  }
  const delTable = () => { table.remove(); refresh() }

  /* Merge right / down — colspan / rowspan */
  const mergeRight = () => {
    const next = cell.nextElementSibling as HTMLTableCellElement | null
    if (!next) return
    const newSpan = (cell.colSpan || 1) + (next.colSpan || 1)
    cell.colSpan = newSpan
    if (next.innerHTML.replace(/&nbsp;|\s/g, '')) {
      cell.innerHTML = (cell.innerHTML + ' ' + next.innerHTML).trim()
    }
    next.remove()
    refresh()
  }
  const mergeDown = () => {
    const nextRow = row.nextElementSibling as HTMLTableRowElement | null
    if (!nextRow) return
    const below = nextRow.children[colIdx] as HTMLTableCellElement | undefined
    if (!below) return
    cell.rowSpan = (cell.rowSpan || 1) + (below.rowSpan || 1)
    if (below.innerHTML.replace(/&nbsp;|\s/g, '')) {
      cell.innerHTML = (cell.innerHTML + ' ' + below.innerHTML).trim()
    }
    below.remove()
    refresh()
  }
  const splitCell = () => {
    const cs = cell.colSpan || 1
    const rs = cell.rowSpan || 1
    cell.colSpan = 1
    cell.rowSpan = 1
    // restore extra cells in same row
    for (let i = 1; i < cs; i++) {
      const td = document.createElement('td')
      td.innerHTML = '&nbsp;'
      row.insertBefore(td, cell.nextSibling)
    }
    // restore extra rows below
    for (let r = 1; r < rs; r++) {
      const targetRow = (() => {
        let cur = row as HTMLTableRowElement | null
        for (let i = 0; i < r; i++) cur = cur?.nextElementSibling as HTMLTableRowElement | null
        return cur
      })()
      if (!targetRow) continue
      for (let i = 0; i < cs; i++) {
        const td = document.createElement('td')
        td.innerHTML = '&nbsp;'
        const ref = targetRow.children[colIdx] as HTMLElement | undefined
        targetRow.insertBefore(td, ref ?? null)
      }
    }
    refresh()
  }

  const fillColor = (c: string) => {
    if (c === 'transparent') cell.style.removeProperty('background-color')
    else cell.style.backgroundColor = c
    setShowPalette(false)
    refresh()
  }

  return (
    <div
      className="table-tools"
      style={{ top: Math.max(4, pos.top), left: Math.max(4, pos.left) }}
      onMouseDown={e => e.preventDefault()}
    >
      <button onClick={addRowAbove} title="Додати рядок зверху">⬆+</button>
      <button onClick={addRowBelow} title="Додати рядок знизу">⬇+</button>
      <button onClick={delRow} title="Видалити рядок">─R</button>
      <span className="tt-sep" />
      <button onClick={addColBefore} title="Додати стовпець зліва">⬅+</button>
      <button onClick={addColAfter} title="Додати стовпець справа">➡+</button>
      <button onClick={delCol} title="Видалити стовпець">─C</button>
      <span className="tt-sep" />
      <button onClick={mergeRight} title="Обʼєднати з правою">⇥</button>
      <button onClick={mergeDown} title="Обʼєднати з нижньою">⇩</button>
      <button onClick={splitCell} title="Розʼєднати">⤩</button>
      <span className="tt-sep" />
      <div className="tt-color-wrap">
        <button onClick={() => setShowPalette(v => !v)} title="Заливка комірки">🎨</button>
        {showPalette && (
          <div className="tt-palette">
            {PALETTE.map(c => (
              <button
                key={c}
                style={{
                  background: c === 'transparent'
                    ? 'repeating-conic-gradient(#ccc 0% 25%, #fff 25% 50%) 50% / 8px 8px'
                    : c,
                }}
                onClick={() => fillColor(c)}
                title={c}
              />
            ))}
          </div>
        )}
      </div>
      <span className="tt-sep" />
      <button onClick={delTable} title="Видалити таблицю">🗑</button>
    </div>
  )
}
