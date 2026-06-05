import type { ReactNode } from 'react';
import { useAppUpdater } from '../hooks/useAppUpdater';
import { UpdaterContext } from './updaterContext';

export function UpdaterProvider({ children }: { children: ReactNode }) {
  const value = useAppUpdater({ autoCheck: true });
  return <UpdaterContext.Provider value={value}>{children}</UpdaterContext.Provider>;
}
