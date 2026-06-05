import { createContext } from 'react';
import type { useAppUpdater } from '../hooks/useAppUpdater';

export type UpdaterContextValue = ReturnType<typeof useAppUpdater>;

export const UpdaterContext = createContext<UpdaterContextValue | null>(null);
