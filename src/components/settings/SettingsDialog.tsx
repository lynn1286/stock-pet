import { useLayoutEffect, useRef, useState } from 'react';
import { MockToggle } from '../../mock/MockToggle';
import { onDialogMouseDown } from '../../lib/dialogClick';
import { useUpdater } from '../../hooks/useUpdater';
import type { PrivacyMode } from '../../lib/privacyMode';
import { PrivacyModeOptions } from './PrivacyModeOptions';
import { PetPackageSettings } from './PetPackageSettings';

type DisplayMode = 'primary' | 'summary';
type TrayDisplay = 'amount' | 'pct';
export type SettingsSection = 'pet' | 'portfolio' | 'privacy' | 'vision' | 'about';

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
  embedded?: boolean;
  embeddedSection?: SettingsSection;
  displayMode: DisplayMode;
  trayDisplay: TrayDisplay;
  privacyMode: PrivacyMode;
  stocks: StockItem[];
  visionConfig: VisionConfig;
  selectedPetId: string;
  onDisplayModeChange: (mode: DisplayMode) => void;
  onTrayDisplayChange: (mode: TrayDisplay) => void;
  onPrivacyModeChange: (mode: PrivacyMode) => void;
  onSetPrimary: (secid: string) => void;
  onSaveVisionConfig: (cfg: VisionConfig) => Promise<void> | void;
  onSelectedPetChange: (petId: string) => Promise<void> | void;
  onClose: () => void;
}

const sections: Array<{ id: SettingsSection; label: string; description: string }> = [
  { id: 'pet', label: '桌宠', description: '角色与行情联动' },
  { id: 'portfolio', label: '行情', description: '托盘显示方式' },
  { id: 'privacy', label: '隐私', description: '隐藏敏感数据' },
  { id: 'vision', label: '图片识别', description: '导入持仓配置' },
  { id: 'about', label: '关于', description: '版本与更新' },
];

