interface EmptyStateProps {
  onAdd?: () => void;
}

export function EmptyState({ onAdd }: EmptyStateProps) {
  return (
    <div className="s-empty">
      <svg
        className="s-empty-icon"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden
      >
        <path d="M12 5v14M5 12h14" />
      </svg>
      <p className="s-empty-title">暂无持仓</p>
      <p className="s-empty-hint">添加你的第一只股票或基金，开始追踪盈亏</p>
      {onAdd && (
        <button className="s-empty-add" onClick={onAdd}>
          添加持仓
        </button>
      )}
    </div>
  );
}
