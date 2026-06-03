import { useState, useMemo } from 'react';
import { useStockConfig } from '../hooks/useStockConfig';
import { useStockSearch } from '../hooks/useStockSearch';
import { useInlineEdit } from '../hooks/useInlineEdit';
import { StockRow } from './settings/StockRow';
import { EmptyState } from './settings/EmptyState';
import { Toast } from './settings/Toast';
import { AddStockDialog } from './settings/AddStockDialog';
import { SettingsDialog } from './settings/SettingsDialog';

export default function Settings() {
  const {
    config,
    error,
    success,
    liveStocks,
    deletedStockRef,
    setError,
    fetchPrice,
    addStock,
    removeStock,
    undoDelete,
    updateStock,
    setPrimary,
    setDisplayMode,
    setTrayDisplay,
  } = useStockConfig();

  const {
    searchQuery,
    searchResults,
    showDropdown,
    newAssetType,
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
  const [newAmount, setNewAmount] = useState('');
  const [newReturn, setNewReturn] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // 删除确认
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);

  // 添加弹层
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [dialogError, setDialogError] = useState('');

  // 设置弹层
  const [showSettingsDialog, setShowSettingsDialog] = useState(false);

  // 新增行高亮
  const [newlyAdded, setNewlyAdded] = useState<string | null>(null);

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
      setDialogError('请从搜索结果中选择一只股票');
      return;
    }
    const amount = parseFloat(newAmount) || 0;
    if (amount <= 0) {
      setDialogError('请输入持有金额');
      return;
    }
    const ret = parseFloat(newReturn) || 0;
    if (ret >= amount) {
      setDialogError('持有收益不能大于等于持有金额');
      return;
    }
    setSubmitting(true);
    setDialogError('');
    try {
      closeDropdown();
      let currentPrice = liveStocks.get(newSecid)?.price || 0;
      if (currentPrice <= 0) {
        try {
          currentPrice = await fetchPrice(newSecid, newAssetType);
        } catch {
          setDialogError('获取价格失败，请稍后重试');
          setSubmitting(false);
          return;
        }
      }
      const totalCost = amount - ret;
      const qty = amount / currentPrice;
      const cost = totalCost / qty;
      const addedSecid = newSecid;
      await addStock(newSecid, newName, qty, cost, newAssetType);
      setNewlyAdded(addedSecid);
      setTimeout(() => setNewlyAdded(null), 1000);
      setNewSecid('');
      setNewName('');
      setNewAmount('');
      setNewReturn('');
      resetSearch();
      setShowAddDialog(false);
    } catch (e) {
      setDialogError(e instanceof Error ? e.message : '操作失败');
    } finally {
      setSubmitting(false);
    }
  }

  // 关闭弹层
  function handleCloseDialog() {
    setShowAddDialog(false);
    resetSearch();
    setNewSecid('');
    setNewName('');
    setNewAmount('');
    setNewReturn('');
    setDialogError('');
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
          <button
            className="s-topbar-icon-btn"
            onClick={() => setShowSettingsDialog(true)}
            aria-label="设置"
            title="设置"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden>
              <circle cx="12" cy="12" r="3" />
              <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
            </svg>
          </button>
          <button
            className="s-topbar-add"
            onClick={() => setShowAddDialog(true)}
            aria-label="添加持仓"
            title="添加持仓"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden>
              <line x1="12" y1="5" x2="12" y2="19" />
              <line x1="5" y1="12" x2="19" y2="12" />
            </svg>
          </button>
        </div>
      </header>

      {/* 持仓表格 */}
      <table className="s-table">
        <thead>
          <tr>
            <th className="s-th-name">名称</th>
            <th className="s-th-num">份额</th>
            <th className="s-th-num">成本价</th>
            <th className="s-th-num">现价</th>
            <th className="s-th-num">当日收益</th>
            <th className="s-th-num">盈亏</th>
            <th className="s-th-act">操作</th>
          </tr>
        </thead>
        {config.stocks.length === 0 ? (
          <tbody>
            <tr>
              <td colSpan={7}>
                <EmptyState onAdd={() => setShowAddDialog(true)} />
              </td>
            </tr>
          </tbody>
        ) : (
          <tbody>
            {config.stocks.map((stock) => (
              <StockRow
                key={stock.secid}
                stock={stock}
                live={liveStocks.get(stock.secid)}
                isEditingQty={editing?.secid === stock.secid && editing.field === 'quantity'}
                isEditingCost={editing?.secid === stock.secid && editing.field === 'cost_price'}
                editValue={editValue}
                isConfirmDelete={confirmDelete === stock.secid}
                isHighlighted={newlyAdded === stock.secid}
                onStartEdit={startEdit}
                onCommitEdit={handleCommitEdit}
                onEditKey={handleEditKeyDown}
                onEditValueChange={setEditValue}
                onDelete={handleDelete}
                onCancelDelete={() => setConfirmDelete(null)}
                onSetPrimary={setPrimary}
              />
            ))}
          </tbody>
        )}
      </table>

      <SettingsDialog
        open={showSettingsDialog}
        displayMode={config.display_mode}
        trayDisplay={config.tray_display}
        stocks={config.stocks}
        onDisplayModeChange={setDisplayMode}
        onTrayDisplayChange={setTrayDisplay}
        onSetPrimary={setPrimary}
        onClose={() => setShowSettingsDialog(false)}
      />

      <AddStockDialog
        open={showAddDialog}
        searchQuery={searchQuery}
        searchResults={searchResults}
        showDropdown={showDropdown}
        newName={newName}
        newAmount={newAmount}
        newReturn={newReturn}
        submitting={submitting}
        error={dialogError}
        canSubmit={!!newSecid && !!newName && !!newAmount}
        onSearchInput={(val) => { handleSearchInput(val); setNewSecid(''); setNewName(''); setNewAmount(''); setNewReturn(''); setDialogError(''); }}
        onSelectResult={handleSelectSearchResult}
        onAmountChange={setNewAmount}
        onReturnChange={setNewReturn}
        onSubmit={handleAdd}
        onClose={handleCloseDialog}
      />

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
