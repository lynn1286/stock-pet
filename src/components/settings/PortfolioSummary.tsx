import { useMemo } from 'react';

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

export function PortfolioSummary({ stocks, liveStocks }: PortfolioSummaryProps) {
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
    </div>
  );
}
