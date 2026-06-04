interface ToastProps {
  error: string;
  success: string;
  deletedName: string | null;
  onClearError: () => void;
  onUndo: () => void;
}

export function Toast({ error, success, deletedName, onClearError, onUndo }: ToastProps) {
  return (
    <div className="s-toast-wrap" aria-live="polite" role="status">
      {error && (
        <div className="s-toast s-toast-err" onClick={onClearError}>
          {error}
        </div>
      )}
      {success && (
        <div className="s-toast s-toast-ok">
          {success}
          {deletedName && (
            <button className="s-toast-undo" onClick={onUndo}>
              撤销
            </button>
          )}
        </div>
      )}
    </div>
  );
}
