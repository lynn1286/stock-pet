import { useRef, useEffect } from 'react'

interface SearchResult {
  secid: string
  name: string
  code: string
  market: string
  asset_type: 'stock' | 'etf' | 'fund'
}

interface AddStockDialogProps {
  open: boolean
  searchQuery: string
  searchResults: SearchResult[]
  showDropdown: boolean
  newName: string
  newQty: string
  newCost: string
  submitting: boolean
  error: string
  canSubmit: boolean
  onSearchInput: (value: string) => void
  onSelectResult: (result: SearchResult) => void
  onQtyChange: (value: string) => void
  onCostChange: (value: string) => void
  onSubmit: () => void
  onClose: () => void
}

export function AddStockDialog({
  open,
  searchQuery,
  searchResults,
  showDropdown,
  newName,
  newQty,
  newCost,
  submitting,
  error,
  canSubmit,
  onSearchInput,
  onSelectResult,
  onQtyChange,
  onCostChange,
  onSubmit,
  onClose,
}: AddStockDialogProps) {
  const dialogRef = useRef<HTMLDialogElement>(null)
  const dropdownRef = useRef<HTMLDivElement>(null)
  const searchInputRef = useRef<HTMLInputElement>(null)

  // 同步 open 状态到 dialog
  useEffect(() => {
    if (!dialogRef.current) return
    if (open && !dialogRef.current.open) {
      dialogRef.current.showModal()
      // showModal 后聚焦搜索框
      requestAnimationFrame(() => {
        searchInputRef.current?.focus()
      })
    } else if (!open && dialogRef.current.open) {
      dialogRef.current.close()
    }
  }, [open])

  function handleDialogClose() {
    onClose()
  }

  function handleBackdropClick(e: React.MouseEvent<HTMLDialogElement>) {
    if (e.target === dialogRef.current) {
      onClose()
    }
  }

  return (
    <dialog
      ref={dialogRef}
      className="s-dialog"
      onClose={handleDialogClose}
      onClick={handleBackdropClick}
    >
      <div className="s-dialog-header">
        <span className="s-dialog-title">添加持仓</span>
        <button className="s-dialog-close" onClick={onClose} aria-label="关闭">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden>
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
              <div className="s-dropdown">
                {searchResults.map((r) => (
                  <div
                    key={r.secid}
                    className="s-dropdown-item"
                    onMouseDown={(e) => { e.preventDefault(); onSelectResult(r) }}
                  >
                    <span className="s-dropdown-name">{r.name}</span>
                    <span className="s-dropdown-code">{r.code}</span>
                    <span className={`s-dropdown-tag s-tag-${r.asset_type}`}>
                      {r.asset_type === 'fund' ? '基金' : r.asset_type === 'etf' ? 'ETF' : '股票'}
                    </span>
                  </div>
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
            持有份额
            <input
              type="number"
              className="s-dialog-input"
              placeholder="0"
              value={newQty}
              onChange={(e) => onQtyChange(e.target.value)}
              min="0"
              step="0.01"
            />
          </label>

          <label className="s-dialog-label s-dialog-label-half">
            成本价（元/份）
            <input
              type="number"
              className="s-dialog-input"
              placeholder="0.00"
              value={newCost}
              onChange={(e) => onCostChange(e.target.value)}
              min="0"
              step="0.001"
            />
          </label>
        </div>
      </div>

      <div className="s-dialog-footer">
        {error && <span className="s-dialog-error">{error}</span>}
        <button className="s-dialog-cancel" onClick={onClose}>取消</button>
        <button className="s-dialog-submit" onClick={onSubmit} disabled={submitting || !canSubmit}>
          {submitting ? '添加中...' : '添加'}
        </button>
      </div>
    </dialog>
  )
}
