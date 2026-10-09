import { useCallback, useEffect, useState } from 'react';
import { invoke } from '@tauri-apps/api/core';
import type { PetPackageSummary } from '../types/petPackage';

function readFileBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('读取桌宠文件失败'));
    reader.onload = () => {
      const result = typeof reader.result === 'string' ? reader.result : '';
      const comma = result.indexOf(',');
      if (comma < 0) reject(new Error('桌宠文件编码失败'));
      else resolve(result.slice(comma + 1));
    };
    reader.readAsDataURL(file);
  });
}

export function usePetPackages() {
  const [pets, setPets] = useState<PetPackageSummary[]>([]);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [isError, setIsError] = useState(false);

  const loadPets = useCallback(async () => {
    setPets(await invoke<PetPackageSummary[]>('list_pet_packages'));
  }, []);

  useEffect(() => {
    queueMicrotask(() => {
      void loadPets().catch(() => {
        setIsError(true);
        setMessage('读取桌宠角色失败');
      });
    });
  }, [loadPets]);

  const install = useCallback(
    async (file: File): Promise<PetPackageSummary> => {
      setBusy(true);
      setMessage('');
      try {
        const lowerName = file.name.toLowerCase();
        const isArchive = lowerName.endsWith('.zip');
        const isSprite = lowerName.endsWith('.png') || lowerName.endsWith('.webp');
        if (!isArchive && !isSprite) {
          throw new Error('请选择 ChatGPT PNG/WebP 图集或 ZIP 角色包');
        }
        const maxBytes = isArchive ? 24 * 1024 * 1024 : 20 * 1024 * 1024;
        if (file.size > maxBytes) {
          throw new Error(isArchive ? '角色包不能超过 24 MB' : '桌宠图集不能超过 20 MB');
        }

        const fileBase64 = await readFileBase64(file);
        const installed = isArchive
          ? await invoke<PetPackageSummary>('install_pet_package', {
              archiveBase64: fileBase64,
            })
          : await invoke<PetPackageSummary>('install_pet_spritesheet', {
              imageBase64: fileBase64,
              fileName: file.name,
            });
        await loadPets();
        setIsError(false);
        setMessage(`已导入 ${installed.displayName}`);
        return installed;
      } catch (error) {
        setIsError(true);
        const text = error instanceof Error ? error.message : String(error);
        setMessage(text);
        throw error;
      } finally {
        setBusy(false);
      }
    },
    [loadPets],
  );

  const syncFromChatGPT = useCallback(async (): Promise<PetPackageSummary[]> => {
    setBusy(true);
    setMessage('');
    try {
      const imported = await invoke<PetPackageSummary[]>('import_chatgpt_pets');
      if (imported.length === 0) throw new Error('没有找到可同步的 ChatGPT 自定义桌宠');
      await loadPets();
      setIsError(false);
      setMessage(`已同步 ${imported.length} 个 ChatGPT 自定义角色`);
      return imported;
    } catch (error) {
      setIsError(true);
      const text = error instanceof Error ? error.message : String(error);
      setMessage(text);
      throw error;
    } finally {
      setBusy(false);
    }
  }, [loadPets]);

  return { pets, busy, message, isError, install, syncFromChatGPT, reload: loadPets };
}
