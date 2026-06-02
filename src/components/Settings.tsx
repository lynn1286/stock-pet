import { useState, useMemo } from 'react';
import { useStockConfig } from '../hooks/useStockConfig';
import { useStockSearch } from '../hooks/useStockSearch';
import { useInlineEdit } from '../hooks/useInlineEdit';
import { StockRow } from './settings/StockRow';
import { EmptyState } from './settings/EmptyState';
import { Toast } from './settings/Toast';

export default function Settings() {
  const {
    config,
    error,
    success,
    liveStocks,
    deletedStockRef,
    setError,
    addStock,
    removeStock,
    undoDelete,
    updateStock,
    setPrimary,
    setDisplayMode,
  } = useStockConfig();

  const {
    searchQuery,
    searchResults,
    showDropdown,
    newAssetType,
    dropdownRef,
    handleSearchInput,
    selectSearchResult,
    closeDropdown,
    resetSearch,
  } = useStockSearch();

  const {
    editing,
    editValue,
    setEditValue,
    startEdit,
    cancelEdit,
    handleEditKey,
  } = useInlineEdit();

  // 新增表单状态
  const [newSecid, setNewSecid] = useState('');
  const [newName, setNewName] = useState('');
  const [newQty, setNewQty] = useState('');
  const [newCost, setNewCost] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // 删除确认
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);

  const primaryStock = useMemo(() => config?.stocks.find(s => s.is_primary), [config]);

  // 搜索选中
  function handleSelectSearchResult(result: Parameters<typeof selectSearchResult>[0]) {
    const { secid, name } = selectSearchResult(result);
    setNewSecid(secid);
    setNewName(name);
  }

  // 提交编辑
  async function handleCommitEdit() {
    if (!editing || !config) return;
    const stock = config.stocks.find(s => s.secid === editing.secid);
    if (!stock) return;
    const val = parseFloat(editValue) || 0;
    const qty = editing.field === 'quantity' ? val : stock.quantity;
    const cost = editing.field === 'cost_price' ? val : stock.cost_price;
    try {
      await updateStock(editing.secid, qty, cost);
      cancelEdit();
    } catch (e) {
      setError(e instanceof Error ? e.message : '操作失败');
    }
  }

  // 包装 handleEditKey，Enter 时提交
  function handleEditKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter') {
      handleCommitEdit();
    } else {
      handleEditKey(e);
    }
  }

  // 删除处理
  function handleDelete(secid: string) {
    if (confirmDelete === secid) {
      const stock = config?.stocks.find(s => s.secid === secid);
      if (stock) {
        removeStock(stock);
      }
      setConfirmDelete(null);
    } else {
      setConfirmDelete(secid);
    }
  }

  // 添加股票
  async function handleAdd() {
    if (submitting) return;
    if (!newSecid || !newName) {
      setError('请搜索并选择');
      return;
    }
    setSubmitting(true);
    try {
      closeDropdown();
      const qty = parseFloat(newQty) || 0;
      const cost = parseFloat(newCost) || 0;
      await addStock(newSecid, newName, qty, cost, newAssetType);
      setNewSecid('');
      setNewName('');
      setNewQty('');
      setNewCost('');
      resetSearch();
    } catch (e) {
      setError(e instanceof Error ? e.message : '操作失败');
    } finally {
      setSubmitting(false);
    }
  }

  if (!config) {
    return (
      <div className="s-loading" role="status" aria-label="加载中">
        <div className="s-loading-bar" />
      </div>
    );
  }

  return (
    <div className="s-app">
      {/* 顶部栏 */}
      <header className="s-topbar">
        <div className="s-topbar-left">
          <svg className="s-topbar-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden>
            <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
          </svg>
          <span className="s-topbar-title">持仓管理</span>
        </div>
        <div className="s-topbar-right">
          <span className="s-topbar-count">{config.stocks.length} 只</span>
          {primaryStock && (
            <span className="s-topbar-primary">{primaryStock.name}</span>
          )}
        </div>
      </header>

      {/* 模式切换 */}
      <div className="s-mode-bar">
        <span className="s-mode-label">桌宠显示</span>
        <div className="s-seg" role="radiogroup">
          <button
            className={`s-seg-btn ${config.display_mode === 'primary' ? 'on' : ''}`}
            role="radio"
            aria-checked={config.display_mode === 'primary'}
            onClick={() => setDisplayMode('primary')}
          >
            主股票盈亏
          </button>
          <button
            className={`s-seg-btn ${config.display_mode === 'summary' ? 'on' : ''}`}
            role="radio"
            aria-checked={config.display_mode === 'summary'}
            onClick={() => setDisplayMode('summary')}
          >
            总持仓盈亏
          </button>
        </div>
      </div>

      {/* 持仓表格 */}
      <div className="s-table">
        <div className="s-thead">
          <span className="s-th s-th-name">名称</span>
          <span className="s-th s-th-num">份额</span>
          <span className="s-th s-th-num">成本价</span>
          <span className="s-th s-th-num">现价</span>
          <span className="s-th s-th-num">盈亏</span>
          <span className="s-th s-th-act">操作</span>
        </div>

        {config.stocks.length === 0 ? (
          <EmptyState />
        ) : (
          config.stocks.map((stock) => (
            <StockRow
              key={stock.secid}
              stock={stock}
              live={liveStocks.get(stock.secid)}
              isEditingQty={editing?.secid === stock.secid && editing.field === 'quantity'}
              isEditingCost={editing?.secid === stock.secid && editing.field === 'cost_price'}
              editValue={editValue}
              isConfirmDelete={confirmDelete === stock.secid}
              onStartEdit={startEdit}
              onCommitEdit={handleCommitEdit}
              onCancelEdit={cancelEdit}
              onEditKey={handleEditKeyDown}
              onEditValueChange={setEditValue}
              onDelete={handleDelete}
              onCancelDelete={() => setConfirmDelete(null)}
              onSetPrimary={setPrimary}
            />
          ))
        )}
      </div>

      {/* 添加行 */}
      <div className="s-add-row" ref={dropdownRef}>
        <div className="s-search-wrap">
          <input
            type="text"
            className="s-input s-input-code"
            placeholder="搜索代码或名称"
            value={searchQuery}
            onChange={(e) => {
              handleSearchInput(e.target.value);
              setNewSecid(e.target.value);
            }}
            onFocus={() => { if (searchResults.length > 0) {/* showDropdown handled by hook */} }}
          />
          {showDropdown && searchResults.length > 0 && (
            <div className="s-dropdown">
              {searchResults.map((r) => (
                <div
                  key={r.secid}
                  className="s-dropdown-item"
                  onMouseDown={(e) => { e.preventDefault(); handleSelectSearchResult(r); }}
                >
                  <span className="s-dropdown-name">{r.name}</span>
                  <span className="s-dropdown-code">{r.code}</span>
                  <span className={`s-dropdown-tag s-tag-${r.asset_type}`}>
                    {r.asset_type === 'fund' ? '基金' : r.asset_type === 'etf' ? 'ETF' : '股票'}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
        <input type="text" className="s-input s-input-name" placeholder="名称（自动填充）" value={newName} readOnly />
        <input type="number" className="s-input s-input-num" placeholder="持有份额" value={newQty} onChange={(e) => setNewQty(e.target.value)} min="0" step="0.01" />
        <input type="number" className="s-input s-input-num" placeholder="成本价（元/份）" value={newCost} onChange={(e) => setNewCost(e.target.value)} min="0" step="0.001" />
        <button className="s-btn-add" onClick={handleAdd} disabled={submitting}>
          {submitting ? '添加中...' : '添加'}
        </button>
      </div>

      <Toast
        error={error}
        success={success}
        deletedName={deletedStockRef.current?.name ?? null}
        onClearError={() => setError('')}
        onUndo={undoDelete}
      />
    </div>
  );
}
