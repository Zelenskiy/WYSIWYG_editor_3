import { useState } from 'react'

interface Props {
  onInsert: (rows: number, cols: number) => void
  onClose: () => void
}

export function TableDialog({ onInsert, onClose }: Props) {
  const [hover, setHover] = useState<[number, number]>([0, 0])
  const [selected, setSelected] = useState<[number, number]>([3, 3])
  const [useGrid, setUseGrid] = useState(true)
  const GRID = 8

  const apply = () => {
    onInsert(selected[0], selected[1])
  }

  return (
    <div className="dialog-overlay" onClick={e => { if (e.target === e.currentTarget) onClose() }}>
      <div className="dialog">
        <h3>Вставити таблицю</h3>

        <div className="tab-btns">
          <button
            className={useGrid ? 'active' : ''}
            onClick={() => setUseGrid(true)}
          >Сітка</button>
          <button
            className={!useGrid ? 'active' : ''}
            onClick={() => setUseGrid(false)}
          >Точний розмір</button>
        </div>

        {useGrid ? (
          <>
            <div
              className="table-grid"
              onMouseLeave={() => setHover([0, 0])}
            >
              {Array.from({ length: GRID }, (_, r) =>
                Array.from({ length: GRID }, (_, c) => (
                  <div
                    key={`${r}-${c}`}
                    className={`table-cell${(r < hover[0] && c < hover[1]) || (r < selected[0] && c < selected[1]) ? ' active' : ''}`}
                    onMouseEnter={() => setHover([r + 1, c + 1])}
                    onClick={() => { setSelected([r + 1, c + 1]); onInsert(r + 1, c + 1) }}
                  />
                ))
              )}
            </div>
            <div className="table-size-label">
              {hover[0] > 0 ? `${hover[0]} × ${hover[1]}` : `${selected[0]} × ${selected[1]}`}
            </div>
          </>
        ) : (
          <div className="dialog-row">
            <div>
              <label>Рядки</label>
              <input type="number" min={1} max={50} value={selected[0]}
                onChange={e => setSelected([+e.target.value || 1, selected[1]])} />
            </div>
            <div>
              <label>Стовпці</label>
              <input type="number" min={1} max={20} value={selected[1]}
                onChange={e => setSelected([selected[0], +e.target.value || 1])} />
            </div>
          </div>
        )}

        <div className="dialog-actions">
          <button className="btn-cancel" onClick={onClose}>Скасувати</button>
          {!useGrid && (
            <button className="btn-ok" onClick={apply}>Вставити</button>
          )}
        </div>
      </div>
    </div>
  )
}
