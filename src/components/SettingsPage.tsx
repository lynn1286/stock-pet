import { useState, useMemo, useRef } from 'react';
import { useStockConfig } from '../hooks/useStockConfig';
import { useStockSearch } from '../hooks/useStockSearch';
import { useFlashEffect } from '../hooks/useFlashEffect';
import { StockRow } from './settings/StockRow';
import { EmptyState } from './settings/EmptyState';
import { Toast } from './settings/Toast';
import { AddStockDialog } from './settings/AddStockDialog';
import { EditStockDialog } from './settings/EditStockDialog';
import { SettingsDialog } from './settings/SettingsDialog';
import { ImageImportDialog } from './settings/ImageImportDialog';
import { PortfolioSummary } from './settings/PortfolioSummary';

export function SettingsPage() {
  const {
    config,
    error,
    success,
    liveStocks,
    deletedName,
    setError,
    setSuccess,
    loadConfig,
    refreshLivePrices,
    fetchPrice,
    addStock,
    removeStock,
    undoDelete,
    updateStock,
    setPrimary,
    setDisplayMode,
    setTrayDisplay,
    setVisionConfig,
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

  const flashMap = useFlashEffect(liveStocks);

  const [newSecid, setNewSecid] = useState('');
  const [newName, setNewName] = useState('');
  const [newAmount, setNewAmount] = useState('');
  const [newReturn, setNewReturn] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [dialogError, setDialogError] = useState('');
  const [showSettingsDialog, setShowSettingsDialog] = useState(false);
  const [showImportDialog, setShowImportDialog] = useState(false);
  const [newlyAdded, setNewlyAdded] = useState<string | null>(null);
  const [editingSecid, setEditingSecid] = useState<string | null>(null);
  const [editQuantity, setEditQuantity] = useState('');
  const [editCostPrice, setEditCostPrice] = useState('');
  const [editSubmitting, setEditSubmitting] = useState(false);
  const [editDialogError, setEditDialogError] = useState('');
  const tableScrollRef = useRef<HTMLDivElement>(null);

  function syncNameColShadow() {
    const el = tableScrollRef.current;
    if (!el) return;
    el.classList.toggle('s-table-scroll--h', el.scrollLeft > 0);
  }

  const primaryStock = useMemo(() => config?.stocks.find((s) => s.is_primary), [config]);
  const existingSecids = useMemo(() => new Set(config?.stocks.map((s) => s.secid) ?? []), [config]);

  async function handleImported(summary: { added: number; skipped: number; failed: number }) {
    await loadConfig();
    await refreshLivePrices();
    const parts = [`导入 ${summary.added} 条`];
    if (summary.skipped > 0) parts.push(`跳过 ${summary.skipped} 条`);
    if (summary.failed > 0) parts.push(`失败 ${summary.failed} 条`);
    if (summary.failed > 0) {
      setError(parts.join('，'));
    } else {
      setSuccess(parts.join('，'));
    }
  }

  function handleSelectSearchResult(result: Parameters<typeof selectSearchResult>[0]) {
    const { secid, name } = selectSearchResult(result);
    setNewSecid(secid);
    setNewName(name);
  }

  const editingStock = useMemo(
    () => config?.stocks.find((s) => s.secid === editingSecid) ?? null,
    [config, editingSecid],
  );

  function openEditDialog(secid: string) {
    const stock = config?.stocks.find((s) => s.secid === secid);
    if (!stock) return;
    setEditingSecid(secid);
    setEditQuantity(stock.quantity > 0 ? stock.quantity.toFixed(4) : '');
    setEditCostPrice(stock.cost_price > 0 ? stock.cost_price.toFixed(4) : '');
    setEditDialogError('');
  }

  function closeEditDialog() {
    setEditingSecid(null);
    setEditQuantity('');
    setEditCostPrice('');
    setEditDialogError('');
  }

  async function handleSaveEdit() {
    if (!editingSecid || editSubmitting) return;
    const qty = parseFloat(editQuantity);
    const cost = parseFloat(editCostPrice);
    if (!editQuantity || Number.isNaN(qty) || qty <= 0) {
      setEditDialogError('请输入有效份额');
      return;
    }
    if (!editCostPrice || Number.isNaN(cost) || cost <= 0) {
      setEditDialogError('请输入有效成本价');
      return;
    }
    setEditSubmitting(true);
    setEditDialogError('');
    try {
      await updateStock(editingSecid, qty, cost);
      closeEditDialog();
      setSuccess('已保存');
    } catch (e) {
      setEditDialogError(e instanceof Error ? e.message : '保存失败');
    } finally {
      setEditSubmitting(false);
    }
  }

  function handleDelete(secid: string) {
    const stock = config?.stocks.find((s) => s.secid === secid);
    if (stock) {
      removeStock(stock);
    }
  }

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
      <header className="s-topbar">
        <div className="s-topbar-left">
          <svg
            className="s-topbar-icon"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            aria-hidden
          >
            <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
          </svg>
          <span className="s-topbar-title">持仓管理</span>
        </div>
        <div className="s-topbar-right">
          <span className="s-topbar-count">{config.stocks.length} 只</span>
          {primaryStock && (
            <span className="s-topbar-primary" title={primaryStock.name}>
              {primaryStock.name}
            </span>
          )}
          <button
            className="s-topbar-icon-btn"
            onClick={() => setShowImportDialog(true)}
            aria-label="图片导入持仓"
            title="图片导入持仓"
          >
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden
            >
              <rect x="3" y="3" width="18" height="18" rx="2" />
              <circle cx="8.5" cy="8.5" r="1.5" />
              <path d="M21 15l-5-5L5 21" />
            </svg>
          </button>
          <button
            className="s-topbar-icon-btn"
            onClick={() => setShowSettingsDialog(true)}
            aria-label="设置"
            title="设置"
          >
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              aria-hidden
            >
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
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              aria-hidden
            >
              <line x1="12" y1="5" x2="12" y2="19" />
              <line x1="5" y1="12" x2="19" y2="12" />
            </svg>
          </button>
        </div>
      </header>

      <div className="s-content-split">
        <PortfolioSummary stocks={config.stocks} liveStocks={liveStocks} />

        <div ref={tableScrollRef} className="s-table-scroll" onScroll={syncNameColShadow}>
          <table className="s-table">
          <thead>
            <tr>
              <th className="s-th-name">名称</th>
              <th className="s-th-num">份额</th>
              <th className="s-th-num s-th-stacked">现价/成本</th>
              <th className="s-th-num">当日收益</th>
              <th className="s-th-num">盈亏</th>
              <th className="s-th-action" aria-label="操作"></th>
            </tr>
          </thead>
          {config.stocks.length === 0 ? (
            <tbody>
              <tr>
                <td colSpan={6}>
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
                  isHighlighted={newlyAdded === stock.secid}
                  displayMode={config.display_mode}
                  flash={flashMap.get(stock.secid)}
                  onEdit={openEditDialog}
                  onDelete={handleDelete}
                />
              ))}
            </tbody>
          )}
        </table>
        </div>
      </div>

      <SettingsDialog
        open={showSettingsDialog}
        displayMode={config.display_mode}
        trayDisplay={config.tray_display}
        stocks={config.stocks}
        visionConfig={config.vision}
        onDisplayModeChange={setDisplayMode}
        onTrayDisplayChange={setTrayDisplay}
        onSetPrimary={setPrimary}
        onSaveVisionConfig={setVisionConfig}
        onClose={() => setShowSettingsDialog(false)}
      />

      <ImageImportDialog
        open={showImportDialog}
        visionConfigured={
          !!config.vision.base_url && !!config.vision.api_key && !!config.vision.model
        }
        existingSecids={existingSecids}
        fetchPrice={fetchPrice}
        onOpenSettings={() => {
          setShowImportDialog(false);
          setShowSettingsDialog(true);
        }}
        onImported={handleImported}
        onClose={() => setShowImportDialog(false)}
      />

      {editingStock && (
        <EditStockDialog
          open={!!editingSecid}
          name={editingStock.name}
          code={editingStock.secid.split('.')[1] || editingStock.secid}
          assetType={editingStock.asset_type}
          quantity={editQuantity}
          costPrice={editCostPrice}
          submitting={editSubmitting}
          error={editDialogError}
          onQuantityChange={setEditQuantity}
          onCostPriceChange={setEditCostPrice}
          onSubmit={handleSaveEdit}
          onClose={closeEditDialog}
        />
      )}

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
        onSearchInput={(val) => {
          handleSearchInput(val);
          setNewSecid('');
          setNewName('');
          setNewAmount('');
          setNewReturn('');
          setDialogError('');
        }}
        onSelectResult={handleSelectSearchResult}
        onAmountChange={setNewAmount}
        onReturnChange={setNewReturn}
        onSubmit={handleAdd}
        onClose={handleCloseDialog}
      />

      <Toast
        error={error}
        success={success}
        deletedName={deletedName}
        onClearError={() => setError('')}
        onUndo={undoDelete}
      />
    </div>
  );
}
