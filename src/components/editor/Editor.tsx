import { useState, useRef, useCallback, useEffect } from "react";
import { Toolbar } from "./Toolbar";
import { HtmlPane } from "./HtmlPane";
import { TableDialog } from "./TableDialog";
import { LinkDialog } from "./LinkDialog";
import { TableTools } from "./TableTools";
import { inlineStyles } from "../../utils/inlineStyles";
import { pasteFromWord } from "../../utils/pasteFromWord";

import "./Editor.css";
import { exportAsZip } from "@/utils/exportZip";

export type ViewMode = "split" | "visual" | "html";

export default function Editor() {
  const editorRef = useRef<HTMLDivElement>(null);
  const [mode, setMode] = useState<ViewMode>("split");
  const [htmlSource, setHtmlSource] = useState<string>(
    "<h2>Ласкаво просимо до HTMLEdit</h2><p>Почніть редагування цього тексту. Спробуйте панель інструментів вище — додайте <b>жирний</b>, <i>курсив</i> або вставте таблицю.</p>",
  );
  const [showTableDialog, setShowTableDialog] = useState(false);
  const [showLinkDialog, setShowLinkDialog] = useState(false);
  const [savedRange, setSavedRange] = useState<Range | null>(null);
  const [notification, setNotification] = useState<string | null>(null);
  const [tableTick, setTableTick] = useState(0);
  const syncingRef = useRef(false);

  const notify = useCallback((msg: string) => {
    setNotification(msg);
    setTimeout(() => setNotification(null), 2500);
  }, []);

  const syncToHtml = useCallback(() => {
    if (syncingRef.current || !editorRef.current) return;
    syncingRef.current = true;
    const raw = editorRef.current.innerHTML;
    setHtmlSource(inlineStyles(raw));
    syncingRef.current = false;
    setTableTick((t) => t + 1);
  }, []);

  const syncToVisual = useCallback((html: string) => {
    if (syncingRef.current || !editorRef.current) return;
    syncingRef.current = true;
    editorRef.current.innerHTML = html;
    syncingRef.current = false;
  }, []);

  const handleHtmlChange = useCallback(
    (val: string) => {
      setHtmlSource(val);
      if (mode !== "html") syncToVisual(val);
    },
    [mode, syncToVisual],
  );

  const handlePaste = useCallback(
    async (e: React.ClipboardEvent<HTMLDivElement>) => {
      const cd = e.clipboardData;
      const htmlData = cd.getData("text/html");
      if (htmlData && htmlData.includes("mso-")) {
        e.preventDefault();
        const cleaned = await pasteFromWord(htmlData);
        document.execCommand("insertHTML", false, cleaned);
        syncToHtml();
        notify("Вставлено з Word");
        return;
      }
      const files = Array.from(cd.files).filter((f) =>
        f.type.startsWith("image/"),
      );
      if (files.length) {
        e.preventDefault();
        for (const file of files) {
          const dataUrl = await fileToDataUrl(file);
          document.execCommand(
            "insertHTML",
            false,
            `<img src="${dataUrl}" style="max-width:100%;height:auto;" />`,
          );
        }
        syncToHtml();
      }
    },
    [syncToHtml, notify],
  );

  const handleDrop = useCallback(
    async (e: React.DragEvent<HTMLDivElement>) => {
      const files = Array.from(e.dataTransfer.files).filter((f) =>
        f.type.startsWith("image/"),
      );
      if (!files.length) return;
      e.preventDefault();
      for (const file of files) {
        const dataUrl = await fileToDataUrl(file);
        document.execCommand(
          "insertHTML",
          false,
          `<img src="${dataUrl}" style="max-width:100%;height:auto;" />`,
        );
      }
      syncToHtml();
    },
    [syncToHtml],
  );

  const saveSelection = useCallback(() => {
    const sel = window.getSelection();
    if (sel && sel.rangeCount > 0)
      setSavedRange(sel.getRangeAt(0).cloneRange());
  }, []);

  const restoreSelection = useCallback(() => {
    if (!savedRange) return;
    const sel = window.getSelection();
    if (sel) {
      sel.removeAllRanges();
      sel.addRange(savedRange);
    }
  }, [savedRange]);

  const exec = useCallback(
    (cmd: string, val?: string) => {
      editorRef.current?.focus();
      document.execCommand(cmd, false, val);
      syncToHtml();
    },
    [syncToHtml],
  );

  const insertImage = useCallback(() => {
    const inp = document.createElement("input");
    inp.type = "file";
    inp.accept = "image/*";
    inp.onchange = async () => {
      const file = inp.files?.[0];
      if (!file) return;
      const dataUrl = await fileToDataUrl(file);
      editorRef.current?.focus();
      document.execCommand(
        "insertHTML",
        false,
        `<img src="${dataUrl}" style="max-width:100%;height:auto;" />`,
      );
      syncToHtml();
    };
    inp.click();
  }, [syncToHtml]);

  const insertTable = useCallback(
    (rows: number, cols: number) => {
      let html = "<table><tbody>";
      for (let r = 0; r < rows; r++) {
        html += "<tr>";
        for (let c = 0; c < cols; c++) {
          const tag = r === 0 ? "th" : "td";
          html += `<${tag}>&nbsp;</${tag}>`;
        }
        html += "</tr>";
      }
      html += "</tbody></table><p><br></p>";
      restoreSelection();
      editorRef.current?.focus();
      document.execCommand("insertHTML", false, html);
      syncToHtml();
      setShowTableDialog(false);
    },
    [restoreSelection, syncToHtml],
  );

  const insertLink = useCallback(
    (url: string, text: string) => {
      restoreSelection();
      editorRef.current?.focus();
      const sel = window.getSelection();
      if (sel && sel.toString().length > 0) {
        document.execCommand("createLink", false, url);
      } else {
        document.execCommand(
          "insertHTML",
          false,
          `<a href="${url}">${text || url}</a>`,
        );
      }
      syncToHtml();
      setShowLinkDialog(false);
    },
    [restoreSelection, syncToHtml],
  );

  const exportHtml = useCallback(() => {
    const blob = new Blob([htmlSource], { type: "text/html;charset=utf-8" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "document.html";
    a.click();
    notify("HTML збережено");
  }, [htmlSource, notify]);

  const copyHtml = useCallback(() => {
    navigator.clipboard.writeText(htmlSource);
    notify("HTML скопійовано");
  }, [htmlSource, notify]);

  const exportZip = useCallback(async () => {
    try {
      const count = await exportAsZip(htmlSource, "document.zip");
      notify(
        count > 0 ? `ZIP збережено (зображень: ${count})` : "ZIP збережено",
      );
    } catch (err) {
      console.error(err);
      notify("Помилка експорту ZIP");
    }
  }, [htmlSource, notify]);

  useEffect(() => {
    if (editorRef.current) editorRef.current.innerHTML = htmlSource;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (mode === "visual" || mode === "split") {
      if (editorRef.current && editorRef.current.innerHTML !== htmlSource) {
        editorRef.current.innerHTML = htmlSource;
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode]);

  // Bump tableTick on selection changes so TableTools repositions
  useEffect(() => {
    const handler = () => setTableTick((t) => t + 1);
    document.addEventListener("selectionchange", handler);
    return () => document.removeEventListener("selectionchange", handler);
  }, []);

  return (
    <div className="editor-app">
      <header className="header">
        <div className="header-logo">
          <span className="logo-icon">✦</span>
          <span>
            HTML<span className="logo-accent">Edit</span>
          </span>
        </div>
        <div className="header-actions">
          <button className="btn-ghost" onClick={copyHtml}>
            Копіювати HTML
          </button>
          <button className="btn-ghost" onClick={exportHtml}>
            HTML
          </button>
          <button className="btn-primary" onClick={exportZip}>
            Завантажити ZIP
          </button>
        </div>
      </header>

      <Toolbar
        exec={exec}
        mode={mode}
        setMode={setMode}
        onInsertTable={() => {
          saveSelection();
          setShowTableDialog(true);
        }}
        onInsertLink={() => {
          saveSelection();
          setShowLinkDialog(true);
        }}
        onInsertImage={insertImage}
      />

      <main className={`editor-area mode-${mode}`}>
        <div className={`pane visual-pane ${mode === "html" ? "hidden" : ""}`}>
          <div className="pane-label">Редагування</div>
          <div
            ref={editorRef}
            className="editor-content"
            contentEditable
            suppressContentEditableWarning
            spellCheck
            onInput={syncToHtml}
            onKeyUp={syncToHtml}
            onMouseUp={() => setTableTick((t) => t + 1)}
            onPaste={handlePaste}
            onDrop={handleDrop}
            onDragOver={(e) => e.preventDefault()}
          />
          {mode !== "html" && (
            <TableTools
              key={tableTick}
              editorRef={editorRef}
              onChange={syncToHtml}
            />
          )}
        </div>

        {mode === "split" && <div className="pane-divider" />}

        <div className={`pane html-pane ${mode === "visual" ? "hidden" : ""}`}>
          <div className="pane-label">HTML-код</div>
          <HtmlPane value={htmlSource} onChange={handleHtmlChange} />
        </div>
      </main>

      {showTableDialog && (
        <TableDialog
          onInsert={insertTable}
          onClose={() => setShowTableDialog(false)}
        />
      )}
      {showLinkDialog && (
        <LinkDialog
          onInsert={insertLink}
          onClose={() => setShowLinkDialog(false)}
        />
      )}

      {notification && <div className="notification">{notification}</div>}
    </div>
  );
}

function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(r.result as string);
    r.onerror = reject;
    r.readAsDataURL(file);
  });
}
