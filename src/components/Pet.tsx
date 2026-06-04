import { useEffect, useCallback, useState } from 'react';
import { listen } from '@tauri-apps/api/event';
import { getCurrentWindow } from '@tauri-apps/api/window';
import { initMockStateSync, useMockState } from '../mock/mockStore';
import type { PetStockState, TradeStatus } from '../types/pet';
import PetView from './PetView';

export default function Pet() {
  const mock = useMockState();
  const [stock, setStock] = useState<PetStockState | null>(null);
  const [tradeStatus, setTradeStatus] = useState<TradeStatus>('rest');

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
    e.currentTarget.setPointerCapture(e.pointerId);
    try {
      await getCurrentWindow().startDragging();
    } catch {
      // 非 Tauri 环境或窗口不可拖拽时忽略
    }
  }, []);

  const resolvedTradeStatus = mock.enabled ? mock.tradeStatus : tradeStatus;
  const resolvedPct = mock.enabled ? mock.changePct : (stock?.change_pct ?? 0);

  return (
    <PetView
      tradeStatus={resolvedTradeStatus}
      changePct={resolvedPct}
      onPointerDown={handlePointerDown}
    />
  );
}
