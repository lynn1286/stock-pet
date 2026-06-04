import { useEffect } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { getMockState, initMockStateSync, setMockState, useMockState } from './mockStore';

export function MockToggle() {
  const mock = useMockState();

  useEffect(() => {
    let unlisten: (() => void) | undefined;
    void initMockStateSync().then((fn) => {
      unlisten = fn;
    });
    void invoke<boolean>('is_mock_panel_open').then((open) => {
      if (open !== getMockState().enabled) {
        void setMockState({ enabled: open });
      }
    });
    return () => {
      unlisten?.();
    };
  }, []);

  if (!import.meta.env.DEV) {
    return null;
  }

  async function handleToggle(enabled: boolean) {
    try {
      if (enabled) {
        await invoke('open_mock_panel');
        await setMockState({ enabled: true });
      } else {
        await invoke('close_mock_panel');
        await setMockState({ enabled: false });
      }
    } catch (e) {
      console.error(e);
    }
  }

  return (
    <>
      <div className="s-setting-divider" />
      <div className="s-setting-group">
        <div className="s-setting-head">
          <span className="s-setting-label">Mock</span>
          <div className="s-seg" role="group">
            <button
              type="button"
              className={`s-seg-btn${mock.enabled ? ' on' : ''}`}
              onClick={(e) => {
                e.stopPropagation();
                void handleToggle(true);
              }}
            >
              开
            </button>
            <button
              type="button"
              className={`s-seg-btn${!mock.enabled ? ' on' : ''}`}
              onClick={(e) => {
                e.stopPropagation();
                void handleToggle(false);
              }}
            >
              关
            </button>
          </div>
        </div>
        <p className="s-setting-tip">开发专用。开启后打开右上角状态模拟窗，主桌宠使用模拟数据。</p>
      </div>
    </>
  );
}
