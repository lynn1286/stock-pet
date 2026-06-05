import { useRef, useLayoutEffect, useState, useCallback } from 'react';
import { useImageImport, type PreviewRow } from '../../hooks/useImageImport';
import { assetTypeLabel, type AssetType } from '../../lib/assetType';
import { onDialogMouseDown } from '../../lib/dialogClick';

type FetchPrice = (secid: string, assetType: AssetType) => Promise<number>;

interface ImageImportDialogProps {
  open: boolean;
  visionConfigured: boolean;
  fetchPrice: FetchPrice;
  onOpenSettings: () => void;
  onImported: (summary: {
    added: number;
    updated: number;
    skipped: number;
    failed: number;
  }) => void;
  onClose: () => void;
}

interface PickedImage {
  id: string;
  url: string;
}

function readAsDataURL(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

/** 名称搜索命中多个代码时才需要人工确认 */
function rowNeedsConfirm(row: PreviewRow): boolean {
  return row.candidates.length > 1;
}

export function ImageImportDialog({
  open,
  visionConfigured,
  fetchPrice,
  onOpenSettings,
  onImported,
  onClose,
}: ImageImportDialogProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [images, setImages] = useState<PickedImage[]>([]);

  const {
    status,
    rows,
    error,
    setError,
    reset,
    recognize,
    setMatch,
    researchRow,
    updateValue,
    removeRow,
    importAll,
  } = useImageImport();

  useLayoutEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (open && !dialog.open) {
      dialog.showModal();
      requestAnimationFrame(() => {
        (document.activeElement as HTMLElement | null)?.blur();
      });
    } else if (!open && dialog.open) {
      dialog.close();
    }
  }, [open]);

  const clearAll = useCallback(() => {
    setImages([]);
    reset();
  }, [reset]);

  function handleClose() {
    clearAll();
    onClose();
  }

  function requestClose() {
    dialogRef.current?.close();
  }

  async function pickAndRecognize(files: File[]) {
    const imageFiles = files.filter((f) => f.type.startsWith('image/'));
    if (imageFiles.length === 0 || !visionConfigured) return;
    const picked = await Promise.all(
      imageFiles.map(async (f) => ({ id: crypto.randomUUID(), url: await readAsDataURL(f) })),
    );
    setImages(picked);
    setError('');
    await recognize(picked.map((p) => p.url));
  }

  function handleFileInput(e: React.ChangeEvent<HTMLInputElement>) {
    if (e.target.files) void pickAndRecognize(Array.from(e.target.files));
    e.target.value = '';
  }

  function handlePaste(e: React.ClipboardEvent) {
    const files: File[] = [];
    for (const item of e.clipboardData.items) {
      if (item.type.startsWith('image/')) {
        const file = item.getAsFile();
        if (file) files.push(file);
      }
    }
    if (files.length > 0) {
      e.preventDefault();
      void pickAndRecognize(files);
    }
  }

  function removeImage(id: string) {
    setImages((prev) => prev.filter((img) => img.id !== id));
  }

  async function handleRetryRecognize() {
    if (images.length === 0) return;
    await recognize(images.map((img) => img.url));
  }

  async function handleImport() {
    const summary = await importAll(fetchPrice);
    onImported(summary);
    handleClose();
  }

  const pendingCount = rows.filter((r) => !r.matchedSecid || rowNeedsConfirm(r)).length;
  const importable = rows.filter((r) => r.matchedSecid && r.marketValue > 0).length;
  const busy = status === 'recognizing' || status === 'importing';
  const showFooter =
    !!error || status === 'importing' || status === 'preview' || (error && images.length > 0);

  return (
    <dialog
      ref={dialogRef}
      className="s-dialog s-dialog-wide"
      onClose={handleClose}
      onPaste={handlePaste}
    >
      <div className="s-dialog-header">
        <span className="s-dialog-title">图片导入持仓</span>
        <button
          type="button"
          className="s-dialog-close"
          onMouseDown={(e) => onDialogMouseDown(e, requestClose)}
          aria-label="关闭"
        >
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            aria-hidden
          >
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>
      </div>

      <div className="s-dialog-body">
        {!visionConfigured ? (
          <div className="s-import-notice">
            <p>尚未配置图片识别服务。请先在设置中填写 API 地址、密钥和模型名。</p>
            <button className="s-dialog-submit" onClick={onOpenSettings}>
              去设置
            </button>
          </div>
        ) : status === 'preview' || status === 'importing' ? (
          <div className="s-import-preview">
            <div className="s-import-preview-head">
              <span>
                识别到 {rows.length} 条
                {pendingCount > 0 && (
                  <span className="s-import-warn"> · {pendingCount} 条待确认</span>
                )}
              </span>
              <button className="s-import-back" onClick={clearAll} disabled={busy}>
                重新选图
              </button>
            </div>
            <div className="s-import-preview-scroll">
              {rows.length === 0 ? (
                <p className="s-import-empty">没有识别出持仓，换一张更清晰的截图试试。</p>
              ) : (
                <div className="s-import-rows">
                  {rows.map((row) => (
                    <ImportRow
                      key={row.id}
                      row={row}
                      onSetMatch={setMatch}
                      onResearch={researchRow}
                      onUpdateValue={updateValue}
                      onRemove={removeRow}
                    />
                  ))}
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="s-import-pick">
            {status === 'recognizing' ? (
              <p className="s-import-status-body">识别中…</p>
            ) : (
              <>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  multiple
                  hidden
                  onChange={handleFileInput}
                />
                <button
                  className="s-import-dropzone"
                  onClick={() => fileInputRef.current?.click()}
                  type="button"
                  disabled={busy}
                >
                  <svg
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.6"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    aria-hidden
                  >
                    <rect x="3" y="3" width="18" height="18" rx="2" />
                    <circle cx="9" cy="9" r="1.6" />
                    <path d="M21 15l-5-5L5 21" />
                  </svg>
                  <span className="s-import-dropzone-title">选择持仓截图</span>
                  <span className="s-import-dropzone-hint">
                    支付宝 / 天天基金 / 同花顺 / 东方财富，可多选，也可直接粘贴
                  </span>
                </button>

                {images.length > 0 && (
                  <div className="s-import-thumbs">
                    {images.map((img) => (
                      <div className="s-import-thumb" key={img.id}>
                        <img src={img.url} alt="持仓截图" />
                        <button
                          className="s-import-thumb-del"
                          onClick={() => removeImage(img.id)}
                          aria-label="移除"
                        >
                          ×
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </>
            )}
          </div>
        )}
      </div>

      {showFooter && (
        <div className="s-dialog-footer">
          {error && <span className="s-dialog-error">{error}</span>}
          {status === 'importing' && <span className="s-import-status">导入中…</span>}
          {status === 'preview' || status === 'importing' ? (
            <button
              className="s-dialog-submit"
              onClick={handleImport}
              disabled={busy || importable === 0}
            >
              导入 {importable} 条
            </button>
          ) : error && images.length > 0 ? (
            <button
              className="s-dialog-submit"
              onClick={handleRetryRecognize}
              disabled={busy || !visionConfigured}
            >
              重试
            </button>
          ) : null}
        </div>
      )}
    </dialog>
  );
}

interface ImportRowProps {
  row: PreviewRow;
  onSetMatch: (id: string, secid: string) => void;
  onResearch: (id: string, query: string) => void;
  onUpdateValue: (id: string, field: 'marketValue' | 'profit', value: number) => void;
  onRemove: (id: string) => void;
}

function ImportRow({ row, onSetMatch, onResearch, onUpdateValue, onRemove }: ImportRowProps) {
  const [query, setQuery] = useState('');

  const ambiguous = rowNeedsConfirm(row);
  const flag = !row.matchedSecid ? 'unmatched' : ambiguous ? 'confirm' : 'ok';

  return (
    <div className={`s-import-row s-import-row-${flag}`}>
      <div className="s-import-row-main">
        <div className="s-import-row-raw" title={row.rawName}>
          {row.rawName || '(空)'}
          {row.truncated && ambiguous && <span className="s-import-tag">截断</span>}
        </div>
        <button className="s-import-row-del" onClick={() => onRemove(row.id)} aria-label="删除此行">
          ×
        </button>
      </div>

      <div className="s-import-row-match">
        {row.candidates.length > 0 ? (
          <select
            className="s-select s-import-select"
            value={row.matchedSecid}
            onChange={(e) => onSetMatch(row.id, e.target.value)}
          >
            {row.candidates.map((c) => (
              <option key={c.secid} value={c.secid}>
                {c.name}（{c.code}·{assetTypeLabel(c.asset_type)}）
              </option>
            ))}
          </select>
        ) : (
          <span className="s-import-nomatch">未匹配，输入关键词重搜</span>
        )}
        <input
          className="s-dialog-input s-import-research"
          placeholder="改搜代码或名称，回车"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') onResearch(row.id, query);
          }}
        />
      </div>

      <div className="s-import-row-nums">
        <label className="s-import-num">
          市值
          <input
            type="number"
            value={Number.isFinite(row.marketValue) ? row.marketValue : ''}
            onChange={(e) => onUpdateValue(row.id, 'marketValue', parseFloat(e.target.value) || 0)}
            step="0.01"
          />
        </label>
        <label className="s-import-num">
          收益
          <input
            type="number"
            value={Number.isFinite(row.profit) ? row.profit : ''}
            onChange={(e) => onUpdateValue(row.id, 'profit', parseFloat(e.target.value) || 0)}
            step="0.01"
          />
        </label>
      </div>
    </div>
  );
}