export function SettingsDialog({
  open,
  embedded = false,
  embeddedSection,
  displayMode,
  trayDisplay,
  privacyMode,
  stocks,
  visionConfig,
  selectedPetId,
  onDisplayModeChange,
  onTrayDisplayChange,
  onPrivacyModeChange,
  onSetPrimary,
  onSaveVisionConfig,
  onSelectedPetChange,
  onClose,
}: SettingsDialogProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const updater = useUpdater();
  const [section, setSection] = useState<SettingsSection>('pet');
  const [vBaseUrl, setVBaseUrl] = useState(visionConfig.base_url);
  const [vApiKey, setVApiKey] = useState(visionConfig.api_key);
  const [vModel, setVModel] = useState(visionConfig.model);
  const [visionSaved, setVisionSaved] = useState(false);

  useLayoutEffect(() => {
    if (embedded) return;
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (open && !dialog.open) {
      dialog.showModal();
      setSection('pet');
      setVBaseUrl(visionConfig.base_url);
      setVApiKey(visionConfig.api_key);
      setVModel(visionConfig.model);
      setVisionSaved(false);
      requestAnimationFrame(() => {
        (document.activeElement as HTMLElement | null)?.blur();
      });
    } else if (!open && dialog.open) {
      dialog.close();
    }
  }, [embedded, open, visionConfig]);

  async function handleSaveVision() {
    await onSaveVisionConfig({ base_url: vBaseUrl, api_key: vApiKey, model: vModel });
    setVisionSaved(true);
    window.setTimeout(() => setVisionSaved(false), 2000);
  }

  const primarySecid = stocks.find((stock) => stock.is_primary)?.secid ?? stocks[0]?.secid ?? '';
  const activeSection = embeddedSection ?? section;
  const currentSection = sections.find((item) => item.id === activeSection) ?? sections[0];

  function requestClose() {
    dialogRef.current?.close();
  }

  const content = (
    <div className="s-settings-shell">
      {!embedded && (
        <aside className="s-settings-rail" aria-label="设置分类">
          <div className="s-settings-rail-brand">
            <span className="s-settings-rail-mark">P</span>
            <span>
              <strong>会盯盘</strong>
              <small>偏好设置</small>
            </span>
          </div>
          <nav className="s-settings-nav">
            {sections.map((item) => (
              <button
                key={item.id}
                type="button"
                className={section === item.id ? 'on' : ''}
                aria-current={section === item.id ? 'page' : undefined}
                onClick={() => setSection(item.id)}
              >
                <strong>{item.label}</strong>
                <small>{item.description}</small>
              </button>
            ))}
          </nav>
          <p className="s-settings-rail-note">设置会立即保存在本机</p>
        </aside>
      )}

      <section className="s-settings-workspace">
        <header className="s-settings-workspace-head">
          <div>
            <h2>{currentSection.label}</h2>
            <p>{currentSection.description}</p>
          </div>
          {!embedded && (
            <button
              type="button"
              className="s-dialog-close"
              onMouseDown={(event) => onDialogMouseDown(event, requestClose)}
              aria-label="关闭"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M6 6l12 12M18 6 6 18" />
              </svg>
            </button>
          )}
        </header>

        <div className="s-settings-pane">
          {activeSection === 'pet' && (
            <>
              <div className="s-preference-block">
                <div className="s-preference-copy">
                  <strong>角色</strong>
                  <span>选择角色，或从 ChatGPT 同步自定义桌宠。</span>
                </div>
                <PetPackageSettings selectedPetId={selectedPetId} onSelect={onSelectedPetChange} />
              </div>
              <div className="s-preference-block">
                <div className="s-preference-copy">
                  <strong>桌宠显示内容</strong>
                  <span>决定桌宠旁边显示单只股票还是整个组合。</span>
                </div>
                <div className="s-seg" role="radiogroup">
                  <button
                    className={`s-seg-btn ${displayMode === 'summary' ? 'on' : ''}`}
                    role="radio"
                    aria-checked={displayMode === 'summary'}
                    onClick={() => onDisplayModeChange('summary')}
                  >
                    总持仓
                  </button>
                  <button
                    className={`s-seg-btn ${displayMode === 'primary' ? 'on' : ''}`}
                    role="radio"
                    aria-checked={displayMode === 'primary'}
                    onClick={() => onDisplayModeChange('primary')}
                  >
                    主股票
                  </button>
                </div>
                {displayMode === 'primary' && stocks.length > 0 && (
                  <label className="s-field-row">
                    <span>主股票</span>
                    <select
                      className="s-select"
                      value={primarySecid}
                      onChange={(event) => onSetPrimary(event.target.value)}
                    >
                      {stocks.map((stock) => (
                        <option key={stock.secid} value={stock.secid}>
                          {stock.name}
                        </option>
                      ))}
                    </select>
                  </label>
                )}
              </div>
            </>
          )}

          {activeSection === 'portfolio' && (
            <div className="s-preference-block">
              <div className="s-preference-copy">
                <strong>菜单栏行情</strong>
                <span>选择菜单栏中最需要随时看到的数据。</span>
              </div>
              <div className="s-choice-grid" role="radiogroup">
                <button
                  className={trayDisplay === 'pct' ? 'on' : ''}
                  role="radio"
                  aria-checked={trayDisplay === 'pct'}
                  onClick={() => onTrayDisplayChange('pct')}
                >
                  <strong>收益率</strong>
                  <span>快速判断当天方向</span>
                </button>
                <button
                  className={trayDisplay === 'amount' ? 'on' : ''}
                  role="radio"
                  aria-checked={trayDisplay === 'amount'}
                  onClick={() => onTrayDisplayChange('amount')}
                >
                  <strong>收益金额</strong>
                  <span>关注当天实际盈亏</span>
                </button>
              </div>
            </div>
          )}

          {activeSection === 'privacy' && (
            <div className="s-preference-block">
              <div className="s-preference-copy">
                <strong>闭眼模式</strong>
                <span>共享屏幕或身处公共场所时隐藏敏感信息。</span>
              </div>
              <PrivacyModeOptions value={privacyMode} onChange={onPrivacyModeChange} />
            </div>
          )}

          {activeSection === 'vision' && (
            <div className="s-preference-block">
              <div className="s-preference-copy">
                <strong>识别服务</strong>
                <span>连接支持图片输入的 OpenAI 兼容模型。</span>
              </div>
              <label className="s-dialog-label">
                API 地址
                <input
                  className="s-dialog-input"
                  type="text"
                  placeholder="https://example.com/v1"
                  value={vBaseUrl}
                  onChange={(event) => setVBaseUrl(event.target.value)}
                />
              </label>
              <div className="s-dialog-row">
                <label className="s-dialog-label s-dialog-label-half">
                  API 密钥
                  <input
                    className="s-dialog-input"
                    type="password"
                    placeholder="sk-..."
                    value={vApiKey}
                    onChange={(event) => setVApiKey(event.target.value)}
                  />
                </label>
                <label className="s-dialog-label s-dialog-label-half">
                  模型
                  <input
                    className="s-dialog-input"
                    type="text"
                    placeholder="qwen-vl-max"
                    value={vModel}
                    onChange={(event) => setVModel(event.target.value)}
                  />
                </label>
              </div>
              <div className="s-settings-save-row">
                <button className="s-dialog-submit" onClick={() => void handleSaveVision()}>
                  {visionSaved ? '已保存' : '保存识别配置'}
                </button>
                <span>截图直接发送至所填服务，密钥明文保存在本机。</span>
              </div>
            </div>
          )}

          {activeSection === 'about' && (
            <>
              <div className="s-about-card">
                <span className="s-about-mark">P</span>
                <div>
                  <strong>会盯盘的桌宠</strong>
                  <span>
                    {updater.currentVersion ? `版本 ${updater.currentVersion}` : '本地桌面版'}
                  </span>
                </div>
              </div>
              {updater.enabled && (
                <div className="s-preference-block">
                  <div className="s-preference-copy">
                    <strong>应用更新</strong>
                    <span>
                      {updater.phase === 'uptodate' ? '当前已经是最新版本。' : '检查并安装新版本。'}
                    </span>
                  </div>
                  {(updater.phase === 'downloading' || updater.phase === 'ready') && (
                    <div className="s-update-progress" aria-label="更新进度">
                      <div
                        className="s-update-progress-bar"
                        style={{ width: `${updater.progress}%` }}
                      />
                    </div>
                  )}
                  {updater.phase === 'error' && (
                    <p className="s-setting-tip s-update-tip--error">{updater.error}</p>
                  )}
                  <button
                    type="button"
                    className="s-dialog-submit s-settings-update-button"
                    disabled={
                      updater.phase === 'checking' ||
                      updater.phase === 'downloading' ||
                      updater.phase === 'ready'
                    }
                    onClick={() =>
                      void (updater.phase === 'available'
                        ? updater.downloadAndInstall()
                        : updater.checkForUpdate())
                    }
                  >
                    {updater.phase === 'checking' && '正在检查…'}
                    {updater.phase === 'downloading' && `正在更新 ${updater.progress}%`}
                    {updater.phase === 'ready' && '正在重启…'}
                    {updater.phase === 'available' && `安装 v${updater.availableVersion}`}
                    {!['checking', 'downloading', 'ready', 'available'].includes(updater.phase) &&
                      '检查更新'}
                  </button>
                </div>
              )}
              <MockToggle />
            </>
          )}
        </div>
      </section>
    </div>
  );

  if (embedded) {
    return <section className="s-settings-inline">{content}</section>;
  }

  return (
    <dialog
      ref={dialogRef}
      className="s-dialog s-dialog-settings"
      onClose={onClose}
      onClick={(event) => {
        if (event.target === dialogRef.current) requestClose();
      }}
    >
      {content}
    </dialog>
  );
}
