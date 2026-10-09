import { useRef } from 'react';
import { usePetPackages } from '../../hooks/usePetPackages';

interface PetPackageSettingsProps {
  selectedPetId: string;
  onSelect: (petId: string) => Promise<void> | void;
}

export function PetPackageSettings({ selectedPetId, onSelect }: PetPackageSettingsProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const { pets, busy, message, isError, install, syncFromChatGPT } = usePetPackages();

  async function handleFile(file: File | undefined) {
    if (!file || busy) return;
    try {
      const installed = await install(file);
      await onSelect(installed.id);
    } catch {
      // usePetPackages 已显示可操作的错误信息。
    } finally {
      if (inputRef.current) inputRef.current.value = '';
    }
  }

  async function handleSync() {
    if (busy) return;
    try {
      await syncFromChatGPT();
    } catch {
      // usePetPackages 已显示可操作的错误信息。
    }
  }

  return (
    <div className="s-pet-package-settings">
      <div className="s-setting-row">
        <span className="s-setting-row-label">当前角色</span>
        <select
          className="s-select"
          value={selectedPetId}
          disabled={busy}
          onChange={(event) => void onSelect(event.target.value)}
        >
          {pets.map((pet) => (
            <option key={pet.id} value={pet.id}>
              {pet.displayName}
            </option>
          ))}
        </select>
      </div>
      <div className="s-setting-row s-pet-package-actions">
        <input
          ref={inputRef}
          className="s-visually-hidden"
          type="file"
          accept=".png,.webp,.zip,image/png,image/webp,application/zip"
          onChange={(event) => void handleFile(event.target.files?.[0])}
        />
        <button
          type="button"
          className="s-dialog-submit"
          disabled={busy}
          onClick={() => void handleSync()}
        >
          {busy ? '处理中…' : '同步 ChatGPT'}
        </button>
        <button
          type="button"
          className="s-dialog-submit s-dialog-submit--secondary"
          disabled={busy}
          onClick={() => inputRef.current?.click()}
        >
          导入文件
        </button>
      </div>
      {message && (
        <p className={`s-setting-tip${isError ? ' s-update-tip--error' : ''}`}>{message}</p>
      )}
      <p className="s-setting-tip">
        同步本机 ~/.codex/pets 中的 ChatGPT 自定义角色；内置角色不会出现在该目录。
      </p>
    </div>
  );
}
