/**
 * Clean and convert Word HTML (RTF clipboard) to clean HTML with inline styles.
 * Handles MSO namespace, conditional comments, and preserves visual formatting.
 */
export async function pasteFromWord(html: string): Promise<string> {
  // Try to use mammoth if available for .docx files
  // For clipboard HTML we do manual cleanup
  return cleanWordHtml(html)
}

function cleanWordHtml(html: string): string {
  // Remove Word conditional comments
  let clean = html
    .replace(/<!--\[if[^\]]*\]>.*?<!\[endif\]-->/gis, '')
    .replace(/<!--.*?-->/gs, '')

  // Remove Word-specific XML namespaces and processing instructions
  clean = clean.replace(/<\?xml[^>]*>/gi, '')
  clean = clean.replace(/<o:p[^>]*>.*?<\/o:p>/gis, '')
  clean = clean.replace(/<w:[^>]+>.*?<\/w:[^>]+>/gis, '')
  clean = clean.replace(/<m:[^>]+>.*?<\/m:[^>]+>/gis, '')

  // Remove script/style tags entirely
  clean = clean.replace(/<script[^>]*>.*?<\/script>/gis, '')
  clean = clean.replace(/<style[^>]*>.*?<\/style>/gis, '')

  // Remove MSO class and style, but keep visual ones
  clean = clean.replace(/\s*class="[^"]*Mso[^"]*"/gi, '')

  // Convert Word styles to inline styles
  const parser = new DOMParser()
  const doc = parser.parseFromString(clean, 'text/html')

  // Extract body content
  const body = doc.body

  // Remove empty paragraphs chains (Word adds many)
  const paras = body.querySelectorAll('p')
  paras.forEach(p => {
    if (!p.textContent?.trim() && !p.querySelector('img')) {
      // keep one empty line between blocks
      const prev = p.previousElementSibling
      if (prev && prev.tagName === 'P' && !prev.textContent?.trim()) {
        p.remove()
      }
    }
  })

  // Convert mso-level list styles to proper lists
  const listItems = body.querySelectorAll('[style*="mso-list"]')
  if (listItems.length > 0) {
    convertWordLists(body)
  }

  // Clean up spans: remove empty spans, unwrap single-child spans with no style
  body.querySelectorAll('span').forEach(span => {
    if (!span.textContent?.trim() && !span.children.length) {
      span.remove()
      return
    }
    // Move key style properties to inline
    const style = span.getAttribute('style') || ''
    const cleaned = cleanMsoStyle(style)
    if (cleaned) span.setAttribute('style', cleaned)
    else span.removeAttribute('style')
  })

  // Clean paragraph styles
  body.querySelectorAll('p').forEach(p => {
    const style = p.getAttribute('style') || ''
    const cleaned = cleanMsoStyle(style)
    if (cleaned) p.setAttribute('style', cleaned)
    else p.removeAttribute('style')
  })

  // Clean font tags - convert to spans with inline style
  body.querySelectorAll('font').forEach(font => {
    const span = doc.createElement('span')
    const parts: string[] = []
    const face = font.getAttribute('face')
    const color = font.getAttribute('color')
    const size = font.getAttribute('size')
    if (face) parts.push(`font-family:${face}`)
    if (color) parts.push(`color:${color}`)
    if (size) {
      const px = wordFontSizeToPx(+size)
      if (px) parts.push(`font-size:${px}px`)
    }
    if (parts.length) span.setAttribute('style', parts.join(';'))
    span.innerHTML = font.innerHTML
    font.replaceWith(span)
  })

  // Remove all class attributes
  body.querySelectorAll('[class]').forEach(el => el.removeAttribute('class'))

  // Remove MSO and other non-standard attributes
  body.querySelectorAll('*').forEach(el => {
    Array.from(el.attributes).forEach(attr => {
      if (/^(mso-|xmlns|lang$|v:|o:)/.test(attr.name) ||
          ['id', 'name', 'data-contrast', 'data-ccp'].some(p => attr.name.startsWith(p))) {
        el.removeAttribute(attr.name)
      }
    })
  })

  return body.innerHTML
}

function cleanMsoStyle(style: string): string {
  if (!style) return ''
  const parts = style.split(';').map(s => s.trim()).filter(Boolean)
  const keep: string[] = []
  const ALLOWED_PROPS = [
    'font-family', 'font-size', 'font-weight', 'font-style', 'font-variant',
    'color', 'background-color', 'background',
    'text-align', 'text-decoration', 'text-indent',
    'line-height', 'letter-spacing', 'word-spacing',
    'border', 'border-top', 'border-right', 'border-bottom', 'border-left',
    'padding', 'padding-top', 'padding-right', 'padding-bottom', 'padding-left',
    'margin', 'margin-top', 'margin-right', 'margin-bottom', 'margin-left',
    'width', 'height', 'max-width',
    'vertical-align',
  ]

  for (const part of parts) {
    const colon = part.indexOf(':')
    if (colon < 0) continue
    const prop = part.slice(0, colon).trim().toLowerCase()
    if (prop.startsWith('mso-') || prop.startsWith('layout-') || prop === 'tab-stops') continue
    if (ALLOWED_PROPS.some(a => prop.startsWith(a))) {
      keep.push(part)
    }
  }
  return keep.join(';')
}

function convertWordLists(body: HTMLElement) {
  // Simple heuristic: paragraphs with mso-list become li
  // Group consecutive list items
  const items = Array.from(body.querySelectorAll('[style*="mso-list"]'))
  if (!items.length) return

  let currentList: HTMLElement | null = null
  let currentType = 'ul'

  items.forEach(item => {
    const style = item.getAttribute('style') || ''
    const isOrdered = /mso-list:.*\d/.test(style) && /\d\./.test(item.textContent || '')
    const type = isOrdered ? 'ol' : 'ul'

    const li = document.createElement('li')
    li.innerHTML = item.innerHTML
    li.setAttribute('style', cleanMsoStyle(style))

    if (!currentList || currentType !== type) {
      currentList = document.createElement(type)
      currentType = type
      item.parentNode?.insertBefore(currentList, item)
    }

    currentList.appendChild(li)
    item.remove()
  })
}

function wordFontSizeToPx(size: number): number {
  // Word font size 1-7 maps roughly to: 8, 10, 12, 14, 18, 24, 36
  const map: Record<number, number> = { 1: 8, 2: 10, 3: 12, 4: 14, 5: 18, 6: 24, 7: 36 }
  return map[size] ?? 14
}
