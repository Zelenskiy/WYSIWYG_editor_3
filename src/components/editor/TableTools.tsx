import { useEffect, useState, type RefObject } from 'react'

interface Props {
  editorRef: RefObject<HTMLDivElement | null>
  onChange: () => void
}

const PALETTE = [
  'transparent', '#ffffff', '#f5f5f5', '#fde2e2', '#fdebc1', '#e2f0d9',
  '#d6eaf8', '#e6dcf0', '#fad7a0', '#a9dfbf', '#aed6f1', '#f1948a',
]

const HEADER_SIZE = 18 // px width/height of header strips
const HANDLE_SIZE = 6  // px hit area for resize handles

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

function clearSelected(editor: HTMLElement | null) {
  editor?.querySelectorAll('td.cell-selected, th.cell-selected').forEach(el =>
    el.classList.remove('cell-selected'),
  )
}

export function TableTools({ editorRef, onChange }: Props) {
  const cell = getCurrentCell(editorRef.current)
  const [, force] = useState(0)
  const [showPalette, setShowPalette] = useState(false)
  const rerender = () => force(x => x + 1)

  // Reposition on scroll/resize
  useEffect(() => {
    const el = editorRef.current
    if (!el) return
    const h = () => rerender()
    el.addEventListener('scroll', h)
    window.addEventListener('resize', h)
    return () => {
      el.removeEventListener('scroll', h)
      window.removeEventListener('resize', h)
    }
  }, [editorRef])

  if (!cell || !editorRef.current) return null
  const table = getTable(cell)
  if (!table) return null

  const editor = editorRef.current
  // Use viewport-fixed coordinates (overlays are position:fixed)
  const tRect = table.getBoundingClientRect()
  const offsetTop = tRect.top
  const offsetLeft = tRect.left
  void editor

  const row = cell.parentElement as HTMLTableRowElement
  const colIdx = cellIndex(cell)
  const firstRow = table.rows[0]
  const cols = firstRow ? firstRow.children.length : 0

  const refresh = () => { onChange(); rerender() }

  /* ── Column / row selection ── */
  const selectColumn = (idx: number) => {
    clearSelected(editor)
    Array.from(table.rows).forEach(r => {
      const c = r.children[idx] as HTMLElement | undefined
      c?.classList.add('cell-selected')
    })
    rerender()
  }
  const selectRow = (idx: number) => {
    clearSelected(editor)
    const r = table.rows[idx]
    if (!r) return
    Array.from(r.children).forEach(c => (c as HTMLElement).classList.add('cell-selected'))
    rerender()
  }
  const selectTable = () => {
    clearSelected(editor)
    Array.from(table.rows).forEach(r =>
      Array.from(r.children).forEach(c => (c as HTMLElement).classList.add('cell-selected')),
    )
    rerender()
  }

  /* ── Resize column / row via dragging the header strip border ── */
  const startColResize = (e: React.MouseEvent, idx: number) => {
    e.preventDefault()
    e.stopPropagation()
    const headerCell = firstRow?.children[idx] as HTMLElement | undefined
    if (!headerCell) return
    const startX = e.clientX
    const startW = headerCell.getBoundingClientRect().width
    const onMove = (ev: MouseEvent) => {
      const w = Math.max(24, startW + (ev.clientX - startX))
      headerCell.style.width = w + 'px'
      rerender()
    }
    const onUp = () => {
      window.removeEventListener('mousemove', onMove)
      window.removeEventListener('mouseup', onUp)
      refresh()
    }
    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup', onUp)
  }

  const startRowResize = (e: React.MouseEvent, idx: number) => {
    e.preventDefault()
    e.stopPropagation()
    const targetRow = table.rows[idx]
    if (!targetRow) return
    const startY = e.clientY
    const startH = targetRow.getBoundingClientRect().height
    const onMove = (ev: MouseEvent) => {
      const h = Math.max(20, startH + (ev.clientY - startY))
      targetRow.style.height = h + 'px'
      rerender()
    }
    const onUp = () => {
      window.removeEventListener('mousemove', onMove)
      window.removeEventListener('mouseup', onUp)
      refresh()
    }
    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup', onUp)
  }

  /* ── Mutations ── */
  const addRowBelow = () => {
    const colsN = row.children.length
    const newRow = row.parentElement!.insertBefore(document.createElement('tr'), row.nextSibling)
    for (let i = 0; i < colsN; i++) {
      const td = document.createElement('td')
      td.innerHTML = '&nbsp;'
      newRow.appendChild(td)
    }
    refresh()
  }
  const addRowAbove = () => {
    const colsN = row.children.length
    const newRow = row.parentElement!.insertBefore(document.createElement('tr'), row)
    for (let i = 0; i < colsN; i++) {
      const td = document.createElement('td')
      td.innerHTML = '&nbsp;'
      newRow.appendChild(td)
    }
    refresh()
  }
  const delRow = () => {
    if (table.rows.length <= 1) table.remove()
    else row.remove()
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

  const mergeRight = () => {
    const next = cell.nextElementSibling as HTMLTableCellElement | null
    if (!next) return
    cell.colSpan = (cell.colSpan || 1) + (next.colSpan || 1)
    if (next.innerHTML.replace(/&nbsp;|\s/g, ''))
      cell.innerHTML = (cell.innerHTML + ' ' + next.innerHTML).trim()
    next.remove()
    refresh()
  }
  const mergeDown = () => {
    const nextRow = row.nextElementSibling as HTMLTableRowElement | null
    if (!nextRow) return
    const below = nextRow.children[colIdx] as HTMLTableCellElement | undefined
    if (!below) return
    cell.rowSpan = (cell.rowSpan || 1) + (below.rowSpan || 1)
    if (below.innerHTML.replace(/&nbsp;|\s/g, ''))
      cell.innerHTML = (cell.innerHTML + ' ' + below.innerHTML).trim()
    below.remove()
    refresh()
  }
  const splitCell = () => {
    const cs = cell.colSpan || 1
    const rs = cell.rowSpan || 1
    cell.colSpan = 1
    cell.rowSpan = 1
    for (let i = 1; i < cs; i++) {
      const td = document.createElement('td')
      td.innerHTML = '&nbsp;'
      row.insertBefore(td, cell.nextSibling)
    }
    for (let r = 1; r < rs; r++) {
      let cur: HTMLTableRowElement | null = row
      for (let i = 0; i < r; i++) cur = cur?.nextElementSibling as HTMLTableRowElement | null
      if (!cur) continue
      for (let i = 0; i < cs; i++) {
        const td = document.createElement('td')
        td.innerHTML = '&nbsp;'
        const ref = cur.children[colIdx] as HTMLElement | undefined
        cur.insertBefore(td, ref ?? null)
      }
    }
    refresh()
  }

  const fillColor = (c: string) => {
    const selectedCells = editor.querySelectorAll('td.cell-selected, th.cell-selected')
    const targets: HTMLElement[] = selectedCells.length
      ? Array.from(selectedCells) as HTMLElement[]
      : [cell]
    targets.forEach(t => {
      if (c === 'transparent') t.style.removeProperty('background-color')
      else t.style.backgroundColor = c
    })
    setShowPalette(false)
    refresh()
  }

  /* ── Compute column / row offsets ── */
  const colWidths: { left: number; width: number }[] = []
  if (firstRow) {
    let x = 0
    Array.from(firstRow.children).forEach(c => {
      const w = (c as HTMLElement).getBoundingClientRect().width
      colWidths.push({ left: x, width: w })
      x += w
    })
  }
  const rowHeights: { top: number; height: number }[] = []
  let y = 0
  Array.from(table.rows).forEach(r => {
    const h = r.getBoundingClientRect().height
    rowHeights.push({ top: y, height: h })
    y += h
  })

  const toolbarTop = Math.max(4, offsetTop - 38 - HEADER_SIZE)

  return (
    <>
      {/* Floating toolbar */}
      <div
        className="table-tools"
        style={{ top: toolbarTop, left: Math.max(4, offsetLeft) }}
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

      {/* Corner — select whole table */}
      <div
        className="th-corner"
        style={{ top: offsetTop - HEADER_SIZE, left: offsetLeft - HEADER_SIZE }}
        onMouseDown={e => { e.preventDefault(); selectTable() }}
        title="Виділити таблицю"
      />

      {/* Column header strip */}
      <div
        className="th-col-strip"
        style={{
          top: offsetTop - HEADER_SIZE,
          left: offsetLeft,
          width: tRect.width,
          height: HEADER_SIZE,
        }}
      >
        {colWidths.map((c, i) => (
          <div
            key={i}
            className="th-col"
            style={{ left: c.left, width: c.width }}
            onMouseDown={e => { e.preventDefault(); selectColumn(i) }}
            title={`Стовпець ${i + 1}`}
          >
            <div
              className="th-col-resize"
              style={{ right: -HANDLE_SIZE / 2, width: HANDLE_SIZE }}
              onMouseDown={e => startColResize(e, i)}
            />
          </div>
        ))}
      </div>

      {/* Row header strip */}
      <div
        className="th-row-strip"
        style={{
          top: offsetTop,
          left: offsetLeft - HEADER_SIZE,
          width: HEADER_SIZE,
          height: tRect.height,
        }}
      >
        {rowHeights.map((r, i) => (
          <div
            key={i}
            className="th-row"
            style={{ top: r.top, height: r.height }}
            onMouseDown={e => { e.preventDefault(); selectRow(i) }}
            title={`Рядок ${i + 1}`}
          >
            <div
              className="th-row-resize"
              style={{ bottom: -HANDLE_SIZE / 2, height: HANDLE_SIZE }}
              onMouseDown={e => startRowResize(e, i)}
            />
          </div>
        ))}
      </div>
    </>
  )
}
