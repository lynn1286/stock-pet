import { assetTypeTagClass, assetTypeTagLabel, type AssetType } from '../../lib/assetType';
import { FlashValue } from './FlashValue';

interface StockConfig {
  secid: string;
  name: string;
  is_primary: boolean;
  quantity: number;
  cost_price: number;
  asset_type: AssetType;
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
  isHighlighted?: boolean;
  displayMode: 'primary' | 'summary';
  flash?: 'up' | 'down';
  onEdit: (secid: string) => void;
  onDelete: (secid: string) => void;
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
  isHighlighted,
  displayMode,
  flash,
  onEdit,
  onDelete,
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
    >
      <td
        className="s-td-name"
        title={`${stock.name}（${stock.secid.split('.')[1] || stock.secid}）`}
      >
        <div className="s-td-name-text">{stock.name}</div>
        <div className="s-td-name-meta">
          <span className="s-td-name-tags">
            {displayMode === 'primary' && stock.is_primary && (
              <span className="s-dropdown-tag s-tag-primary">主</span>
            )}
            <span className={`s-dropdown-tag ${assetTypeTagClass(stock.asset_type)}`}>
              {assetTypeTagLabel(stock.asset_type)}
            </span>
          </span>
          <span className="s-td-name-detail">
            <span className="s-td-name-code">{stock.secid.split('.')[1] || stock.secid}</span>
            {marketValue > 0 && (
              <>
                <span className="s-td-name-dot" aria-hidden>
                  ·
                </span>
                <span className="s-td-name-hold">持有 {fmtNum(marketValue)} 元</span>
              </>
            )}
          </span>
        </div>
      </td>

      <td className="s-td-num">{stock.quantity > 0 ? fmtNum(stock.quantity, 2) : '-'}</td>

      <td className="s-td-num s-td-stacked">
        <div>
          <FlashValue
            value={currentPrice}
            formatted={currentPrice > 0 ? fmtNum(currentPrice) : '-'}
          />
        </div>
        <div>{stock.cost_price > 0 ? fmtNum(stock.cost_price, 4) : '-'}</div>
      </td>

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

      <td className="s-td-action">
        <div className="s-row-actions">
          <button
            type="button"
            className="s-row-edit"
            onClick={() => onEdit(stock.secid)}
            aria-label={`编辑 ${stock.name}`}
            title="编辑"
          >
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden
            >
              <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
              <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
            </svg>
          </button>
          <button
            type="button"
            className="s-row-delete"
            onClick={() => onDelete(stock.secid)}
            aria-label={`删除 ${stock.name}`}
            title="删除"
          >
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden
            >
              <polyline points="3 6 5 6 21 6" />
              <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
            </svg>
          </button>
        </div>
      </td>
    </tr>
  );
}
