import { useState, useEffect, useRef, useCallback } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { listen } from '@tauri-apps/api/event';
import { userMessage } from '../utils/errmsg';

type AssetType = 'stock' | 'etf' | 'fund';
type DisplayMode = 'primary' | 'summary';
type TrayDisplay = 'amount' | 'pct';

interface StockConfig {
  secid: string;
  name: string;
  is_primary: boolean;
  quantity: number;
  cost_price: number;
  asset_type: AssetType;
}

interface StockState {
  secid: string;
  price: number;
  change_pct: number;
  profit: number;
  profit_pct: number;
  daily_profit: number;
}

interface AppConfig {
  stocks: StockConfig[];
  display_mode: DisplayMode;
  tray_display: TrayDisplay;
}

const UNDO_WINDOW = 5000;

async function fetchConfig(retries = 2): Promise<AppConfig> {
  try {
    return await invoke<AppConfig>('get_config');
  } catch (e) {
    if (retries > 0) {
      await new Promise((resolve) => setTimeout(resolve, 1000));
      return fetchConfig(retries - 1);
    }
    throw e;
  }
}

export function useStockConfig() {
  const [config, setConfig] = useState<AppConfig | null>(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [liveStocks, setLiveStocks] = useState<Map<string, StockState>>(new Map());
  const [pendingDelete, setPendingDelete] = useState<StockConfig | null>(null);

  const undoTimerRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  const loadConfig = useCallback(async (): Promise<void> => {
    try {
      setConfig(await fetchConfig());
    } catch (e) {
      setError(userMessage(e));
    }
  }, []);

  // 刷新实时价格
  const refreshLivePrices = useCallback(async () => {
    try {
      const states = await invoke<StockState[]>('refresh_prices');
      const map = new Map<string, StockState>();
      for (const s of states) map.set(s.secid, s);
      setLiveStocks(map);
    } catch {
      // 静默失败，价格会在下次轮询时更新
    }
  }, []);

  // 初始化：加载配置 + 订阅实时更新
  useEffect(() => {
    let cancelled = false;

    void (async () => {
      await loadConfig();
      if (!cancelled) {
        await refreshLivePrices();
      }
    })();

    const unlisten = listen<StockState[]>('stocks-update', (e) => {
      const map = new Map<string, StockState>();
      for (const s of e.payload) map.set(s.secid, s);
      setLiveStocks(map);
    });
    return () => {
      cancelled = true;
      unlisten.then((fn) => fn());
    };
  }, [loadConfig, refreshLivePrices]);

  // 成功提示自动消失
  useEffect(() => {
    if (success) {
      const t = setTimeout(() => setSuccess(''), 2000);
      return () => clearTimeout(t);
    }
  }, [success]);

  // 错误提示自动消失
  useEffect(() => {
    if (error) {
      const t = setTimeout(() => setError(''), 8000);
      return () => clearTimeout(t);
    }
  }, [error]);

  // 获取单只股票价格
  const fetchPrice = useCallback(async (secid: string, assetType: AssetType): Promise<number> => {
    return invoke<number>('fetch_single_price', { secid, assetType });
  }, []);

  // 添加股票
  const addStock = useCallback(
    async (
      secid: string,
      name: string,
      quantity: number,
      costPrice: number,
      assetType: AssetType,
    ) => {
      try {
        await invoke('add_stock', { secid, name, quantity, costPrice, assetType });
        setSuccess('已添加');
        await loadConfig();
        await refreshLivePrices();
      } catch (e) {
        throw new Error(userMessage(e), { cause: e });
      }
    },
    [loadConfig, refreshLivePrices],
  );

  // 删除股票（含撤销）
  const removeStock = useCallback(
    async (stock: StockConfig) => {
      try {
        setPendingDelete({ ...stock });
        await invoke('remove_stock', { secid: stock.secid });
        setSuccess(stock.name);

        // 清除上一个撤销定时器
        if (undoTimerRef.current) clearTimeout(undoTimerRef.current);
        undoTimerRef.current = setTimeout(() => {
          setPendingDelete(null);
        }, UNDO_WINDOW);

        await loadConfig();
      } catch (e) {
        setPendingDelete(null);
        setError(userMessage(e));
      }
    },
    [loadConfig],
  );

  // 撤销删除
  const undoDelete = useCallback(async () => {
    const stock = pendingDelete;
    if (!stock) return;

    if (undoTimerRef.current) clearTimeout(undoTimerRef.current);
    setPendingDelete(null);

    try {
      await invoke('add_stock', {
        secid: stock.secid,
        name: stock.name,
        quantity: stock.quantity,
        costPrice: stock.cost_price,
        assetType: stock.asset_type,
      });
      setSuccess(`已恢复 ${stock.name}`);
      await loadConfig();
      await refreshLivePrices();
    } catch (e) {
      setError(userMessage(e));
    }
  }, [loadConfig, refreshLivePrices, pendingDelete]);

  // 更新股票（份额/成本价）
  const updateStock = useCallback(
    async (secid: string, quantity: number, costPrice: number) => {
      try {
        await invoke('update_stock', { secid, quantity, costPrice });
        await loadConfig();
      } catch (e) {
        throw new Error(userMessage(e), { cause: e });
      }
    },
    [loadConfig],
  );

  // 设置主股票
  const setPrimary = useCallback(
    async (secid: string) => {
      try {
        await invoke('set_primary', { secid });
        await loadConfig();
      } catch (e) {
        setError(userMessage(e));
      }
    },
    [loadConfig],
  );

  // 切换显示模式
  const setDisplayMode = useCallback(
    async (mode: DisplayMode) => {
      try {
        await invoke('set_display_mode', { mode });
        await loadConfig();
      } catch (e) {
        setError(userMessage(e));
      }
    },
    [loadConfig],
  );

  // 切换托盘显示
  const setTrayDisplay = useCallback(
    async (mode: TrayDisplay) => {
      try {
        await invoke('set_tray_display', { mode });
        await loadConfig();
      } catch (e) {
        setError(userMessage(e));
      }
    },
    [loadConfig],
  );

  return {
    config,
    error,
    success,
    liveStocks,
    deletedName: pendingDelete?.name ?? null,
    setError,
    loadConfig,
    fetchPrice,
    addStock,
    removeStock,
    undoDelete,
    updateStock,
    setPrimary,
    setDisplayMode,
    setTrayDisplay,
  };
}
