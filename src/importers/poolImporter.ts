import Papa from 'papaparse';
import * as XLSX from 'xlsx';
import { buildPoolFromRows } from '../domain/heroes';
import type { ImportResult } from '../types';

type RawRow = Record<string, unknown>;

export async function parseHeroPoolFile(file: File): Promise<ImportResult> {
  try {
    const extension = file.name.split('.').pop()?.toLowerCase();
    const rows = extension === 'csv' ? await parseCsv(file) : await parseExcel(file);
    return normalizeRows(rows);
  } catch (error) {
    return {
      pool: null,
      errors: [error instanceof Error ? error.message : '文件解析失败'],
      warnings: []
    };
  }
}

async function parseExcel(file: File): Promise<RawRow[]> {
  const buffer = await file.arrayBuffer();
  const workbook = XLSX.read(buffer, { type: 'array' });
  const firstSheet = workbook.SheetNames[0];
  if (!firstSheet) throw new Error('Excel 中没有可读取的工作表');
  return XLSX.utils.sheet_to_json<RawRow>(workbook.Sheets[firstSheet], { defval: '' });
}

async function parseCsv(file: File): Promise<RawRow[]> {
  const text = await readFileText(file);
  const result = Papa.parse<RawRow>(text, { header: true, skipEmptyLines: true });
  if (result.errors.length > 0) {
    throw new Error(result.errors.map((item) => '第 ' + item.row + ' 行：' + item.message).join('; '));
  }
  return result.data;
}

async function readFileText(file: File): Promise<string> {
  if (typeof file.text === 'function') return file.text();
  if (typeof file.arrayBuffer === 'function') {
    const buffer = await file.arrayBuffer();
    return new TextDecoder('utf-8').decode(buffer);
  }

  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ''));
    reader.onerror = () => reject(new Error('文件读取失败'));
    reader.readAsText(file, 'utf-8');
  });
}

function normalizeRows(rows: RawRow[]): ImportResult {
  const errors: string[] = [];
  const warnings: string[] = [];
  const normalized: Array<{ heroName: string; role: string; tier?: string }> = [];

  rows.forEach((row, index) => {
    const heroName = readField(row, ['英雄名', '英雄', 'hero', 'heroName', 'name']);
    const role = readField(row, ['常用位置', '位置', 'role', 'position', 'pos']);
    const tier = readField(row, ['优先级', '评级', 'tier', 'priority']) || 'C';

    if (!heroName) errors.push('第 ' + (index + 2) + ' 行缺少英雄名');
    if (!role) errors.push('第 ' + (index + 2) + ' 行缺少常用位置');
    if (role && !['1', '2', '3', '4', '5'].includes(String(role).trim())) {
      errors.push('第 ' + (index + 2) + ' 行常用位置必须是 1-5');
    }
    if (heroName && role) normalized.push({ heroName, role, tier });
  });

  if (rows.length === 0) errors.push('文件为空或没有表头');
  if (errors.length > 0) return { pool: null, errors, warnings };
  if (normalized.length === 0) warnings.push('未解析出任何英雄池数据');

  return { pool: buildPoolFromRows(normalized), errors: [], warnings };
}

function readField(row: RawRow, aliases: string[]): string {
  for (const key of aliases) {
    const direct = row[key];
    if (direct !== undefined && String(direct).trim()) return String(direct).trim();
  }
  const foundKey = Object.keys(row).find((item) => aliases.some((alias) => item.trim().toLowerCase() === alias.toLowerCase()));
  return foundKey ? String(row[foundKey] ?? '').trim() : '';
}
