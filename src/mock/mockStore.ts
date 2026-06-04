import { useSyncExternalStore } from 'react';
import { emit, listen } from '@tauri-apps/api/event';
import type { TradeStatus } from '../types/pet';

const STORAGE_KEY = 'stock-pet-mock-state';

export interface MockState {
  enabled: boolean;
  tradeStatus: TradeStatus;
  changePct: number;
}

const DEFAULT_STATE: MockState = {
  enabled: false,
  tradeStatus: 'trading',
  changePct: 0,
};

const listeners = new Set<() => void>();

function loadState(): MockState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      return { ...DEFAULT_STATE, ...JSON.parse(raw) };
    }
  } catch {
    // ignore invalid storage
  }
  return DEFAULT_STATE;
}

let state = loadState();

export function getMockState(): MockState {
  return state;
}

export function subscribeMockState(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function notifyListeners(): void {
  listeners.forEach((fn) => fn());
}

export async function setMockState(patch: Partial<MockState>): Promise<void> {
  state = { ...state, ...patch };
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  notifyListeners();
  await emit('mock-state', state);
}

export function useMockState(): MockState {
  return useSyncExternalStore(subscribeMockState, getMockState, getMockState);
}

export async function initMockStateSync(): Promise<() => void> {
  const unlisten = await listen<MockState>('mock-state', (event) => {
    state = event.payload;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    notifyListeners();
  });
  return unlisten;
}

export const MOCK_PRESETS: { label: string; tradeStatus: TradeStatus; changePct: number }[] = [
  { label: '休市', tradeStatus: 'sleep', changePct: 0 },
  { label: '待机', tradeStatus: 'rest', changePct: 0 },
  { label: '+5%', tradeStatus: 'trading', changePct: 5 },
  { label: '+1.5%', tradeStatus: 'trading', changePct: 1.5 },
  { label: '0%', tradeStatus: 'trading', changePct: 0.3 },
  { label: '-2%', tradeStatus: 'trading', changePct: -2 },
  { label: '-4%', tradeStatus: 'trading', changePct: -4 },
  { label: '-7%', tradeStatus: 'trading', changePct: -7 },
  { label: '+10%', tradeStatus: 'trading', changePct: 10 },
];
