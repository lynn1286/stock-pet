import { createContext, useContext, type ReactNode } from 'react';
import { useAppUpdater } from '../hooks/useAppUpdater';

type UpdaterContextValue = ReturnType<typeof useAppUpdater>;

const UpdaterContext = createContext<UpdaterContextValue | null>(null);

export function UpdaterProvider({ children }: { children: ReactNode }) {
  const value = useAppUpdater({ autoCheck: true });
  return <UpdaterContext.Provider value={value}>{children}</UpdaterContext.Provider>;
}

export function useUpdater() {
  const ctx = useContext(UpdaterContext);
  if (!ctx) {
    throw new Error('useUpdater must be used within UpdaterProvider');
  }
  return ctx;
}
