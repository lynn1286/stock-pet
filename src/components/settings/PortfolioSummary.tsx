import { useMemo } from 'react';
import type { AssetType } from '../../lib/assetType';
import { FlashValue } from './FlashValue';

interface StockConfig {
  secid: string;
  name: string;
  quantity: number;
  cost_price: number;
  asset_type: AssetType;
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

function profitClass(n: number): string {
  if (n > 0) return 's-profit-up';
  if (n < 0) return 's-profit-down';
  return '';
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
    <section className="s-summary-panel">
      <div className="s-summary-scroll">
        <div className="s-summary-row">
          <div className="s-summary-item s-summary-item--asset">
            <span className="s-summary-label">持仓资产</span>
            <FlashValue
              value={summary.totalMarketValue}
              formatted={fmtNum(summary.totalMarketValue)}
              className="s-summary-asset"
            />
          </div>

          <div className="s-summary-right">
            <div className="s-summary-item">
              <span className="s-summary-label">持有收益</span>
              <div className="s-summary-values">
                <FlashValue
                  value={summary.totalProfit}
                  formatted={fmtProfit(summary.totalProfit)}
                  className={`s-summary-metric-value ${profitClass(summary.totalProfit)}`}
                />
                <span className={`s-summary-metric-pct ${profitClass(summary.totalProfitPct)}`}>
                  {summary.totalProfitPct >= 0 ? '+' : ''}
                  {summary.totalProfitPct.toFixed(2)}%
                </span>
              </div>
            </div>

            <div className="s-summary-item">
              <span className="s-summary-label">当日收益</span>
              <div className="s-summary-values">
                <FlashValue
                  value={summary.totalDailyProfit}
                  formatted={fmtProfit(summary.totalDailyProfit)}
                  className={`s-summary-metric-value ${profitClass(summary.totalDailyProfit)}`}
                />
                <span className={`s-summary-metric-pct ${profitClass(summary.totalDailyPct)}`}>
                  {summary.totalDailyPct >= 0 ? '+' : ''}
                  {summary.totalDailyPct.toFixed(2)}%
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
