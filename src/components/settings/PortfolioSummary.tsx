import { useMemo } from 'react';
import { usePortfolioTrend, type TrendPoint } from '../../hooks/usePortfolioTrend';

interface StockConfig {
  secid: string;
  name: string;
  quantity: number;
  cost_price: number;
  asset_type: 'stock' | 'etf' | 'fund';
}

interface StockState {
  secid: string;
  price: number;
  change_pct: number;
  daily_profit: number;
}

interface PortfolioSummaryProps {
  stocks: StockConfig[];
  liveStocks: Map<string, StockState>;
}

function fmtNum(n: number): string {
  return n.toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function fmtProfit(n: number): string {
  const sign = n > 0 ? '+' : '';
  return `${sign}${n.toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

// 折线图
function TrendChart({ points }: { points: TrendPoint[] }) {
  if (points.length < 2) {
    return (
      <div className="s-trend-empty">
        <span>数据采集中…</span>
      </div>
    );
  }

  const values = points.map((p) => p.value);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;
  const padding = range * 0.1;
  const yMin = min - padding;
  const yMax = max + padding;

  const width = 280;
  const height = 60;
  const stepX = width / (points.length - 1);

  const pathPoints = points.map((p, i) => {
    const x = i * stepX;
    const y = height - ((p.value - yMin) / (yMax - yMin)) * height;
    return `${x},${y}`;
  });

  const linePath = `M${pathPoints.join(' L')}`;
  const areaPath = `${linePath} L${width},${height} L0,${height} Z`;

  // 起止价格用于标注
  const startVal = values[0];
  const endVal = values[values.length - 1];
  const isUp = endVal >= startVal;
  const strokeColor = isUp ? 'var(--up)' : 'var(--down)';

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="s-trend-svg" preserveAspectRatio="none">
      <defs>
        <linearGradient id="trendGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={strokeColor} stopOpacity="0.15" />
          <stop offset="100%" stopColor={strokeColor} stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={areaPath} fill="url(#trendGrad)" />
      <path
        d={linePath}
        fill="none"
        stroke={strokeColor}
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function PortfolioSummary({ stocks, liveStocks }: PortfolioSummaryProps) {
  const trendPoints = usePortfolioTrend(stocks, liveStocks);

  const summary = useMemo(() => {
    let totalMarketValue = 0;
    let totalCost = 0;
    let totalDailyProfit = 0;

    for (const stock of stocks) {
      const live = liveStocks.get(stock.secid);
      const price = live?.price || 0;
      const marketValue = stock.quantity > 0 && price > 0 ? stock.quantity * price : 0;
      const cost = stock.quantity > 0 ? stock.quantity * stock.cost_price : 0;
      const dailyProfit = stock.quantity > 0 && live ? live.daily_profit : 0;

      totalMarketValue += marketValue;
      totalCost += cost;
      totalDailyProfit += dailyProfit;
    }

    const totalProfit = totalMarketValue - totalCost;
    const totalProfitPct = totalCost > 0 ? (totalProfit / totalCost) * 100 : 0;
    const totalDailyPct = totalMarketValue > 0 ? (totalDailyProfit / totalMarketValue) * 100 : 0;

    return { totalMarketValue, totalProfit, totalProfitPct, totalDailyProfit, totalDailyPct };
  }, [stocks, liveStocks]);

  if (stocks.length === 0) return null;

  return (
    <div className="s-summary">
      <div className="s-summary-header">
        <span className="s-summary-title">持仓资产</span>
        <span className="s-summary-asset">{fmtNum(summary.totalMarketValue)}</span>
      </div>

      <div className="s-summary-metrics">
        <div className="s-metric">
          <span className="s-metric-label">持有收益</span>
          <span
            className={`s-metric-value ${summary.totalProfit > 0 ? 's-profit-up' : summary.totalProfit < 0 ? 's-profit-down' : ''}`}
          >
            {fmtProfit(summary.totalProfit)}
          </span>
          <span
            className={`s-metric-pct ${summary.totalProfitPct > 0 ? 's-profit-up' : summary.totalProfitPct < 0 ? 's-profit-down' : ''}`}
          >
            {summary.totalProfitPct >= 0 ? '+' : ''}
            {summary.totalProfitPct.toFixed(2)}%
          </span>
        </div>
        <div className="s-metric-divider" />
        <div className="s-metric">
          <span className="s-metric-label">当日收益</span>
          <span
            className={`s-metric-value ${summary.totalDailyProfit > 0 ? 's-profit-up' : summary.totalDailyProfit < 0 ? 's-profit-down' : ''}`}
          >
            {fmtProfit(summary.totalDailyProfit)}
          </span>
          <span
            className={`s-metric-pct ${summary.totalDailyPct > 0 ? 's-profit-up' : summary.totalDailyPct < 0 ? 's-profit-down' : ''}`}
          >
            {summary.totalDailyPct >= 0 ? '+' : ''}
            {summary.totalDailyPct.toFixed(2)}%
          </span>
        </div>
      </div>

      <div className="s-trend">
        <TrendChart points={trendPoints} />
      </div>
    </div>
  );
}
