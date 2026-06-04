import { useEffect } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { getCurrentWindow } from '@tauri-apps/api/window';
import { MockStatePanel } from '../mock/MockStatePanel';
import { initMockStateSync, setMockState } from '../mock/mockStore';

export default function MockSettings() {
  useEffect(() => {
    let unlistenSync: (() => void) | undefined;
    void initMockStateSync().then((fn) => {
      unlistenSync = fn;
    });
    return () => {
      unlistenSync?.();
    };
  }, []);

  useEffect(() => {
    let unlistenClose: (() => void) | undefined;
    void (async () => {
      unlistenClose = await getCurrentWindow().onCloseRequested(async (event) => {
        event.preventDefault();
        await setMockState({ enabled: false });
        await invoke('close_mock_panel');
      });
    })();
    return () => {
      unlistenClose?.();
    };
  }, []);

  return (
    <div className="s-app s-app-mock-panel s-mock-only">
      <header className="s-topbar s-mock-topbar">
        <div className="s-topbar-left">
          <span className="s-mock-topbar-title">状态模拟</span>
          <span className="s-mock-dev-badge">DEV</span>
        </div>
      </header>
      <MockStatePanel alwaysShow standalone />
    </div>
  );
}
