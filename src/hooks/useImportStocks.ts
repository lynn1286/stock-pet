import { invoke } from '@tauri-apps/api/core';
import type { AssetType } from '../lib/assetType';

export interface ImportStockItem {
  secid: string;
  name: string;
  quantity: number;
  costPrice: number;
  assetType: AssetType;
}

export interface ImportStocksSummary {
  added: number;
  updated: number;
  skipped: number;
}

export async function importStocks(items: ImportStockItem[]): Promise<ImportStocksSummary> {
  return invoke<ImportStocksSummary>('import_stocks', {
    items: items.map((item) => ({
      secid: item.secid,
      name: item.name,
      quantity: item.quantity,
      cost_price: item.costPrice,
      asset_type: item.assetType,
    })),
  });
}
