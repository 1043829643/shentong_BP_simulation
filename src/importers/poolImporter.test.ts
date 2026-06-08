import { describe, expect, it } from 'vitest';
import { parseHeroPoolFile } from './poolImporter';

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
});
