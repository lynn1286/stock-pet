import { useState, useRef, useCallback } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { userMessage } from '../utils/errmsg';

import type { AssetType } from '../lib/assetType';

interface RecognizedHoldingRow {
  name: string;
  code: string;
  market_value: number;
  profit: number;
  quantity: number;
  cost_price: number;
  truncated: boolean;
  candidates: SearchResult[];
}

interface SearchResult {
  secid: string;
  name: string;
  code: string;
  market: string;
  asset_type: AssetType;
}

export interface PreviewRow {
  id: string;
  rawName: string;
  truncated: boolean;
  marketValue: number;
  profit: number;
  // 截图直接给出的份额/成本价（东方财富交易页有），>0 时导入直接采用，不再反推
  quantity: number;
  costPrice: number;
  matchedSecid: string;
  matchedName: string;
  assetType: AssetType;
  candidates: SearchResult[];
}

export type ImportStatus = 'idle' | 'recognizing' | 'preview' | 'importing';

export interface ImportSummary {
  added: number;
  skipped: number;
  failed: number;
}

type FetchPrice = (secid: string, assetType: AssetType) => Promise<number>;

export function useImageImport() {
  const [status, setStatus] = useState<ImportStatus>('idle');
  const [rows, setRows] = useState<PreviewRow[]>([]);
  const [error, setError] = useState('');
  const existingRef = useRef<Set<string>>(new Set());

  const reset = useCallback(() => {
    setStatus('idle');
    setRows([]);
    setError('');
    existingRef.current = new Set();
  }, []);

  const recognize = useCallback(async (dataUrls: string[], existingSecids: Set<string>) => {
    existingRef.current = existingSecids;
    setError('');
    setStatus('recognizing');
    try {
      const holdings = await invoke<RecognizedHoldingRow[]>('recognize_holdings', {
        images: dataUrls,
      });
      const built: PreviewRow[] = holdings.map((h) => {
        const best = h.candidates[0];
        return {
          id: crypto.randomUUID(),
          rawName: h.name,
          truncated: h.truncated,
          marketValue: h.market_value,
          profit: h.profit,
          quantity: h.quantity,
          costPrice: h.cost_price,
          matchedSecid: best?.secid ?? '',
          matchedName: best?.name ?? h.name,
          assetType: best?.asset_type ?? 'stock',
          candidates: h.candidates,
        };
      });
      setRows(built);
      setStatus('preview');
    } catch (e) {
      setError(userMessage(e));
      setStatus('idle');
    }
  }, []);

  // 手动改选某行匹配到的标的
  const setMatch = useCallback((id: string, secid: string) => {
    setRows((prev) =>
      prev.map((row) => {
        if (row.id !== id) return row;
        const hit = row.candidates.find((c) => c.secid === secid);
        if (!hit) return row;
        return {
          ...row,
          matchedSecid: hit.secid,
          matchedName: hit.name,
          assetType: hit.asset_type,
        };
      }),
    );
  }, []);

  // 重新按关键词搜索某行的候选标的
  const researchRow = useCallback(async (id: string, query: string) => {
    const q = query.trim();
    if (!q) return;
    let candidates: SearchResult[] = [];
    try {
      candidates = await invoke<SearchResult[]>('lookup_stock_ai', { query: q });
    } catch {
      candidates = [];
    }
    setRows((prev) =>
      prev.map((row) => {
        if (row.id !== id) return row;
        const best = candidates[0];
        return {
          ...row,
          candidates,
          matchedSecid: best?.secid ?? '',
          matchedName: best?.name ?? '',
          assetType: best?.asset_type ?? row.assetType,
        };
      }),
    );
  }, []);

  const updateValue = useCallback((id: string, field: 'marketValue' | 'profit', value: number) => {
    setRows((prev) => prev.map((row) => (row.id === id ? { ...row, [field]: value } : row)));
  }, []);

  const removeRow = useCallback((id: string) => {
    setRows((prev) => prev.filter((row) => row.id !== id));
  }, []);

  const importAll = useCallback(
    async (fetchPrice: FetchPrice): Promise<ImportSummary> => {
      setStatus('importing');
      let added = 0;
      let skipped = 0;
      let failed = 0;

      for (const row of rows) {
        if (!row.matchedSecid || row.marketValue <= 0) {
          skipped++;
          continue;
        }
        try {
          let qty: number;
          let cost: number;
          if (row.quantity > 0 && row.costPrice > 0) {
            // 截图直接给出份额与成本价（东方财富交易页），精确采用
            qty = row.quantity;
            cost = row.costPrice;
          } else {
            // 仅有市值与收益（支付宝基金页），按现价反推份额与成本
            const price = await fetchPrice(row.matchedSecid, row.assetType);
            if (!price || price <= 0) {
              failed++;
              continue;
            }
            const totalCost = row.marketValue - row.profit;
            qty = row.marketValue / price;
            cost = totalCost / qty;
          }
          if (existingRef.current.has(row.matchedSecid)) {
            await invoke('update_stock', {
              secid: row.matchedSecid,
              quantity: qty,
              costPrice: cost,
            });
          } else {
            await invoke('add_stock', {
              secid: row.matchedSecid,
              name: row.matchedName,
              quantity: qty,
              costPrice: cost,
              assetType: row.assetType,
            });
          }
          added++;
        } catch {
          failed++;
        }
      }

      setStatus('preview');
      return { added, skipped, failed };
    },
    [rows],
  );

  return {
    status,
    rows,
    error,
    setError,
    reset,
    recognize,
    setMatch,
    researchRow,
    updateValue,
    removeRow,
    importAll,
  };
}
