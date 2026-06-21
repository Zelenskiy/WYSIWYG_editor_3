import { useState } from 'react'
import { ViewMode } from './Editor'
import './Toolbar.css'

interface Props {
  exec: (cmd: string, val?: string) => void
  mode: ViewMode
  setMode: (m: ViewMode) => void
  onInsertTable: () => void
  onInsertLink: () => void
  onInsertImage: () => void
}

const FONT_SIZES = ['10', '12', '14', '16', '18', '20', '24', '28', '32', '36', '48', '64']
const FONT_FAMILIES = [
  'Arial', 'Arial Black', 'Comic Sans MS', 'Courier New',
  'Georgia', 'Impact', 'Times New Roman', 'Trebuchet MS', 'Verdana',
]
const COLORS = [
  '#000000','#ffffff','#ff0000','#00aa00','#0000ff','#ff8800',
  '#aa00aa','#00aaaa','#ffff00','#888888','#444444','#cccccc',
  '#4f8ef7','#e74c3c','#2ecc71','#f39c12','#9b59b6','#1abc9c',
]

export function Toolbar({ exec, mode, setMode, onInsertTable, onInsertLink, onInsertImage }: Props) {
  const [showColorPicker, setShowColorPicker] = useState<'fore' | 'back' | null>(null)
  const [showFontFamily, setShowFontFamily] = useState(false)
  const [showFontSize, setShowFontSize] = useState(false)

  const cmd = (c: string, v?: string) => {
    setShowColorPicker(null); setShowFontFamily(false); setShowFontSize(false)
    exec(c, v)
  }

  const Btn = ({ title, onClick, active, children }: {
    title: string; onClick: () => void; active?: boolean; children: React.ReactNode
  }) => (
    <button
      className={`tb-btn${active ? ' active' : ''}`}
      title={title}
      onClick={onClick}
      onMouseDown={e => e.preventDefault()}
    >{children}</button>
  )

  const Sep = () => <div className="tb-sep" />

  return (
    <div className="toolbar">
      {/* View mode */}
      <div className="tb-group mode-group">
        <Btn title="Візуальний редактор" onClick={() => setMode('visual')} active={mode === 'visual'}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 9h18M9 21V9"/></svg>
          Текст
        </Btn>
        <Btn title="Розділений вигляд" onClick={() => setMode('split')} active={mode === 'split'}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="18" height="18" rx="2"/><line x1="12" y1="3" x2="12" y2="21"/></svg>
          Split
        </Btn>
        <Btn title="HTML редактор" onClick={() => setMode('html')} active={mode === 'html'}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="16 18 22 12 16 6"/><polyline points="8 6 2 12 8 18"/></svg>
          HTML
        </Btn>
      </div>

      {mode !== 'html' && <>
        <Sep />

        {/* History */}
        <div className="tb-group">
          <Btn title="Скасувати (Ctrl+Z)" onClick={() => cmd('undo')}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="9 14 4 9 9 4"/><path d="M20 20v-7a4 4 0 00-4-4H4"/></svg>
          </Btn>
          <Btn title="Повторити (Ctrl+Y)" onClick={() => cmd('redo')}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="15 14 20 9 15 4"/><path d="M4 20v-7a4 4 0 014-4h12"/></svg>
          </Btn>
        </div>

        <Sep />

        {/* Block format */}
        <div className="tb-group">
          <select
            className="tb-select"
            defaultValue="p"
            onChange={e => { cmd('formatBlock', e.target.value); e.target.value = 'p' }}
            onMouseDown={e => e.stopPropagation()}
            title="Стиль блоку"
          >
            <option value="p">Абзац</option>
            <option value="h1">Заголовок 1</option>
            <option value="h2">Заголовок 2</option>
            <option value="h3">Заголовок 3</option>
            <option value="h4">Заголовок 4</option>
            <option value="blockquote">Цитата</option>
            <option value="pre">Код</option>
          </select>
        </div>

        <Sep />

        {/* Font family */}
        <div className="tb-group dropdown-wrap">
          <button
            className="tb-select"
            style={{ minWidth: 110 }}
            onMouseDown={e => { e.preventDefault(); setShowFontFamily(v => !v); setShowFontSize(false); setShowColorPicker(null) }}
            title="Шрифт"
          >
            Шрифт ▾
          </button>
          {showFontFamily && (
            <div className="dropdown">
              {FONT_FAMILIES.map(f => (
                <button key={f} className="dropdown-item" style={{ fontFamily: f }}
                  onMouseDown={e => { e.preventDefault(); cmd('fontName', f); setShowFontFamily(false) }}>
                  {f}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Font size */}
        <div className="tb-group dropdown-wrap">
          <button
            className="tb-select"
            style={{ minWidth: 52 }}
            onMouseDown={e => { e.preventDefault(); setShowFontSize(v => !v); setShowFontFamily(false); setShowColorPicker(null) }}
            title="Розмір"
          >
            Розмір ▾
          </button>
          {showFontSize && (
            <div className="dropdown" style={{ minWidth: 80 }}>
              {FONT_SIZES.map(s => (
                <button key={s} className="dropdown-item"
                  onMouseDown={e => { e.preventDefault(); exec('fontSize', '7');
                    // Apply via execCommand fontSize then override
                    setTimeout(() => {
                      document.querySelectorAll('font[size="7"]').forEach(el => {
                        (el as HTMLElement).removeAttribute('size');
                        (el as HTMLElement).style.fontSize = s + 'px';
                      });
                    }, 0);
                    setShowFontSize(false) }}>
                  {s}px
                </button>
              ))}
            </div>
          )}
        </div>

        <Sep />

        {/* Inline formatting */}
        <div className="tb-group">
          <Btn title="Жирний (Ctrl+B)" onClick={() => cmd('bold')}><b>B</b></Btn>
          <Btn title="Курсив (Ctrl+I)" onClick={() => cmd('italic')}><i>I</i></Btn>
          <Btn title="Підкреслений (Ctrl+U)" onClick={() => cmd('underline')}><u>U</u></Btn>
          <Btn title="Перекреслений" onClick={() => cmd('strikeThrough')}><s>S</s></Btn>
          <Btn title="Надрядковий" onClick={() => cmd('superscript')}>x²</Btn>
          <Btn title="Підрядковий" onClick={() => cmd('subscript')}>x₂</Btn>
        </div>

        <Sep />

        {/* Colors */}
        <div className="tb-group">
          <div className="dropdown-wrap">
            <Btn title="Колір тексту" onClick={() => { setShowColorPicker(v => v === 'fore' ? null : 'fore'); setShowFontFamily(false); setShowFontSize(false) }}>
              <span style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:2 }}>
                <span style={{ fontSize:13, fontWeight:700 }}>A</span>
                <span style={{ width:14, height:3, background:'#ff4444', borderRadius:1 }} />
              </span>
            </Btn>
            {showColorPicker === 'fore' && (
              <div className="color-picker dropdown">
                {COLORS.map(c => (
                  <button key={c} className="color-swatch" style={{ background: c }}
                    onMouseDown={e => { e.preventDefault(); cmd('foreColor', c); setShowColorPicker(null) }}
                    title={c} />
                ))}
              </div>
            )}
          </div>

          <div className="dropdown-wrap">
            <Btn title="Фон тексту" onClick={() => { setShowColorPicker(v => v === 'back' ? null : 'back'); setShowFontFamily(false); setShowFontSize(false) }}>
              <span style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:2 }}>
                <span style={{ fontSize:11 }}>🖌</span>
                <span style={{ width:14, height:3, background:'#ffff00', borderRadius:1 }} />
              </span>
            </Btn>
            {showColorPicker === 'back' && (
              <div className="color-picker dropdown">
                {COLORS.map(c => (
                  <button key={c} className="color-swatch" style={{ background: c }}
                    onMouseDown={e => { e.preventDefault(); cmd('hiliteColor', c); setShowColorPicker(null) }}
                    title={c} />
                ))}
              </div>
            )}
          </div>

          <Btn title="Очистити форматування" onClick={() => cmd('removeFormat')}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/></svg>
          </Btn>
        </div>

        <Sep />

        {/* Alignment */}
        <div className="tb-group">
          <Btn title="По лівому краю" onClick={() => cmd('justifyLeft')}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="15" y2="12"/><line x1="3" y1="18" x2="18" y2="18"/></svg>
          </Btn>
          <Btn title="По центру" onClick={() => cmd('justifyCenter')}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="3" y1="6" x2="21" y2="6"/><line x1="6" y1="12" x2="18" y2="12"/><line x1="4" y1="18" x2="20" y2="18"/></svg>
          </Btn>
          <Btn title="По правому краю" onClick={() => cmd('justifyRight')}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="3" y1="6" x2="21" y2="6"/><line x1="9" y1="12" x2="21" y2="12"/><line x1="6" y1="18" x2="21" y2="18"/></svg>
          </Btn>
          <Btn title="По ширині" onClick={() => cmd('justifyFull')}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/></svg>
          </Btn>
        </div>

        <Sep />

        {/* Lists + indent */}
        <div className="tb-group">
          <Btn title="Маркований список" onClick={() => cmd('insertUnorderedList')}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="9" y1="6" x2="20" y2="6"/><line x1="9" y1="12" x2="20" y2="12"/><line x1="9" y1="18" x2="20" y2="18"/><circle cx="4" cy="6" r="1.5" fill="currentColor" stroke="none"/><circle cx="4" cy="12" r="1.5" fill="currentColor" stroke="none"/><circle cx="4" cy="18" r="1.5" fill="currentColor" stroke="none"/></svg>
          </Btn>
          <Btn title="Нумерований список" onClick={() => cmd('insertOrderedList')}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="10" y1="6" x2="21" y2="6"/><line x1="10" y1="12" x2="21" y2="12"/><line x1="10" y1="18" x2="21" y2="18"/><text x="3" y="8" fontSize="7" fill="currentColor" stroke="none">1</text><text x="3" y="14" fontSize="7" fill="currentColor" stroke="none">2</text><text x="3" y="20" fontSize="7" fill="currentColor" stroke="none">3</text></svg>
          </Btn>
          <Btn title="Зменшити відступ" onClick={() => cmd('outdent')}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="7 8 3 12 7 16"/><line x1="3" y1="12" x2="9" y2="12"/><line x1="13" y1="6" x2="21" y2="6"/><line x1="13" y1="12" x2="21" y2="12"/><line x1="13" y1="18" x2="21" y2="18"/></svg>
          </Btn>
          <Btn title="Збільшити відступ" onClick={() => cmd('indent')}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="3 8 7 12 3 16"/><line x1="3" y1="12" x2="9" y2="12"/><line x1="13" y1="6" x2="21" y2="6"/><line x1="13" y1="12" x2="21" y2="12"/><line x1="13" y1="18" x2="21" y2="18"/></svg>
          </Btn>
        </div>

        <Sep />

        {/* Insert */}
        <div className="tb-group">
          <Btn title="Вставити таблицю" onClick={onInsertTable}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="18" height="18" rx="1"/><line x1="3" y1="9" x2="21" y2="9"/><line x1="3" y1="15" x2="21" y2="15"/><line x1="9" y1="3" x2="9" y2="21"/><line x1="15" y1="3" x2="15" y2="21"/></svg>
            Таблиця
          </Btn>
          <Btn title="Вставити посилання" onClick={onInsertLink}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M10 13a5 5 0 007.54.54l3-3a5 5 0 00-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 00-7.54-.54l-3 3a5 5 0 007.07 7.07l1.71-1.71"/></svg>
            Посилання
          </Btn>
          <Btn title="Вставити зображення" onClick={onInsertImage}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>
            Зображення
          </Btn>
          <Btn title="Горизонтальна лінія" onClick={() => cmd('insertHorizontalRule')}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="3" y1="12" x2="21" y2="12"/></svg>
            HR
          </Btn>
        </div>
      </>}
    </div>
  )
}
