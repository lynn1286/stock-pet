export type AssetType = 'stock' | 'listed_fund' | 'otc_fund';

/** 兼容旧配置与旧接口字段 */
export function normalizeAssetType(raw: string): AssetType {
  switch (raw) {
    case 'listed_fund':
    case 'etf':
      return 'listed_fund';
    case 'otc_fund':
    case 'fund':
      return 'otc_fund';
    default:
      return 'stock';
  }
}

/** 完整名称：悬停提示、导入预览等 */
export function assetTypeLabel(raw: AssetType | string): string {
  switch (normalizeAssetType(raw)) {
    case 'otc_fund':
      return '场外基金';
    case 'listed_fund':
      return '场内基金';
    default:
      return '股票';
  }
}

/** 标签窄位展示 */
export function assetTypeTagLabel(raw: AssetType | string): string {
  switch (normalizeAssetType(raw)) {
    case 'otc_fund':
      return '场外';
    case 'listed_fund':
      return '场内';
    default:
      return '股票';
  }
}

export function assetTypeTagClass(raw: AssetType | string): string {
  return `s-tag-${normalizeAssetType(raw).replace(/_/g, '-')}`;
}
