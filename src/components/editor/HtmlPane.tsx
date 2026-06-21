import { useEffect, useRef } from 'react'
import './HtmlPane.css'

interface Props {
  value: string
  onChange: (v: string) => void
}

/* ── Pretty-print HTML ── */
function format(raw: string): string {
  const INDENT = '  '
  const VOIDS = new Set([
    'br','hr','img','input','meta','link','area','base','col','embed','param','source','track','wbr',
  ])
  const tokens = raw
    .replace(/>\s*</g, '>\n<')
    .split('\n')
    .map(t => t.trim())
    .filter(Boolean)

  let depth = 0
  const out: string[] = []
  for (const t of tokens) {
    const isClose = /^<\//.test(t)
    const tagMatch = /^<\s*([\w-]+)/.exec(t)
    const tagName = tagMatch ? tagMatch[1].toLowerCase() : ''
    const isVoid = VOIDS.has(tagName) || /\/\s*>$/.test(t)
    const isOpen = /^<[^/!?]/.test(t) && !isVoid
    if (isClose) depth = Math.max(0, depth - 1)
    out.push(INDENT.repeat(depth) + t)
    if (isOpen) depth++
  }
  return out.join('\n')
}

/* ── Safe HTML escape ── */
function esc(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

/**
 * Tokenize-then-render syntax highlighter. The previous regex-replace chain
 * would re-match its own injected `<span class="hl-attr">` markup, producing
 * stray "hl-attr" text on screen. This walks the source once with a stateful
 * scanner and emits already-escaped, span-wrapped HTML.
 */
function highlight(code: string): string {
  let i = 0
  let out = ''
  const n = code.length

  while (i < n) {
    // Comments <!-- ... -->
    if (code.startsWith('<!--', i)) {
      const end = code.indexOf('-->', i + 4)
      const stop = end === -1 ? n : end + 3
      out += `<span class="hl-comment">${esc(code.slice(i, stop))}</span>`
      i = stop
      continue
    }

    // Tag <... >
    if (code[i] === '<') {
      const end = code.indexOf('>', i)
      if (end === -1) { out += esc(code.slice(i)); break }
      out += highlightTag(code.slice(i, end + 1))
      i = end + 1
      continue
    }

    // Text until next tag
    const next = code.indexOf('<', i)
    const stop = next === -1 ? n : next
    out += `<span class="hl-text">${esc(code.slice(i, stop))}</span>`
    i = stop
  }
  return out
}

function highlightTag(tag: string): string {
  // tag like "<div class=\"x\" id='y'>" or "</div>"
  const m = /^<\s*(\/?)([\w-]+)([\s\S]*?)(\/?)>$/.exec(tag)
  if (!m) return esc(tag)
  const [, slash, name, rest, selfClose] = m

  let attrs = ''
  // walk attributes: name | name=value | name="..." | name='...'
  const attrRe = /\s+([\w:-]+)(?:\s*=\s*("([^"]*)"|'([^']*)'|([^\s"'<>`]+)))?/g
  let am: RegExpExecArray | null
  let lastIndex = 0
  while ((am = attrRe.exec(rest)) !== null) {
    // any whitespace between matches
    attrs += esc(rest.slice(lastIndex, am.index))
    attrs += ' '
    attrs += `<span class="hl-attr">${esc(am[1])}</span>`
    if (am[2] !== undefined) {
      attrs += '='
      attrs += `<span class="hl-string">${esc(am[2])}</span>`
    }
    lastIndex = am.index + am[0].length
  }
  attrs += esc(rest.slice(lastIndex))

  return (
    `<span class="hl-tag">&lt;${slash}</span>` +
    `<span class="hl-tagname">${esc(name)}</span>` +
    attrs +
    `<span class="hl-tag">${selfClose ? '/' : ''}&gt;</span>`
  )
}

export function HtmlPane({ value, onChange }: Props) {
  const taRef = useRef<HTMLTextAreaElement>(null)
  const hlRef = useRef<HTMLDivElement>(null)

  const sync = (raw: string) => {
    if (hlRef.current) hlRef.current.innerHTML = highlight(raw) + '\n'
  }

  const syncScroll = () => {
    if (taRef.current && hlRef.current) {
      hlRef.current.scrollTop = taRef.current.scrollTop
      hlRef.current.scrollLeft = taRef.current.scrollLeft
    }
  }

  useEffect(() => {
    if (taRef.current && taRef.current !== document.activeElement) {
      const formatted = format(value)
      taRef.current.value = formatted
      sync(formatted)
    } else if (taRef.current) {
      // mid-typing: just refresh highlight to keep value/highlight aligned
      sync(taRef.current.value)
    }
  }, [value])

  const handleChange = () => {
    const raw = taRef.current?.value ?? ''
    sync(raw)
    onChange(raw)
  }

  const handleFormat = () => {
    if (!taRef.current) return
    const formatted = format(taRef.current.value)
    taRef.current.value = formatted
    sync(formatted)
    onChange(formatted)
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Tab') {
      e.preventDefault()
      const ta = taRef.current!
      const s = ta.selectionStart, en = ta.selectionEnd
      ta.value = ta.value.slice(0, s) + '  ' + ta.value.slice(en)
      ta.selectionStart = ta.selectionEnd = s + 2
      handleChange()
    }
    if ((e.key === 'F' || e.key === 'f') && (e.ctrlKey || e.metaKey) && e.shiftKey) {
      e.preventDefault()
      handleFormat()
    }
  }

  return (
    <div className="html-pane-wrap">
      <div className="html-pane-toolbar">
        <button className="hp-btn" onClick={handleFormat} title="Ctrl+Shift+F — форматувати">
          ⌘ Форматувати
        </button>
        <span className="hp-hint">Tab = відступ · Ctrl+Shift+F = форматувати</span>
      </div>
      <div className="html-editor-wrap">
        <div ref={hlRef} className="html-highlight" aria-hidden="true" />
        <textarea
          ref={taRef}
          className="html-textarea"
          spellCheck={false}
          defaultValue={format(value)}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          onScroll={syncScroll}
        />
      </div>
    </div>
  )
}
