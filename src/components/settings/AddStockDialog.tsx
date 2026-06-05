import { useRef, useLayoutEffect, useState, useCallback } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { assetTypeTagClass, assetTypeTagLabel, type AssetType } from '../../lib/assetType';
import { onDialogMouseDown } from '../../lib/dialogClick';
import { importStocks } from '../../hooks/useImportStocks';

interface SearchResult {
  secid: string;
  name: string;
  code: string;
  market: string;
  asset_type: AssetType;
}

interface AddRow {
  id: string;
  searchQuery: string;
  searchResults: SearchResult[];
  showDropdown: boolean;
  secid: string;
  name: string;
  assetType: AssetType;
  amount: string;
  returnAmt: string;
}

interface AddStockDialogProps {
  open: boolean;
  livePrices: Map<string, { price: number }>;
  fetchPrice: (secid: string, assetType: AssetType) => Promise<number>;
  onImported: (
    summary: { added: number; updated: number; skipped: number; failed: number },
    highlightSecid?: string,
  ) => void;
  onClose: () => void;
}

function emptyRow(): AddRow {
  return {
    id: crypto.randomUUID(),
    searchQuery: '',
    searchResults: [],
    showDropdown: false,
    secid: '',
    name: '',
    assetType: 'stock',
    amount: '',
    returnAmt: '',
  };
}

