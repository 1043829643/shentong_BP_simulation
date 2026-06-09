import { describe, expect, it } from 'vitest';
import * as XLSX from 'xlsx';
import { parseHeroPoolFile } from './poolImporter';
import type { RolePool } from '../types';

function flatNames(rolePool: RolePool | undefined): string[] {
  return rolePool && 'flat' in rolePool ? rolePool.flat.map((hero) => hero.cn || hero.name) : [];
}

describe('pool importer', () => {
  it('parses csv hero pool template', async () => {
    const file = new File(['英雄名,常用位置,优先级\n小小,1,S\n帕克,2,A'], 'pool.csv', { type: 'text/csv' });
    const result = await parseHeroPoolFile(file);
    expect(result.errors).toEqual([]);
    expect(result.pool?.['1']).toBeTruthy();
  });

  it('reports missing required fields', async () => {
    const file = new File(['英雄名,优先级\n小小,S'], 'bad.csv', { type: 'text/csv' });
    const result = await parseHeroPoolFile(file);
    expect(result.pool).toBeNull();
    expect(result.errors[0]).toContain('缺少常用位置');
  });

  it('parses wide hero pool summary ordered by frequency', async () => {
    const workbook = XLSX.utils.book_new();
    const summary = XLSX.utils.json_to_sheet([
      { 位置: '1', 英雄1: '凯', 频次1: 20, 使用1: 10, 英雄2: '小小', 频次2: 9, 使用2: 0 },
      { 位置: '2', 英雄1: '小小', 频次1: 12, 使用1: 6, 英雄2: '帕克', 频次2: 14, 使用2: 7 }
    ]);
    XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet([{ 说明: 'not first' }]), '数据口径');
    XLSX.utils.book_append_sheet(workbook, summary, '英雄池汇总');
    const buffer = XLSX.write(workbook, { type: 'array', bookType: 'xlsx' }) as ArrayBuffer;
    const file = new File([buffer], 'TRE英雄池.xlsx', { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });

    const result = await parseHeroPoolFile(file);

    expect(result.errors).toEqual([]);
    expect(flatNames(result.pool?.['1'])).toEqual(['凯']);
    expect(flatNames(result.pool?.['2'])).toEqual(['帕克', '小小']);
    expect(flatNames(result.pool?.flex)).toEqual([]);
  });
});
