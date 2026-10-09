import { useEffect, useCallback, useState } from 'react';
import { listen } from '@tauri-apps/api/event';
import { invoke } from '@tauri-apps/api/core';
import { PhysicalPosition } from '@tauri-apps/api/dpi';
import { getCurrentWindow } from '@tauri-apps/api/window';
import { initMockStateSync, useMockState } from '../mock/mockStore';
import type { PetStockState, TradeStatus } from '../types/pet';
import { useActivePetPackage } from '../hooks/usePetPackage';
import PetView from './PetView';

export default function Pet() {
  const mock = useMockState();
  const [stock, setStock] = useState<PetStockState | null>(null);
  const [tradeStatus, setTradeStatus] = useState<TradeStatus>('rest');
  const [petSize, setPetSize] = useState(104);
  const petPackage = useActivePetPackage();

  useEffect(() => {
    let unlistenMock: (() => void) | undefined;
    void initMockStateSync().then((fn) => {
      unlistenMock = fn;
    });
    return () => {
      unlistenMock?.();
    };
  }, []);

  useEffect(() => {
    void invoke<number>('get_pet_size')
      .then(setPetSize)
      .catch(() => undefined);
    const unlisten = listen<number>('pet-size-changed', (event) => setPetSize(event.payload));
    return () => {
      unlisten.then((fn) => fn());
    };
  }, []);

  useEffect(() => {
    if (mock.enabled) return;

    const unlistenTrade = listen<TradeStatus>('trade-status', (e) => {
      setTradeStatus(e.payload);
    });

    const unlistenStock = listen<PetStockState>('stock-state', (e) => {
      setStock(e.payload);
    });

    return () => {
      unlistenTrade.then((fn) => fn());
      unlistenStock.then((fn) => fn());
    };
  }, [mock.enabled]);

  const handlePointerDown = useCallback(async (e: React.PointerEvent) => {
    if (e.button !== 0) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    try {
      await getCurrentWindow().startDragging();
    } catch {
      // 非 Tauri 环境或窗口不可拖拽时忽略
    }
  }, []);

  const hidePet = useCallback(async () => {
    await getCurrentWindow().hide();
  }, []);

  const handleKeyDown = useCallback((event: React.KeyboardEvent<HTMLDivElement>) => {
    const offsets: Record<string, [number, number]> = {
      ArrowLeft: [-16, 0],
      ArrowRight: [16, 0],
      ArrowUp: [0, -16],
      ArrowDown: [0, 16],
    };
    const offset = offsets[event.key];
    if (!offset) return;
    event.preventDefault();
    void (async () => {
      const appWindow = getCurrentWindow();
      const position = await appWindow.outerPosition();
      await appWindow.setPosition(
        new PhysicalPosition(position.x + offset[0], position.y + offset[1]),
      );
    })();
  }, []);

  const resolvedTradeStatus = mock.enabled ? mock.tradeStatus : tradeStatus;
  const resolvedPct = mock.enabled ? mock.changePct : (stock?.change_pct ?? 0);

  return (
    <main
      className="pet-shell"
      tabIndex={0}
      onKeyDown={handleKeyDown}
      onContextMenu={(event) => {
        event.preventDefault();
        void hidePet();
      }}
    >
      <PetView
        tradeStatus={resolvedTradeStatus}
        changePct={resolvedPct}
        petPackage={petPackage}
        size={petSize}
        onPointerDown={handlePointerDown}
      />
    </main>
  );
}
