import { useMemo } from 'react';
import type { AssetType } from '../../lib/assetType';
import {
  hideMarketValue,
  hideProfitAmount,
  hideProfitPct,
  HIDDEN_AMOUNT,
  HIDDEN_PCT,
  type PrivacyMode,
} from '../../lib/privacyMode';
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
  privacyMode: PrivacyMode;
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

export function PortfolioSummary({ stocks, liveStocks, privacyMode }: PortfolioSummaryProps) {
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

  const assetFormatted = hideMarketValue(privacyMode)
    ? HIDDEN_AMOUNT
    : fmtNum(summary.totalMarketValue);
  const profitFormatted = hideProfitAmount(privacyMode)
    ? HIDDEN_AMOUNT
    : fmtProfit(summary.totalProfit);
  const profitPctFormatted = hideProfitPct(privacyMode)
    ? HIDDEN_PCT
    : `${summary.totalProfitPct >= 0 ? '+' : ''}${summary.totalProfitPct.toFixed(2)}%`;
  const dailyProfitFormatted = hideProfitAmount(privacyMode)
    ? HIDDEN_AMOUNT
    : fmtProfit(summary.totalDailyProfit);
  const dailyPctFormatted = hideProfitPct(privacyMode)
    ? HIDDEN_PCT
    : `${summary.totalDailyPct >= 0 ? '+' : ''}${summary.totalDailyPct.toFixed(2)}%`;

  return (
    <section className="s-summary-panel" aria-label="资产概览">
      <div className="s-summary-grid">
        <article className="s-summary-card s-summary-card--primary">
          <div className="s-summary-card-head">
            <span className="s-summary-card-icon" aria-hidden>
              ¥
            </span>
            <span className="s-summary-label">持仓资产</span>
          </div>
          <div className="s-summary-card-value">
            <FlashValue
              value={summary.totalMarketValue}
              formatted={assetFormatted}
              className="s-summary-asset"
            />
          </div>
          <span className="s-summary-card-foot">按最新行情估算</span>
        </article>

        <article className="s-summary-card">
          <div className="s-summary-card-head">
            <span className="s-summary-card-icon" aria-hidden>
              今
            </span>
            <span className="s-summary-label">当日收益</span>
          </div>
          <div className="s-summary-values">
            <FlashValue
              value={summary.totalDailyProfit}
              formatted={dailyProfitFormatted}
              className={`s-summary-metric-value ${hideProfitAmount(privacyMode) ? '' : profitClass(summary.totalDailyProfit)}`}
            />
          </div>
          <span
            className={`s-summary-card-foot ${hideProfitPct(privacyMode) ? '' : profitClass(summary.totalDailyPct)}`}
          >
            {dailyPctFormatted}
          </span>
        </article>

        <article className="s-summary-card">
          <div className="s-summary-card-head">
            <span className="s-summary-card-icon" aria-hidden>
              累
            </span>
            <span className="s-summary-label">持有收益</span>
          </div>
          <div className="s-summary-values">
            <FlashValue
              value={summary.totalProfit}
              formatted={profitFormatted}
              className={`s-summary-metric-value ${hideProfitAmount(privacyMode) ? '' : profitClass(summary.totalProfit)}`}
            />
          </div>
          <span
            className={`s-summary-card-foot ${hideProfitPct(privacyMode) ? '' : profitClass(summary.totalProfitPct)}`}
          >
            {profitPctFormatted}
          </span>
        </article>

        <article className="s-summary-card s-summary-card--count">
          <div className="s-summary-card-head">
            <span className="s-summary-card-icon" aria-hidden>
              持
            </span>
            <span className="s-summary-label">关注资产</span>
          </div>
          <strong className="s-summary-count">{stocks.length}</strong>
          <span className="s-summary-card-foot">桌宠持续盯盘</span>
        </article>
      </div>
    </section>
  );
}
