import { useRef, useLayoutEffect } from 'react';
import { assetTypeTagClass, assetTypeTagLabel, type AssetType } from '../../lib/assetType';
import { onDialogMouseDown } from '../../lib/dialogClick';

interface SearchResult {
  secid: string;
  name: string;
  code: string;
  market: string;
  asset_type: AssetType;
}

interface AddStockDialogProps {
  open: boolean;
  searchQuery: string;
  searchResults: SearchResult[];
  showDropdown: boolean;
  newName: string;
  newAmount: string;
  newReturn: string;
  submitting: boolean;
  error: string;
  canSubmit: boolean;
  onSearchInput: (value: string) => void;
  onSelectResult: (result: SearchResult) => void;
  onAmountChange: (value: string) => void;
  onReturnChange: (value: string) => void;
  onSubmit: () => void;
  onClose: () => void;
}

export function AddStockDialog({
  open,
  searchQuery,
  searchResults,
  showDropdown,
  newName,
  newAmount,
  newReturn,
  submitting,
  error,
  canSubmit,
  onSearchInput,
  onSelectResult,
  onAmountChange,
  onReturnChange,
  onSubmit,
  onClose,
}: AddStockDialogProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  useLayoutEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (open && !dialog.open) {
      dialog.showModal();
      requestAnimationFrame(() => {
        searchInputRef.current?.focus();
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

  return (
    <dialog
      ref={dialogRef}
      className="s-dialog"
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
        <label className="s-dialog-label">
          搜索代码或名称
          <div className="s-dialog-search-wrap" ref={dropdownRef}>
            <input
              ref={searchInputRef}
              type="text"
              className="s-dialog-input"
              placeholder="输入代码或名称，从列表中选择"
              value={searchQuery}
              onChange={(e) => onSearchInput(e.target.value)}
            />
            {showDropdown && searchResults.length > 0 && (
              <div className="s-dropdown" role="listbox" aria-label="搜索结果">
                {searchResults.map((r) => (
                  <button
                    key={r.secid}
                    type="button"
                    role="option"
                    aria-selected={false}
                    className="s-dropdown-item"
                    onClick={() => onSelectResult(r)}
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
        </label>

        <label className="s-dialog-label">
          名称
          <input
            type="text"
            className="s-dialog-input"
            placeholder={newName ? '' : '请从搜索结果中选择'}
            value={newName}
            readOnly
          />
        </label>

        <div className="s-dialog-row">
          <label className="s-dialog-label s-dialog-label-half">
            持有金额（元）
            <input
              type="number"
              className="s-dialog-input"
              placeholder="0.00"
              value={newAmount}
              onChange={(e) => onAmountChange(e.target.value)}
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
              value={newReturn}
              onChange={(e) => {
                const v = e.target.value;
                if (/^-?\d*\.?\d*$/.test(v)) onReturnChange(v);
              }}
            />
          </label>
        </div>
      </div>

      <div className="s-dialog-footer">
        {error && <span className="s-dialog-error">{error}</span>}
        <button
          type="button"
          className="s-dialog-cancel"
          onMouseDown={(e) => onDialogMouseDown(e, requestClose)}
        >
          取消
        </button>
        <button className="s-dialog-submit" onClick={onSubmit} disabled={submitting || !canSubmit}>
          {submitting ? '添加中...' : '添加'}
        </button>
      </div>
    </dialog>
  );
}
