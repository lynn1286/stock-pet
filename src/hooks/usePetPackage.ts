import { useCallback, useEffect, useState } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { listen } from '@tauri-apps/api/event';
import type { ActivePetPackage } from '../types/petPackage';

export function useActivePetPackage() {
  const [petPackage, setPetPackage] = useState<ActivePetPackage | null>(null);

  const load = useCallback(async () => {
    try {
      setPetPackage(await invoke<ActivePetPackage | null>('get_active_pet_package'));
    } catch {
      setPetPackage(null);
    }
  }, []);

  useEffect(() => {
    queueMicrotask(() => void load());
    const unlisten = listen<string>('pet-selection-changed', () => void load());
    return () => {
      unlisten.then((fn) => fn());
    };
  }, [load]);

  return petPackage;
}
