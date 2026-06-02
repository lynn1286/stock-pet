import { useState, useRef, useEffect, useCallback } from 'react';
import { invoke } from '@tauri-apps/api/core';

type AssetType = 'stock' | 'etf' | 'fund';

interface SearchResult {
  secid: string;
  name: string;
  code: string;
  market: string;
  asset_type: AssetType;
}

export function useStockSearch() {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const [newAssetType, setNewAssetType] = useState<AssetType>('stock');
  const searchTimer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const dropdownRef = useRef<HTMLDivElement>(null);

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

  const handleSearchInput = useCallback((value: string) => {
    setSearchQuery(value);

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
  }, []);

  const selectSearchResult = useCallback((result: SearchResult) => {
    if (searchTimer.current) clearTimeout(searchTimer.current);
    setSearchQuery(result.code);
    setNewAssetType(result.asset_type);
    setSearchResults([]);
    setShowDropdown(false);
    return { secid: result.secid, name: result.name, assetType: result.asset_type };
  }, []);

  const closeDropdown = useCallback(() => {
    setShowDropdown(false);
  }, []);

  const resetSearch = useCallback(() => {
    setSearchQuery('');
    setSearchResults([]);
    setShowDropdown(false);
    setNewAssetType('stock');
  }, []);

  return {
    searchQuery,
    searchResults,
    showDropdown,
    newAssetType,
    dropdownRef,
    handleSearchInput,
    selectSearchResult,
    closeDropdown,
    resetSearch,
  };
}
