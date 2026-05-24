/**
 * useHoldingsFilter Hook 測試
 */

import { renderHook, act } from '@testing-library/react';
import { useHoldingsFilter } from '@/hooks/investment/useHoldingsFilter';
import type { Holding } from '@/types/investment';

const mockHoldings: Holding[] = [
  {
    stock_id: '2330',
    stock_code: '2330',
    stock_name: '台積電',
    shares: 1000000,
    weight: 15.5,
    price: 850,
    change_percent: 1.2,
    revenue_yoy: 25.5,
    revenue_mom: 5.2,
    volatility: 2.1,
    amount: 500000000,
    margin_ratio: 45.2,
    currency: 'TWD',
    is_disposal: false,
  },
  {
    stock_id: '2317',
    stock_code: '2317',
    stock_name: '鴻海',
    shares: 500000,
    weight: 8.2,
    price: 120,
    change_percent: -0.5,
    revenue_yoy: 10.3,
    revenue_mom: -2.1,
    volatility: 1.5,
    amount: 100000000,
    margin_ratio: 30.5,
    currency: 'TWD',
    is_disposal: false,
  },
];

describe('useHoldingsFilter', () => {
  it('should initialize with default values', () => {
    const { result } = renderHook(() => useHoldingsFilter(mockHoldings));

    expect(result.current.sortField).toBe('weight');
    expect(result.current.sortOrder).toBe('desc');
    expect(result.current.activeFilters).toEqual([]);
    expect(result.current.searchTerm).toBe('');
  });

  it('should filter data by search term', () => {
    const { result } = renderHook(() => useHoldingsFilter(mockHoldings));

    act(() => {
      result.current.setSearchTerm('台積');
    });

    expect(result.current.filteredData).toHaveLength(1);
    expect(result.current.filteredData[0].stock_code).toBe('2330');
  });

  it('should sort data by field', () => {
    const { result } = renderHook(() => useHoldingsFilter(mockHoldings));

    act(() => {
      result.current.handleSort('price');
    });

    expect(result.current.sortField).toBe('price');
    // 預設降序，價格高的在前
    expect(result.current.filteredData[0].stock_code).toBe('2330');
  });

  it('should toggle sort order on same field', () => {
    const { result } = renderHook(() => useHoldingsFilter(mockHoldings));

    // 先排序
    act(() => {
      result.current.handleSort('weight');
    });
    expect(result.current.sortOrder).toBe('desc');

    // 再次點擊同一欄位，切換順序
    act(() => {
      result.current.handleSort('weight');
    });
    expect(result.current.sortOrder).toBe('asc');
  });

  it('should toggle filter', () => {
    const { result } = renderHook(() => useHoldingsFilter(mockHoldings));

    act(() => {
      result.current.toggleFilter('high');
    });

    expect(result.current.activeFilters).toContain('high');

    // 再次切換應移除
    act(() => {
      result.current.toggleFilter('high');
    });
    expect(result.current.activeFilters).not.toContain('high');
  });

  it('should provide filter options with counts', () => {
    const { result } = renderHook(() => useHoldingsFilter(mockHoldings));

    expect(result.current.filterOptions).toBeDefined();
    expect(result.current.filterOptions.length).toBeGreaterThan(0);
    
    // 每個選項都應該有必要欄位
    result.current.filterOptions.forEach(opt => {
      expect(opt).toHaveProperty('id');
      expect(opt).toHaveProperty('label');
      expect(opt).toHaveProperty('matchCount');
      expect(opt).toHaveProperty('totalCount');
    });
  });
});
