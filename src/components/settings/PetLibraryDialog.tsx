import { useLayoutEffect, useRef } from 'react';
import { PetX } from '@petx/react';
import { onDialogMouseDown } from '../../lib/dialogClick';
import { useActivePetPackage } from '../../hooks/usePetPackage';
import { usePetPackages } from '../../hooks/usePetPackages';

interface PetLibraryDialogProps {
  open: boolean;
  embedded?: boolean;
  selectedPetId: string;
  onSelect: (petId: string) => Promise<void> | void;
  onClose: () => void;
}

export function PetLibraryDialog({
  open,
  embedded = false,
  selectedPetId,
  onSelect,
  onClose,
}: PetLibraryDialogProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const activePackage = useActivePetPackage();
  const { pets, busy, message, isError, install, syncFromChatGPT } = usePetPackages();

  useLayoutEffect(() => {
    if (embedded) return;
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    else if (!open && dialog.open) dialog.close();
  }, [embedded, open]);

  function requestClose() {
    dialogRef.current?.close();
  }

  async function handleSync() {
    if (busy) return;
    try {
      await syncFromChatGPT();
    } catch {
      // usePetPackages 已处理错误文案。
    }
  }

  async function handleFile(file: File | undefined) {
    if (!file || busy) return;
    try {
      const installed = await install(file);
      await onSelect(installed.id);
    } catch {
      // usePetPackages 已处理错误文案。
    } finally {
      if (inputRef.current) inputRef.current.value = '';
    }
  }

  const selected = pets.find((pet) => pet.id === selectedPetId);

  const content = (
    <>
      <div className="s-dialog-header s-pets-header">
        <div>
          <span className="s-dialog-title">桌宠工作室</span>
          <p className="s-dialog-subtitle">同步、预览并切换你的桌面伙伴</p>
        </div>
        {!embedded && (
          <button
            type="button"
            className="s-dialog-close"
            onMouseDown={(event) => onDialogMouseDown(event, requestClose)}
            aria-label="关闭"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M6 6l12 12M18 6L6 18" />
            </svg>
          </button>
        )}
      </div>

      <div className="s-pets-layout">
        <section className="s-pets-stage" aria-label="当前桌宠预览">
          <div className="s-pets-stage-grid" aria-hidden />
          <div className="s-pets-preview">
            {activePackage ? (
              <PetX
                src={activePackage.spritesheetDataUrl}
                pet={activePackage.manifest}
                animation="idle"
                size={128}
                title={activePackage.manifest.displayName}
              />
            ) : (
              <span className="s-pets-preview-loading">正在加载角色…</span>
            )}
          </div>
          <div className="s-pets-stage-caption">
            <strong>
              {selected?.displayName ?? activePackage?.manifest.displayName ?? '桌宠角色'}
            </strong>
            <span>
              {selected?.description ||
                activePackage?.manifest.description ||
                '当前正在使用的桌宠角色'}
            </span>
          </div>
          <div className="s-pets-source-badges" aria-hidden>
            <span>ChatGPT 同步</span>
            <span>本地运行</span>
          </div>
        </section>

        <section className="s-pets-catalog">
          <div className="s-pets-catalog-head">
            <span>我的角色</span>
            <span>{pets.length} 个</span>
          </div>
          <div className="s-pets-list" role="radiogroup" aria-label="选择桌宠角色">
            {pets.map((pet) => {
              const active = pet.id === selectedPetId;
              return (
                <button
                  key={pet.id}
                  type="button"
                  className={`s-pet-card${active ? ' on' : ''}`}
                  role="radio"
                  aria-checked={active}
                  onClick={() => void onSelect(pet.id)}
                >
                  <span className="s-pet-card-mark" aria-hidden>
                    {pet.displayName.slice(0, 1)}
                  </span>
                  <span className="s-pet-card-copy">
                    <strong>{pet.displayName}</strong>
                    <small>{`精灵图 v${pet.spriteVersionNumber}`}</small>
                  </span>
                  <span className="s-pet-card-check" aria-hidden>
                    {active ? '✓' : ''}
                  </span>
                </button>
              );
            })}
          </div>

          <div className="s-pets-install">
            <input
              ref={inputRef}
              className="s-visually-hidden"
              type="file"
              accept=".png,.webp,.zip,image/png,image/webp,application/zip"
              onChange={(event) => void handleFile(event.target.files?.[0])}
            />
            <div className="s-pets-install-actions">
              <button
                type="button"
                className="s-pets-install-button s-pets-install-button--primary"
                disabled={busy}
                onClick={() => void handleSync()}
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M20 12a8 8 0 10-2.34 5.66" />
                  <path d="M20 5v7h-7" />
                </svg>
                {busy ? '处理中…' : '从 ChatGPT 同步'}
              </button>
              <button
                type="button"
                className="s-pets-install-button"
                disabled={busy}
                onClick={() => inputRef.current?.click()}
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M12 3v12m0 0l-4-4m4 4l4-4" />
                  <path d="M5 19h14" />
                </svg>
                导入文件
              </button>
            </div>
            <p className={`s-pets-message${isError ? ' is-error' : ''}`}>
              {message || '同步 ~/.codex/pets 中的自定义角色；也支持 PNG、WebP、ZIP'}
            </p>
          </div>
        </section>
      </div>
    </>
  );

  if (embedded) {
    return <section className="s-pets-inline">{content}</section>;
  }

  return (
    <dialog
      ref={dialogRef}
      className="s-dialog s-dialog-pets"
      onClose={onClose}
      onClick={(event) => {
        if (event.target === dialogRef.current) requestClose();
      }}
    >
      {content}
    </dialog>
  );
}
