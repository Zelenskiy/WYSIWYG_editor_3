import JSZip from "jszip";

interface AssetEntry {
  path: string; // e.g. "assets/image-1.png"
  data: Uint8Array;
}

const MIME_EXT: Record<string, string> = {
  "image/png": "png",
  "image/jpeg": "jpg",
  "image/jpg": "jpg",
  "image/gif": "gif",
  "image/webp": "webp",
  "image/svg+xml": "svg",
  "image/bmp": "bmp",
  "image/x-icon": "ico",
};

function dataUrlToBytes(
  dataUrl: string,
): { bytes: Uint8Array; ext: string } | null {
  const m = /^data:([^;,]+)(;base64)?,(.*)$/.exec(dataUrl);
  if (!m) return null;
  const mime = m[1].toLowerCase();
  const isB64 = !!m[2];
  const payload = m[3];
  const ext = MIME_EXT[mime] ?? mime.split("/")[1] ?? "bin";
  let bytes: Uint8Array;
  if (isB64) {
    const bin = atob(payload);
    bytes = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  } else {
    bytes = new TextEncoder().encode(decodeURIComponent(payload));
  }
  return { bytes, ext };
}

async function urlToBytes(
  url: string,
): Promise<{ bytes: Uint8Array; ext: string } | null> {
  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    const blob = await res.blob();
    const buf = new Uint8Array(await blob.arrayBuffer());
    const mime = blob.type.toLowerCase();
    const ext = MIME_EXT[mime] ?? url.split(".").pop()?.split("?")[0] ?? "bin";
    return { bytes: buf, ext };
  } catch {
    return null;
  }
}

/**
 * Extracts <img src> assets from htmlSource into /assets folder and rewrites
 * the HTML to reference them. Returns wrapped, standalone HTML + asset list.
 */
export async function buildExportBundle(
  htmlSource: string,
  title = "Документ",
) {
  const doc = new DOMParser().parseFromString(
    `<!doctype html><html><body>${htmlSource}</body></html>`,
    "text/html",
  );

  const assets: AssetEntry[] = [];
  const seen = new Map<string, string>(); // original src -> new relative path
  const imgs = Array.from(doc.querySelectorAll("img"));
  let counter = 0;

  for (const img of imgs) {
    const src = img.getAttribute("src");
    if (!src) continue;
    if (seen.has(src)) {
      img.setAttribute("src", seen.get(src)!);
      continue;
    }

    let entry: { bytes: Uint8Array; ext: string } | null = null;
    if (src.startsWith("data:")) {
      entry = dataUrlToBytes(src);
    } else if (
      /^https?:\/\//i.test(src) ||
      src.startsWith("/") ||
      src.startsWith("blob:")
    ) {
      entry = await urlToBytes(src);
    }
    if (!entry) continue;

    counter++;
    const fileName = `image-${counter}.${entry.ext}`;
    const relPath = `assets/${fileName}`;
    assets.push({ path: relPath, data: entry.bytes });
    seen.set(src, relPath);
    img.setAttribute("src", relPath);
  }

  const bodyHtml = doc.body.innerHTML;
  const fullHtml = `<!doctype html>
<html lang="uk">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${escapeHtml(title)}</title>
<style>
  body { font-family: system-ui, -apple-system, Segoe UI, Roboto, sans-serif; max-width: 900px; margin: 2rem auto; padding: 0 1rem; line-height: 1.6; color: #1a1a1a; }
  img { max-width: 100%; height: auto; }
  table { border-collapse: collapse; }
  table th, table td { border: 1px solid #ccc; padding: 6px 10px; }
</style>
</head>
<body>
${bodyHtml}
</body>
</html>
`;

  return { html: fullHtml, assets };
}

function escapeHtml(s: string) {
  return s.replace(
    /[&<>"']/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        c
      ]!,
  );
}

export async function exportAsZip(
  htmlSource: string,
  fileName = "document.zip",
) {
  const { html, assets } = await buildExportBundle(htmlSource);
  const zip = new JSZip();
  zip.file("index.html", html);
  if (assets.length) {
    const folder = zip.folder("assets")!;
    for (const a of assets) {
      const name = a.path.replace(/^assets\//, "");
      folder.file(name, a.data);
    }
  }
  const blob = await zip.generateAsync({ type: "blob" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = fileName;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  return assets.length;
}
