import { useCallback, useEffect, useRef, useState } from 'react';
import { getVersion } from '@tauri-apps/api/app';
import { check, type Update } from '@tauri-apps/plugin-updater';
import { relaunch } from '@tauri-apps/plugin-process';
import { userMessage } from '../utils/errmsg';

export type UpdatePhase =
  | 'idle'
  | 'checking'
  | 'uptodate'
  | 'available'
  | 'downloading'
  | 'ready'
  | 'error';

export const isUpdaterEnabled =
  typeof window !== 'undefined' &&
  import.meta.env.PROD &&
  '__TAURI_INTERNALS__' in window;

export function useAppUpdater(options?: { autoCheck?: boolean }) {
  const pendingUpdate = useRef<Update | null>(null);
  const [phase, setPhase] = useState<UpdatePhase>('idle');
  const [currentVersion, setCurrentVersion] = useState('');
  const [availableVersion, setAvailableVersion] = useState('');
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState('');

  const checkForUpdate = useCallback(async (silent = false) => {
    if (!isUpdaterEnabled) return null;
    try {
      setPhase('checking');
      setError('');
      const update = await check();
      if (update) {
        pendingUpdate.current = update;
        setAvailableVersion(update.version);
        setPhase('available');
        return update;
      }
      pendingUpdate.current = null;
      setAvailableVersion('');
      setPhase('uptodate');
      return null;
    } catch (e) {
      pendingUpdate.current = null;
      setAvailableVersion('');
      setPhase('error');
      const message = userMessage(e);
      setError(message);
      if (!silent) throw e;
      return null;
    }
  }, []);

  const downloadAndInstall = useCallback(async () => {
    if (!isUpdaterEnabled) return;
    try {
      const update = pendingUpdate.current ?? (await check());
      if (!update) {
        setPhase('uptodate');
        return;
      }
      pendingUpdate.current = update;
      setAvailableVersion(update.version);
      setPhase('downloading');
      setProgress(0);
      let total = 0;
      let downloaded = 0;
      await update.downloadAndInstall((event) => {
        if (event.event === 'Started') {
          total = event.data.contentLength ?? 0;
          setProgress(0);
        } else if (event.event === 'Progress') {
          downloaded += event.data.chunkLength;
          if (total > 0) {
            setProgress(Math.min(100, Math.round((downloaded / total) * 100)));
          }
        }
      });
      setPhase('ready');
      await relaunch();
    } catch (e) {
      setPhase('error');
      setError(userMessage(e));
    }
  }, []);

  useEffect(() => {
    if (!isUpdaterEnabled) return;
    void getVersion().then(setCurrentVersion);
    if (options?.autoCheck) {
      void checkForUpdate(true);
    }
  }, [checkForUpdate, options?.autoCheck]);

  return {
    enabled: isUpdaterEnabled,
    phase,
    currentVersion,
    availableVersion,
    progress,
    error,
    checkForUpdate,
    downloadAndInstall,
  };
}
