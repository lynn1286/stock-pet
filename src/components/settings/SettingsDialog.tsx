import { useRef, useEffect, useState } from 'react';
import { MockToggle } from '../../mock/MockToggle';

type DisplayMode = 'primary' | 'summary';
type TrayDisplay = 'amount' | 'pct';

interface StockItem {
  secid: string;
  name: string;
  is_primary: boolean;
}

interface VisionConfig {
  base_url: string;
  api_key: string;
  model: string;
}

interface SettingsDialogProps {
  open: boolean;
  displayMode: DisplayMode;
  trayDisplay: TrayDisplay;
  stocks: StockItem[];
  visionConfig: VisionConfig;
  onDisplayModeChange: (mode: DisplayMode) => void;
  onTrayDisplayChange: (mode: TrayDisplay) => void;
  onSetPrimary: (secid: string) => void;
  onSaveVisionConfig: (cfg: VisionConfig) => Promise<void> | void;
  onClose: () => void;
}

export function SettingsDialog({
  open,
  displayMode,
  trayDisplay,
  stocks,
  visionConfig,
  onDisplayModeChange,
  onTrayDisplayChange,
  onSetPrimary,
  onSaveVisionConfig,
  onClose,
}: SettingsDialogProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [vBaseUrl, setVBaseUrl] = useState(visionConfig.base_url);
  const [vApiKey, setVApiKey] = useState(visionConfig.api_key);
  const [vModel, setVModel] = useState(visionConfig.model);
  const [visionSaved, setVisionSaved] = useState(false);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (open && !dialog.open) {
      dialog.showModal();
      // 打开时同步最新的视觉配置，丢弃上次未保存的草稿
      setVBaseUrl(visionConfig.base_url);
      setVApiKey(visionConfig.api_key);
      setVModel(visionConfig.model);
      setVisionSaved(false);
      // showModal 会默认聚焦第一个可聚焦控件（关闭按钮），此处不保留初始焦点
      requestAnimationFrame(() => {
        (document.activeElement as HTMLElement | null)?.blur();
      });
    } else if (!open && dialog.open) {
      dialog.close();
    }
  }, [open, visionConfig]);

  async function handleSaveVision() {
    await onSaveVisionConfig({ base_url: vBaseUrl, api_key: vApiKey, model: vModel });
    setVisionSaved(true);
    setTimeout(() => setVisionSaved(false), 2000);
  }

  const primarySecid = stocks.find((s) => s.is_primary)?.secid ?? stocks[0]?.secid ?? '';

  function handleBackdropClick(e: React.MouseEvent<HTMLDialogElement>) {
    if (e.target === dialogRef.current) {
      onClose();
    }
  }

  return (
    <dialog ref={dialogRef} className="s-dialog" onClose={onClose} onClick={handleBackdropClick}>
      <div className="s-dialog-header">
        <span className="s-dialog-title">设置</span>
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
        <div className="s-setting-group">
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
            <div className="s-setting-row">
              <span className="s-setting-row-label">主股票</span>
              <select
                className="s-select"
                value={primarySecid}
                onChange={(e) => onSetPrimary(e.target.value)}
              >
                {stocks.map((s) => (
                  <option key={s.secid} value={s.secid}>
                    {s.name}
                  </option>
                ))}
              </select>
            </div>
          )}
          <p className="s-setting-tip">桌宠动画和涨跌表现跟随哪只股票</p>
        </div>

        <div className="s-setting-divider" />

        <div className="s-setting-group">
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

        <div className="s-setting-divider" />

        <div className="s-setting-group">
          <span className="s-setting-label">图片识别（图片导入持仓）</span>
          <label className="s-dialog-label">
            API 地址（OpenAI 兼容，含 /v1）
            <input
              className="s-dialog-input"
              type="text"
              placeholder="https://dashscope.aliyuncs.com/compatible-mode/v1"
              value={vBaseUrl}
              onChange={(e) => setVBaseUrl(e.target.value)}
            />
          </label>
          <label className="s-dialog-label">
            API 密钥
            <input
              className="s-dialog-input"
              type="password"
              placeholder="sk-..."
              value={vApiKey}
              onChange={(e) => setVApiKey(e.target.value)}
            />
          </label>
          <label className="s-dialog-label">
            模型名（需支持图片输入）
            <input
              className="s-dialog-input"
              type="text"
              placeholder="qwen-vl-max"
              value={vModel}
              onChange={(e) => setVModel(e.target.value)}
            />
          </label>
          <div className="s-setting-row">
            <button className="s-dialog-submit" onClick={handleSaveVision}>
              {visionSaved ? '已保存' : '保存配置'}
            </button>
          </div>
          <p className="s-setting-tip">
            截图会上传到你配置的模型服务用于识别，不经过本应用服务器；密钥明文保存在本机
            config.json。
          </p>
        </div>

        <MockToggle />
      </div>
    </dialog>
  );
}
