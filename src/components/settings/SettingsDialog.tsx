type DisplayMode = 'primary' | 'summary'
type TrayDisplay = 'amount' | 'pct'

interface StockItem {
  secid: string
  name: string
  is_primary: boolean
}

interface SettingsDialogProps {
  open: boolean
  displayMode: DisplayMode
  trayDisplay: TrayDisplay
  stocks: StockItem[]
  onDisplayModeChange: (mode: DisplayMode) => void
  onTrayDisplayChange: (mode: TrayDisplay) => void
  onSetPrimary: (secid: string) => void
  onClose: () => void
}

export function SettingsDialog({
  open,
  displayMode,
  trayDisplay,
  stocks,
  onDisplayModeChange,
  onTrayDisplayChange,
  onSetPrimary,
  onClose,
}: SettingsDialogProps) {
  if (!open) return null

  const primarySecid = stocks.find(s => s.is_primary)?.secid ?? stocks[0]?.secid ?? ''

  return (
    <div className="s-overlay" onClick={onClose}>
      <div className="s-dialog" onClick={e => e.stopPropagation()}>
        <div className="s-dialog-header">
          <span className="s-dialog-title">设置</span>
          <button className="s-dialog-close" onClick={onClose} aria-label="关闭">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden>
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        <div className="s-dialog-body">
          <div className="s-setting-item" style={{ padding: 0 }}>
            <div className="s-setting-head">
              <span className="s-setting-label">桌宠显示</span>
              <div className="s-seg" role="radiogroup">
                <button
                  className={`s-seg-btn ${displayMode === 'primary' ? 'on' : ''}`}
                  role="radio"
                  aria-checked={displayMode === 'primary'}
                  onClick={() => onDisplayModeChange('primary')}
                >
                  主股票盈亏
                </button>
                <button
                  className={`s-seg-btn ${displayMode === 'summary' ? 'on' : ''}`}
                  role="radio"
                  aria-checked={displayMode === 'summary'}
                  onClick={() => onDisplayModeChange('summary')}
                >
                  总持仓盈亏
                </button>
              </div>
            </div>
            {displayMode === 'primary' && stocks.length > 0 && (
              <div className="s-setting-primary-select">
                <span className="s-setting-primary-label">主股票</span>
                <select
                  className="s-dialog-input"
                  value={primarySecid}
                  onChange={e => onSetPrimary(e.target.value)}
                >
                  {stocks.map(s => (
                    <option key={s.secid} value={s.secid}>{s.name}</option>
                  ))}
                </select>
              </div>
            )}
            <p className="s-setting-tip">桌宠动画和涨跌表现跟随哪只股票。主股票 = 仅标记为"主"的那只，总持仓 = 全部持仓加总</p>
          </div>

          <div className="s-setting-item" style={{ padding: 0 }}>
            <div className="s-setting-head">
              <span className="s-setting-label">托盘显示</span>
              <div className="s-seg" role="radiogroup">
                <button
                  className={`s-seg-btn ${trayDisplay === 'amount' ? 'on' : ''}`}
                  role="radio"
                  aria-checked={trayDisplay === 'amount'}
                  onClick={() => onTrayDisplayChange('amount')}
                >
                  金额
                </button>
                <button
                  className={`s-seg-btn ${trayDisplay === 'pct' ? 'on' : ''}`}
                  role="radio"
                  aria-checked={trayDisplay === 'pct'}
                  onClick={() => onTrayDisplayChange('pct')}
                >
                  收益率
                </button>
              </div>
            </div>
            <p className="s-setting-tip">菜单栏托盘图标旁显示当日收益金额还是当日涨跌幅</p>
          </div>
        </div>
      </div>
    </div>
  )
}
