/**
 * Light HTML normalizer.
 *
 * The previous implementation walked every node and baked
 * `window.getComputedStyle()` into every element's `style` attribute. That
 * produced very large, deeply-nested HTML output (every <span>, <p>, <td>
 * picked up dozens of redundant declarations like
 * `font-family:Arial;font-weight:400;color:rgb(0,0,0)...`).
 *
 * Modern WYSIWYG output should preserve only the styles the user actually
 * applied — `document.execCommand` already inlines them. This function just
 * cleans up a few cosmetic issues and returns the HTML as-is.
 */
export function inlineStyles(html: string): string {
  if (!html) return html

  return html
    // collapse multiple <br> at end of root blocks
    .replace(/(<br\s*\/?>\s*){3,}/gi, '<br><br>')
    // drop empty style attributes execCommand sometimes leaves behind
    .replace(/\sstyle=""/gi, '')
    // drop empty class attributes
    .replace(/\sclass=""/gi, '')
    // normalize self-closing <br>
    .replace(/<br\s*\/?>/gi, '<br>')
}