export function AddStockDialog({
  open,
  livePrices,
  fetchPrice,
  onImported,
  onClose,
}: AddStockDialogProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const firstSearchRef = useRef<HTMLInputElement>(null);
  const [rows, setRows] = useState<AddRow[]>([emptyRow()]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const searchTimers = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());

  useLayoutEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (open && !dialog.open) {
      dialog.showModal();
      setRows([emptyRow()]);
      setError('');
      setSubmitting(false);
      requestAnimationFrame(() => {
        firstSearchRef.current?.focus();
      });
    } else if (!open && dialog.open) {
      dialog.close();
    }
  }, [open]);

  function requestClose() {
    dialogRef.current?.close();
  }

  function handleBackdropClick(e: React.MouseEvent<HTMLDialogElement>) {
    if (e.target === dialogRef.current) {
      requestClose();
    }
  }

  const patchRow = useCallback((id: string, patch: Partial<AddRow>) => {
    setRows((prev) => prev.map((row) => (row.id === id ? { ...row, ...patch } : row)));
  }, []);

  const handleSearchInput = useCallback(
    (id: string, value: string) => {
      patchRow(id, {
        searchQuery: value,
        secid: '',
        name: '',
        showDropdown: false,
        searchResults: [],
      });

      const prev = searchTimers.current.get(id);
      if (prev) clearTimeout(prev);

      if (value.length < 1) {
        searchTimers.current.delete(id);
        return;
      }

      searchTimers.current.set(
        id,
        setTimeout(async () => {
          try {
            const results = await invoke<SearchResult[]>('search_stock', { query: value });
            setRows((prev) =>
              prev.map((row) =>
                row.id === id
                  ? { ...row, searchResults: results, showDropdown: results.length > 0 }
                  : row,
              ),
            );
          } catch {
            patchRow(id, { searchResults: [], showDropdown: false });
          }
        }, 300),
      );
    },
    [patchRow],
  );

  function selectResult(id: string, result: SearchResult) {
    const timer = searchTimers.current.get(id);
    if (timer) clearTimeout(timer);
    searchTimers.current.delete(id);
    patchRow(id, {
      searchQuery: result.code,
      searchResults: [],
      showDropdown: false,
      secid: result.secid,
      name: result.name,
      assetType: result.asset_type,
    });
  }

  function addRow() {
    setRows((prev) => [...prev, emptyRow()]);
  }

  function removeRow(id: string) {
    setRows((prev) => (prev.length <= 1 ? prev : prev.filter((row) => row.id !== id)));
  }

  const readyCount = rows.filter((row) => {
    const amount = parseFloat(row.amount) || 0;
    const ret = parseFloat(row.returnAmt) || 0;
    return row.secid && row.name && amount > 0 && ret < amount;
  }).length;

  async function handleSubmit() {
    if (submitting || readyCount === 0) return;
    setSubmitting(true);
    setError('');

    let skipped = 0;
    let failed = 0;
    const items: {
      secid: string;
      name: string;
      quantity: number;
      costPrice: number;
      assetType: AssetType;
    }[] = [];

    for (const row of rows) {
      if (!row.secid || !row.name) {
        skipped++;
        continue;
      }
      const amount = parseFloat(row.amount) || 0;
      const ret = parseFloat(row.returnAmt) || 0;
      if (amount <= 0) {
        skipped++;
        continue;
      }
      if (ret >= amount) {
        setError('持有收益不能大于等于持有金额');
        setSubmitting(false);
        return;
      }

      try {
        let currentPrice = livePrices.get(row.secid)?.price || 0;
        if (currentPrice <= 0) {
          currentPrice = await fetchPrice(row.secid, row.assetType);
        }
        if (currentPrice <= 0) {
          failed++;
          continue;
        }
        const totalCost = amount - ret;
        const qty = amount / currentPrice;
        const cost = totalCost / qty;
        if (qty <= 0 || cost <= 0) {
          skipped++;
          continue;
        }
        items.push({
          secid: row.secid,
          name: row.name,
          quantity: qty,
          costPrice: cost,
          assetType: row.assetType,
        });
      } catch {
        failed++;
      }
    }

    if (items.length === 0) {
      setError(failed > 0 ? '获取价格失败，请稍后重试' : '没有可添加的持仓');
      setSubmitting(false);
      return;
    }

    try {
      const summary = await importStocks(items);
      const highlightSecid = items.length === 1 ? items[0].secid : undefined;
      onImported(
        {
          added: summary.added,
          updated: summary.updated,
          skipped: skipped + summary.skipped,
          failed,
        },
        highlightSecid,
      );
      requestClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : '添加失败');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <dialog
      ref={dialogRef}
      className="s-dialog s-dialog-wide"
      onClose={onClose}
      onClick={handleBackdropClick}
    >
      <div className="s-dialog-header">
        <span className="s-dialog-title">添加持仓</span>
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
        <div className="s-batch-head">
          <p className="s-batch-hint">搜索标的并填写持有金额与收益，可添加多行，空行会自动跳过。</p>
          <button type="button" className="s-batch-add-row" onClick={addRow} disabled={submitting}>
            + 添加一行
          </button>
        </div>
        <div className="s-batch-scroll">
          {rows.map((row, index) => (
            <div className="s-batch-row" key={row.id}>
              <div className="s-batch-row-top">
                <span className="s-batch-row-index">{index + 1}</span>
                <div className="s-dialog-search-wrap s-batch-search">
                  <input
                    ref={index === 0 ? firstSearchRef : undefined}
                    type="text"
                    className="s-dialog-input"
                    placeholder="搜索代码或名称"
                    value={row.searchQuery}
                    onChange={(e) => handleSearchInput(row.id, e.target.value)}
                  />
                  {row.showDropdown && row.searchResults.length > 0 && (
                    <div className="s-dropdown" role="listbox" aria-label="搜索结果">
                      {row.searchResults.map((r) => (
                        <button
                          key={r.secid}
                          type="button"
                          role="option"
                          className="s-dropdown-item"
                          onClick={() => selectResult(row.id, r)}
                        >
                          <span className="s-dropdown-name">{r.name}</span>
                          <span className="s-dropdown-code">{r.code}</span>
                          <span className={`s-dropdown-tag ${assetTypeTagClass(r.asset_type)}`}>
                            {assetTypeTagLabel(r.asset_type)}
                          </span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
                {rows.length > 1 && (
                  <button
                    type="button"
                    className="s-batch-row-del"
                    onClick={() => removeRow(row.id)}
                    aria-label="删除此行"
                  >
                    ×
                  </button>
                )}
              </div>
              {row.name && <div className="s-batch-row-name">{row.name}</div>}
              <div className="s-batch-row-nums">
                <label className="s-dialog-label s-dialog-label-half">
                  持有金额（元）
                  <input
                    type="number"
                    className="s-dialog-input"
                    placeholder="0.00"
                    value={row.amount}
                    onChange={(e) => patchRow(row.id, { amount: e.target.value })}
                    min="0"
                    step="0.01"
                  />
                </label>
                <label className="s-dialog-label s-dialog-label-half">
                  持有收益（元）
                  <input
                    type="text"
                    inputMode="decimal"
                    className="s-dialog-input"
                    placeholder="0.00"
                    value={row.returnAmt}
                    onChange={(e) => {
                      const v = e.target.value;
                      if (/^-?\d*\.?\d*$/.test(v)) patchRow(row.id, { returnAmt: v });
                    }}
                  />
                </label>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="s-dialog-footer">
        {error && <span className="s-dialog-error">{error}</span>}
        <button
          type="button"
          className="s-dialog-cancel"
          onMouseDown={(e) => onDialogMouseDown(e, requestClose)}
          disabled={submitting}
        >
          取消
        </button>
        <button
          type="button"
          className="s-dialog-submit"
          onClick={() => void handleSubmit()}
          disabled={submitting || readyCount === 0}
        >
          {submitting ? '添加中...' : readyCount === 1 ? '添加' : `添加 ${readyCount} 条`}
        </button>
      </div>
    </dialog>
  );
}
