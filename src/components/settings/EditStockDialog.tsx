import { useRef, useEffect } from 'react';
import { assetTypeTagClass, assetTypeTagLabel, type AssetType } from '../../lib/assetType';

interface EditStockDialogProps {
  open: boolean;
  name: string;
  code: string;
  assetType: AssetType;
  quantity: string;
  costPrice: string;
  submitting: boolean;
  error: string;
  onQuantityChange: (value: string) => void;
  onCostPriceChange: (value: string) => void;
  onSubmit: () => void;
  onClose: () => void;
}

export function EditStockDialog({
  open,
  name,
  code,
  assetType,
  quantity,
  costPrice,
  submitting,
  error,
  onQuantityChange,
  onCostPriceChange,
  onSubmit,
  onClose,
}: EditStockDialogProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const quantityRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!dialogRef.current) return;
    if (open && !dialogRef.current.open) {
      dialogRef.current.showModal();
      requestAnimationFrame(() => {
        quantityRef.current?.focus();
        quantityRef.current?.select();
      });
    } else if (!open && dialogRef.current.open) {
      dialogRef.current.close();
    }
  }, [open]);

  function handleBackdropClick(e: React.MouseEvent<HTMLDialogElement>) {
    if (e.target === dialogRef.current) {
      onClose();
    }
  }

  return (
    <dialog ref={dialogRef} className="s-dialog" onClose={onClose} onClick={handleBackdropClick}>
      <div className="s-dialog-header">
        <span className="s-dialog-title">编辑持仓</span>
        <button className="s-dialog-close" onClick={onClose} aria-label="关闭">
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
          标的
          <div className="s-edit-stock-meta">
            <span className={`s-dropdown-tag ${assetTypeTagClass(assetType)}`}>
              {assetTypeTagLabel(assetType)}
            </span>
            <span className="s-edit-stock-name">{name}</span>
            <span className="s-edit-stock-code">{code}</span>
          </div>
        </label>

        <div className="s-dialog-row">
          <label className="s-dialog-label s-dialog-label-half">
            份额
            <input
              ref={quantityRef}
              type="number"
              className="s-dialog-input"
              placeholder="0.00"
              value={quantity}
              onChange={(e) => onQuantityChange(e.target.value)}
              min="0"
              step="0.0001"
            />
          </label>

          <label className="s-dialog-label s-dialog-label-half">
            成本价
            <input
              type="number"
              className="s-dialog-input"
              placeholder="0.0000"
              value={costPrice}
              onChange={(e) => onCostPriceChange(e.target.value)}
              min="0"
              step="0.0001"
            />
          </label>
        </div>
      </div>

      <div className="s-dialog-footer">
        {error && <span className="s-dialog-error">{error}</span>}
        <button type="button" className="s-dialog-cancel" onClick={onClose}>
          取消
        </button>
        <button type="button" className="s-dialog-submit" onClick={onSubmit} disabled={submitting}>
          {submitting ? '保存中...' : '保存'}
        </button>
      </div>
    </dialog>
  );
}
