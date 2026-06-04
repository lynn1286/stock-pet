interface StockConfig {
  secid: string;
  name: string;
  is_primary: boolean;
  quantity: number;
  cost_price: number;
  asset_type: 'stock' | 'etf' | 'fund';
}

interface StockState {
  secid: string;
  price: number;
  change_pct: number;
  profit: number;
  profit_pct: number;
  daily_profit: number;
}

interface StockRowProps {
  stock: StockConfig;
  live: StockState | undefined;
  isEditingQty: boolean;
  isEditingCost: boolean;
  editValue: string;
  isHighlighted?: boolean;
  displayMode: 'primary' | 'summary';
  flash?: 'up' | 'down';
  onStartEdit: (secid: string, field: 'quantity' | 'cost_price', value: number) => void;
  onCommitEdit: () => void;
  onEditKey: (e: React.KeyboardEvent) => void;
  onEditValueChange: (value: string) => void;
  onContextMenu: (e: React.MouseEvent, secid: string) => void;
}

function fmtNum(n: number, decimals = 2): string {
  if (n === 0) return '-';
  return n.toLocaleString('zh-CN', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}

function fmtProfit(n: number): string {
  if (n === 0) return '-';
  const sign = n > 0 ? '+' : '';
  return `${sign}${n.toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export function StockRow({
  stock,
  live,
  isEditingQty,
  isEditingCost,
  editValue,
  isHighlighted,
  displayMode,
  flash,
  onStartEdit,
  onCommitEdit,
  onEditKey,
  onEditValueChange,
  onContextMenu,
}: StockRowProps) {
  const currentPrice = live?.price || 0;
  const profit =
    stock.quantity > 0 && stock.cost_price > 0 && currentPrice > 0
      ? (currentPrice - stock.cost_price) * stock.quantity
      : 0;
  const profitPct =
    stock.cost_price > 0 && currentPrice > 0
      ? ((currentPrice - stock.cost_price) / stock.cost_price) * 100
      : 0;
  const marketValue = stock.quantity > 0 && currentPrice > 0 ? stock.quantity * currentPrice : 0;

  return (
    <tr
      className={`${displayMode === 'primary' && stock.is_primary ? 's-tr-primary' : ''} ${isHighlighted ? 's-tr-highlight' : ''} ${flash ? `s-tr-flash-${flash}` : ''}`}
      onContextMenu={(e) => onContextMenu(e, stock.secid)}
    >
      <td
        className="s-td-name"
        title={`${stock.name}（${stock.secid.split('.')[1] || stock.secid}）`}
      >
        <div className="s-td-name-main">
          {displayMode === 'primary' && stock.is_primary && (
            <span className="s-dropdown-tag s-tag-primary">主</span>
          )}
          {stock.asset_type === 'fund' && <span className="s-dropdown-tag s-tag-fund">基金</span>}
          <span className="s-td-name-text">{stock.name}</span>
        </div>
        <div className="s-td-name-sub">
          {marketValue > 0
            ? `持有 ${fmtNum(marketValue)} 元`
            : stock.secid.split('.')[1] || stock.secid}
        </div>
      </td>

      <td className="s-td-num">
        {isEditingQty ? (
          <span className="s-editing-cell">
            <input
              className="s-edit-input"
              value={editValue}
              onChange={(e) => onEditValueChange(e.target.value)}
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
              onChange={(e) => onEditValueChange(e.target.value)}
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
        className={`s-td-num s-profit ${live && live.change_pct > 0 ? 's-profit-up' : live && live.change_pct < 0 ? 's-profit-down' : ''}`}
      >
        {live ? (
          <>
            <div>
              {stock.quantity > 0 && live.daily_profit !== 0 ? fmtProfit(live.daily_profit) : '-'}
            </div>
            <div className="s-profit-pct">
              {live.change_pct >= 0 ? '+' : ''}
              {live.change_pct.toFixed(2)}%
            </div>
          </>
        ) : (
          '-'
        )}
      </td>

      <td
        className={`s-td-num s-profit ${profit > 0 ? 's-profit-up' : profit < 0 ? 's-profit-down' : ''}`}
      >
        {stock.quantity > 0 && stock.cost_price > 0 ? (
          <>
            <div>{fmtProfit(profit)}</div>
            <div className="s-profit-pct">
              {profitPct >= 0 ? '+' : ''}
              {profitPct.toFixed(2)}%
            </div>
          </>
        ) : (
          '-'
        )}
      </td>
    </tr>
  );
}
