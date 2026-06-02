import { useEffect, useState, useMemo, useRef } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { listen } from '@tauri-apps/api/event';

interface StockConfig {
  secid: string;
  name: string;
  is_primary: boolean;
  quantity: number;
  cost_price: number;
}

interface StockState {
  secid: string;
  price: number;
  change_pct: number;
  profit: number;
  profit_pct: number;
}

interface SearchResult {
  secid: string;
  name: string;
  code: string;
  market: string;
}

type DisplayMode = 'primary' | 'summary';

interface AppConfig {
  stocks: StockConfig[];
  display_mode: DisplayMode;
}

export default function Settings() {
  const [config, setConfig] = useState<AppConfig | null>(null);
  const [newSecid, setNewSecid] = useState('');
  const [newName, setNewName] = useState('');
  const [newQty, setNewQty] = useState('');
  const [newCost, setNewCost] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [editing, setEditing] = useState<{ secid: string; field: 'quantity' | 'cost_price' } | null>(null);
  const [editValue, setEditValue] = useState('');
  const [liveStocks, setLiveStocks] = useState<Map<string, StockState>>(new Map());

  // 搜索相关
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const searchTimer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    loadConfig();
    refreshLivePrices();
  }, []);

  useEffect(() => {
    const unlisten = listen<StockState[]>('stocks-update', (e) => {
      const map = new Map<string, StockState>();
      for (const s of e.payload) map.set(s.secid, s);
      setLiveStocks(map);
    });
    return () => { unlisten.then(fn => fn()); };
  }, []);

  useEffect(() => {
    if (success) {
      const t = setTimeout(() => setSuccess(''), 2000);
      return () => clearTimeout(t);
    }
  }, [success]);

  // 点击外部关闭下拉
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setShowDropdown(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const primaryStock = useMemo(() => config?.stocks.find(s => s.is_primary), [config]);

  async function loadConfig() {
    try {
      setConfig(await invoke<AppConfig>('get_config'));
    } catch {
      setError('加载配置失败');
    }
  }

  // 搜索股票（防抖）
  function handleSearchInput(value: string) {
    setSearchQuery(value);
    setNewSecid(value);
    setError('');

    if (searchTimer.current) clearTimeout(searchTimer.current);

    if (value.length < 1) {
      setSearchResults([]);
      setShowDropdown(false);
      return;
    }

    searchTimer.current = setTimeout(async () => {
      try {
        const results = await invoke<SearchResult[]>('search_stock', { query: value });
        setSearchResults(results);
        setShowDropdown(results.length > 0);
      } catch {
        setSearchResults([]);
        setShowDropdown(false);
      }
    }, 300);
  }

  function selectSearchResult(result: SearchResult) {
    setNewSecid(result.secid);
    setNewName(result.name);
    setSearchQuery(result.code);
    setSearchResults([]);
    setShowDropdown(false);
  }

  async function handleAdd() {
    if (!newSecid || !newName) { setError('请搜索并选择股票'); return; }
    const qty = parseFloat(newQty) || 0;
    const cost = parseFloat(newCost) || 0;
    try {
      setShowDropdown(false);
      await invoke('add_stock', { secid: newSecid, name: newName, quantity: qty, costPrice: cost });
      setNewSecid(''); setNewName(''); setNewQty(''); setNewCost(''); setSearchQuery('');
      setError(''); setSuccess('已添加');
      await loadConfig();
      // 立即刷新行情
      await refreshLivePrices();
    } catch (e) { setError(String(e)); }
  }

  async function refreshLivePrices() {
    try {
      const states = await invoke<StockState[]>('refresh_prices');
      const map = new Map<string, StockState>();
      for (const s of states) map.set(s.secid, s);
      setLiveStocks(map);
    } catch {}
  }

  async function handleRemove(secid: string) {
    try {
      await invoke('remove_stock', { secid });
      setSuccess('已删除');
      await loadConfig();
    } catch (e) { setError(String(e)); }
  }

  async function handleSetPrimary(secid: string) {
    try {
      await invoke('set_primary', { secid });
      await loadConfig();
    } catch (e) { setError(String(e)); }
  }

  async function handleSetDisplayMode(mode: DisplayMode) {
    try {
      await invoke('set_display_mode', { mode });
      await loadConfig();
    } catch (e) { setError(String(e)); }
  }

  function startEdit(secid: string, field: 'quantity' | 'cost_price', current: number) {
    setEditing({ secid, field });
    setEditValue(current > 0 ? String(current) : '');
  }

  async function commitEdit() {
    if (!editing) return;
    const stock = config?.stocks.find(s => s.secid === editing.secid);
    if (!stock) return;
    const val = parseFloat(editValue) || 0;
    const qty = editing.field === 'quantity' ? val : stock.quantity;
    const cost = editing.field === 'cost_price' ? val : stock.cost_price;
    try {
      await invoke('update_stock', { secid: editing.secid, quantity: qty, costPrice: cost });
      setEditing(null); setEditValue('');
      await loadConfig();
    } catch (e) { setError(String(e)); }
  }

  function handleEditKey(e: React.KeyboardEvent) {
    if (e.key === 'Enter') commitEdit();
    if (e.key === 'Escape') { setEditing(null); setEditValue(''); }
  }

  function fmtNum(n: number, decimals = 2): string {
    if (n === 0) return '-';
    return n.toLocaleString('zh-CN', { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
  }

  function fmtProfit(n: number): string {
    if (n === 0) return '-';
    const sign = n > 0 ? '+' : '';
    return `${sign}${n.toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
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
            onClick={() => handleSetDisplayMode('primary')}
          >
            主股票盈亏
          </button>
          <button
            className={`s-seg-btn ${config.display_mode === 'summary' ? 'on' : ''}`}
            role="radio"
            aria-checked={config.display_mode === 'summary'}
            onClick={() => handleSetDisplayMode('summary')}
          >
            总持仓盈亏
          </button>
        </div>
      </div>

      {/* 持仓表格 */}
      <div className="s-table">
        <div className="s-thead">
          <span className="s-th s-th-name">名称</span>
          <span className="s-th s-th-num">数量</span>
          <span className="s-th s-th-num">成本价</span>
          <span className="s-th s-th-num">现价</span>
          <span className="s-th s-th-num">盈亏</span>
          <span className="s-th s-th-act">操作</span>
        </div>

        {config.stocks.length === 0 ? (
          <div className="s-empty">暂无持仓</div>
        ) : (
          config.stocks.map((stock) => {
            const isEditingQty = editing?.secid === stock.secid && editing.field === 'quantity';
            const isEditingCost = editing?.secid === stock.secid && editing.field === 'cost_price';
            const live = liveStocks.get(stock.secid);
            const currentPrice = live?.price || 0;
            const profit = stock.quantity > 0 && stock.cost_price > 0 && currentPrice > 0
              ? (currentPrice - stock.cost_price) * stock.quantity
              : 0;

            return (
              <div key={stock.secid} className={`s-tr ${stock.is_primary ? 's-tr-primary' : ''}`}>
                <span className="s-td s-td-name" title={`${stock.name}（${stock.secid.split('.')[1] || stock.secid}）`}>{stock.name}（{stock.secid.split('.')[1] || stock.secid}）</span>

                <span className="s-td s-td-num">
                  {isEditingQty ? (
                    <input className="s-edit-input" value={editValue} onChange={(e) => setEditValue(e.target.value)} onBlur={commitEdit} onKeyDown={handleEditKey} autoFocus type="number" min="0" />
                  ) : (
                    <span className={`s-editable ${stock.quantity === 0 ? 's-editable-empty' : ''}`} onClick={() => startEdit(stock.secid, 'quantity', stock.quantity)} title="点击编辑">
                      {stock.quantity > 0 ? fmtNum(stock.quantity, 0) : '点击填写'}
                    </span>
                  )}
                </span>

                <span className="s-td s-td-num">
                  {isEditingCost ? (
                    <input className="s-edit-input" value={editValue} onChange={(e) => setEditValue(e.target.value)} onBlur={commitEdit} onKeyDown={handleEditKey} autoFocus type="number" min="0" step="0.01" />
                  ) : (
                    <span className={`s-editable ${stock.cost_price === 0 ? 's-editable-empty' : ''}`} onClick={() => startEdit(stock.secid, 'cost_price', stock.cost_price)} title="点击编辑">
                      {stock.cost_price > 0 ? fmtNum(stock.cost_price) : '点击填写'}
                    </span>
                  )}
                </span>

                {/* 现价 */}
                <span className="s-td s-td-num">
                  {currentPrice > 0 ? fmtNum(currentPrice) : '-'}
                </span>

                {/* 盈亏 */}
                <span className={`s-td s-td-num s-profit ${profit > 0 ? 's-profit-up' : profit < 0 ? 's-profit-down' : ''}`}>
                  {stock.quantity > 0 && stock.cost_price > 0 ? fmtProfit(profit) : '-'}
                </span>

                <span className="s-td s-td-act">
                  {!stock.is_primary && (
                    <button className="s-link" onClick={() => handleSetPrimary(stock.secid)}>主</button>
                  )}
                  <button className="s-btn-del" onClick={() => handleRemove(stock.secid)} aria-label={`删除 ${stock.name}`}>
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden>
                      <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                    </svg>
                  </button>
                </span>
              </div>
            );
          })
        )}
      </div>

      {/* 添加行（带搜索） */}
      <div className="s-add-row" ref={dropdownRef}>
        <div className="s-search-wrap">
          <input
            type="text"
            className="s-input s-input-code"
            placeholder="搜索代码或名称"
            value={searchQuery}
            onChange={(e) => handleSearchInput(e.target.value)}
            onFocus={() => { if (searchResults.length > 0) setShowDropdown(true); }}
          />
          {showDropdown && searchResults.length > 0 && (
            <div className="s-dropdown">
              {searchResults.map((r) => (
                <div
                  key={r.secid}
                  className="s-dropdown-item"
                  onMouseDown={(e) => { e.preventDefault(); selectSearchResult(r); }}
                >
                  <span className="s-dropdown-name">{r.name}</span>
                  <span className="s-dropdown-code">{r.code}</span>
                </div>
              ))}
            </div>
          )}
        </div>
        <input type="text" className="s-input s-input-name" placeholder="名称（自动填充）" value={newName} readOnly />
        <input type="number" className="s-input s-input-num" placeholder="数量" value={newQty} onChange={(e) => setNewQty(e.target.value)} min="0" />
        <input type="number" className="s-input s-input-num" placeholder="成本价" value={newCost} onChange={(e) => setNewCost(e.target.value)} min="0" step="0.01" />
        <button className="s-btn-add" onClick={handleAdd}>添加</button>
      </div>

      {/* Toast */}
      <div className="s-toast-wrap" aria-live="polite" role="status">
        {error && <div className="s-toast s-toast-err" onClick={() => setError('')}>{error}</div>}
        {success && <div className="s-toast s-toast-ok">{success}</div>}
      </div>
    </div>
  );
}
