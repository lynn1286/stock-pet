export function EmptyState() {
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
      <p className="s-empty-hint">在下方搜索栏输入股票代码或名称，添加第一只股票</p>
    </div>
  );
}
