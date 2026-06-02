interface StockConfig {
  secid: string
  name: string
  is_primary: boolean
  quantity: number
  cost_price: number
  asset_type: 'stock' | 'etf' | 'fund'
}

interface StockState {
  secid: string
  price: number
  change_pct: number
  profit: number
  profit_pct: number
}

interface StockRowProps {
  stock: StockConfig
  live: StockState | undefined
  isEditingQty: boolean
  isEditingCost: boolean
  editValue: string
  isConfirmDelete: boolean
  isHighlighted?: boolean
  onStartEdit: (secid: string, field: 'quantity' | 'cost_price', value: number) => void
  onCommitEdit: () => void
  onEditKey: (e: React.KeyboardEvent) => void
  onEditValueChange: (value: string) => void
  onDelete: (secid: string) => void
  onCancelDelete: () => void
  onSetPrimary: (secid: string) => void
}

function fmtNum(n: number, decimals = 2): string {
  if (n === 0) return '-'
  return n.toLocaleString('zh-CN', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals
  })
}

function fmtProfit(n: number): string {
  if (n === 0) return '-'
  const sign = n > 0 ? '+' : ''
  return `${sign}${n.toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

export function StockRow({
  stock,
  live,
  isEditingQty,
  isEditingCost,
  editValue,
  isConfirmDelete,
  isHighlighted,
  onStartEdit,
  onCommitEdit,
  onEditKey,
  onEditValueChange,
  onDelete,
  onCancelDelete,
  onSetPrimary
}: StockRowProps) {
  const currentPrice = live?.price || 0
  const profit =
    stock.quantity > 0 && stock.cost_price > 0 && currentPrice > 0
      ? (currentPrice - stock.cost_price) * stock.quantity
      : 0
  const profitPct = stock.cost_price > 0 && currentPrice > 0
    ? ((currentPrice - stock.cost_price) / stock.cost_price) * 100
    : 0
  const marketValue = stock.quantity > 0 && currentPrice > 0
    ? stock.quantity * currentPrice
    : 0

  return (
    <tr
      className={`${stock.is_primary ? 's-tr-primary' : ''} ${isHighlighted ? 's-tr-highlight' : ''} ${isConfirmDelete ? 's-tr-confirm-delete' : ''}`}
    >
      <td
        className="s-td-name"
        title={`${stock.name}（${stock.secid.split('.')[1] || stock.secid}）`}
      >
        <div className="s-td-name-main">
          {stock.is_primary && <span className="s-dropdown-tag s-tag-primary">主</span>}
          {stock.asset_type === 'fund' && <span className="s-dropdown-tag s-tag-fund">基金</span>}
          <span className="s-td-name-text">{stock.name}</span>
        </div>
        <div className="s-td-name-sub">
          {marketValue > 0 ? `持有 ${fmtNum(marketValue)} 元` : stock.secid.split('.')[1] || stock.secid}
        </div>
      </td>

      <td className="s-td-num">
        {isEditingQty ? (
          <span className="s-editing-cell">
            <input
              className="s-edit-input"
              value={editValue}
              onChange={e => onEditValueChange(e.target.value)}
              onBlur={onCommitEdit}
              onKeyDown={onEditKey}
              autoFocus
              type="number"
              min="0"
              step="0.01"
              aria-label="编辑份额"
            />
          </span>
        ) : (
          <span
            className={`s-editable ${stock.quantity === 0 ? 's-editable-empty' : ''}`}
            onClick={() => onStartEdit(stock.secid, 'quantity', stock.quantity)}
            title="点击编辑"
          >
            {stock.quantity > 0 ? fmtNum(stock.quantity, 2) : '点击填写'}
          </span>
        )}
      </td>

      <td className="s-td-num">
        {isEditingCost ? (
          <span className="s-editing-cell">
            <input
              className="s-edit-input"
              value={editValue}
              onChange={e => onEditValueChange(e.target.value)}
              onBlur={onCommitEdit}
              onKeyDown={onEditKey}
              autoFocus
              type="number"
              min="0"
              step="0.0001"
              aria-label="编辑成本价"
            />
          </span>
        ) : (
          <span
            className={`s-editable ${stock.cost_price === 0 ? 's-editable-empty' : ''}`}
            onClick={() => onStartEdit(stock.secid, 'cost_price', stock.cost_price)}
            title="点击编辑"
          >
            {stock.cost_price > 0 ? fmtNum(stock.cost_price, 4) : '点击填写'}
          </span>
        )}
      </td>

      <td className="s-td-num">{currentPrice > 0 ? fmtNum(currentPrice) : '-'}</td>

      <td
        className={`s-td-num s-profit ${profit > 0 ? 's-profit-up' : profit < 0 ? 's-profit-down' : ''}`}
      >
        {stock.quantity > 0 && stock.cost_price > 0 ? (
          <>
            <div>{fmtProfit(profit)}</div>
            <div className="s-profit-pct">{profitPct >= 0 ? '+' : ''}{profitPct.toFixed(2)}%</div>
          </>
        ) : '-'}
      </td>

      <td className="s-td-act">
        {!stock.is_primary && (
          <button className="s-link" onClick={() => onSetPrimary(stock.secid)} title="设为主股票">
            主
          </button>
        )}
        {isConfirmDelete ? (
          <>
            <button className="s-btn-del-confirm" onClick={() => onDelete(stock.secid)}>
              Y
            </button>
            <button className="s-btn-del-cancel" onClick={onCancelDelete}>
              N
            </button>
          </>
        ) : (
          <button
            className="s-btn-del"
            onClick={() => onDelete(stock.secid)}
            aria-label={`删除 ${stock.name}`}
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
        )}
      </td>
    </tr>
  )
}
