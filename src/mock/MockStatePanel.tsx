import { MOCK_PRESETS, setMockState, useMockState, type MockState } from './mockStore';
import {
  describePetStateDebug,
  describePetStateLabel,
  formatSignedPct,
  mockPctToneClass,
} from '../utils/petState';

interface MockStatePanelProps {
  alwaysShow?: boolean;
  standalone?: boolean;
}

function isPresetActive(preset: (typeof MOCK_PRESETS)[number], mock: MockState): boolean {
  return (
    preset.tradeStatus === mock.tradeStatus && Math.abs(preset.changePct - mock.changePct) < 0.05
  );
}

export function MockStatePanel({ alwaysShow = false, standalone = false }: MockStatePanelProps) {
  const mock = useMockState();
  const isTrading = mock.tradeStatus === 'trading';

  if (!import.meta.env.DEV || (!alwaysShow && !mock.enabled)) {
    return null;
  }

  async function patchState(next: Partial<MockState>) {
    await setMockState(next);
  }

  const stateLabel = describePetStateLabel(mock.tradeStatus, mock.changePct);
  const stateDebug = describePetStateDebug(mock.tradeStatus, mock.changePct);
  const pctClass = mockPctToneClass(mock.tradeStatus, mock.changePct);

  return (
    <section className="s-mock-panel">
      <div className={`s-mock-panel-head${standalone ? ' s-mock-panel-head-standalone' : ''}`}>
        {!standalone && <span className="s-mock-panel-title">桌宠状态模拟</span>}
        <span className="s-mock-state" title={stateDebug}>
          {stateLabel}
        </span>
      </div>

      <div className={`s-mock-range${isTrading ? '' : ' is-disabled'}`}>
        <div className="s-setting-row">
          <span className="s-setting-row-label">涨跌幅</span>
          <span className={`s-mock-pct ${pctClass}`}>
            {isTrading ? formatSignedPct(mock.changePct) : '—'}
          </span>
        </div>
        <input
          className="s-mock-slider"
          type="range"
          min={-10}
          max={10}
          step={0.1}
          value={mock.changePct}
          disabled={!isTrading}
          aria-label="涨跌幅"
          aria-valuetext={isTrading ? formatSignedPct(mock.changePct) : '非交易时段不可用'}
          onChange={(e) => void patchState({ changePct: Number(e.target.value) })}
        />
      </div>

      <div className="s-mock-presets">
        {MOCK_PRESETS.map((preset) => (
          <button
            key={preset.label}
            type="button"
            className={`s-mock-preset${isPresetActive(preset, mock) ? ' on' : ''}`}
            onClick={() =>
              void patchState({
                tradeStatus: preset.tradeStatus,
                changePct: preset.changePct,
              })
            }
          >
            {preset.label}
          </button>
        ))}
      </div>
    </section>
  );
}
