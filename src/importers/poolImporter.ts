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
  const buffer = await readFileBuffer(file);
  const workbook = XLSX.read(buffer, { type: 'array' });
  const sheetName = workbook.SheetNames.find((name) => name.trim() === '英雄池汇总') || workbook.SheetNames[0];
  if (!sheetName) throw new Error('Excel 中没有可读取的工作表');
  return XLSX.utils.sheet_to_json<RawRow>(workbook.Sheets[sheetName], { defval: '' });
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

async function readFileBuffer(file: File): Promise<ArrayBuffer> {
  if (typeof file.arrayBuffer === 'function') return file.arrayBuffer();

  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      if (reader.result instanceof ArrayBuffer) {
        resolve(reader.result);
        return;
      }
      reject(new Error('文件读取失败'));
    };
    reader.onerror = () => reject(new Error('文件读取失败'));
    reader.readAsArrayBuffer(file);
  });
}

function normalizeRows(rows: RawRow[]): ImportResult {
  if (rows.length === 0) return { pool: null, errors: ['文件为空或没有表头'], warnings: [] };
  if (isWideHeroPool(rows)) return normalizeWideRows(rows);
  return normalizeLongRows(rows);
}

function normalizeWideRows(rows: RawRow[]): ImportResult {
  const errors: string[] = [];
  const warnings: string[] = [];
  const normalized: Array<{ heroName: string; role: string; frequency: number }> = [];

  rows.forEach((row, index) => {
    const role = readField(row, ['位置', '常用位置', 'role', 'position', 'pos']);
    if (!role) errors.push('第 ' + (index + 2) + ' 行缺少常用位置');
    if (role && !['1', '2', '3', '4', '5'].includes(String(role).trim())) {
      errors.push('第 ' + (index + 2) + ' 行常用位置必须是 1-5');
    }

    const heroIndexes = Object.keys(row)
      .map((key) => key.match(/^英雄(\d+)$/))
      .filter((match): match is RegExpMatchArray => Boolean(match))
      .map((match) => Number(match[1]))
      .sort((left, right) => left - right);

    for (const heroIndex of heroIndexes) {
      const heroName = readField(row, ['英雄' + heroIndex]);
      if (!heroName) continue;
      const usageText = readField(row, ['使用' + heroIndex, 'use' + heroIndex, 'pick' + heroIndex]);
      if (usageText && parseFrequency(usageText) <= 0) continue;
      const frequency = parseFrequency(readField(row, ['频次' + heroIndex, 'frequency' + heroIndex]));
      if (role) normalized.push({ heroName, role, frequency });
    }
  });

  if (errors.length > 0) return { pool: null, errors, warnings };
  if (normalized.length === 0) warnings.push('未解析出任何英雄池数据');

  return { pool: buildPoolFromRows(normalized), errors: [], warnings };
}

function normalizeLongRows(rows: RawRow[]): ImportResult {
  const errors: string[] = [];
  const warnings: string[] = [];
  const normalized: Array<{ heroName: string; role: string; tier?: string; frequency?: number }> = [];

  rows.forEach((row, index) => {
    const heroName = readField(row, ['英雄名', '英雄', 'hero', 'heroName', 'name']);
    const role = readField(row, ['常用位置', '位置', 'role', 'position', 'pos']);
    const tier = readField(row, ['优先级', '评级', 'tier', 'priority']) || 'C';
    const frequencyText = readField(row, ['频次', 'frequency', 'count']);

    if (!heroName) errors.push('第 ' + (index + 2) + ' 行缺少英雄名');
    if (!role) errors.push('第 ' + (index + 2) + ' 行缺少常用位置');
    if (role && !['1', '2', '3', '4', '5'].includes(String(role).trim())) {
      errors.push('第 ' + (index + 2) + ' 行常用位置必须是 1-5');
    }
    if (heroName && role) normalized.push({ heroName, role, tier, frequency: frequencyText ? parseFrequency(frequencyText) : undefined });
  });

  if (errors.length > 0) return { pool: null, errors, warnings };
  if (normalized.length === 0) warnings.push('未解析出任何英雄池数据');

  return { pool: buildPoolFromRows(normalized), errors: [], warnings };
}

function isWideHeroPool(rows: RawRow[]): boolean {
  return rows.some((row) => Object.keys(row).some((key) => /^英雄\d+$/.test(key.trim())));
}

function parseFrequency(value: string): number {
  const frequency = Number(value);
  return Number.isFinite(frequency) ? frequency : 0;
}

function readField(row: RawRow, aliases: string[]): string {
  for (const key of aliases) {
    const direct = row[key];
    if (direct !== undefined && String(direct).trim()) return String(direct).trim();
  }
  const foundKey = Object.keys(row).find((item) => aliases.some((alias) => item.trim().toLowerCase() === alias.toLowerCase()));
  return foundKey ? String(row[foundKey] ?? '').trim() : '';
}
