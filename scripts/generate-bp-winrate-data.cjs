const fs = require('fs');
const path = require('path');
const XLSX = require('xlsx');

const root = path.resolve(__dirname, '..');
const modelPath = path.join(root, 'resources', 'bp-winrate', 'param_tables', 'output_c0.1.xlsx');
const heroesPath = path.join(root, 'resources', 'bp-winrate', 'heroes.json');
const winrateOutPath = path.join(root, 'src', 'data', 'winrateModel.ts');
const attributesOutPath = path.join(root, 'src', 'data', 'heroAttributes.ts');

function readHeroes() {
  const raw = JSON.parse(fs.readFileSync(heroesPath, 'utf8'));
  return Object.values(raw)
    .filter((item) => item && item.id && item.name)
    .map((item) => ({
      id: Number(item.id),
      heroId: String(item.name).replace(/^npc_dota_hero_/, ''),
      attr: String(item.primary_attr || '')
    }))
    .filter((item) => item.heroId);
}

function generateWinrateModel(heroRows) {
  const idToHero = new Map(heroRows.map((item) => [item.id, item.heroId]));
  const wb = XLSX.readFile(modelPath);
  const rows = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]]);
  const single = [];
  const samePair = [];
  const crossPair = [];
  let radiantBias = 0;

  function heroName(num) {
    return idToHero.get(Number(num));
  }

  for (const row of rows) {
    const feature = String(row.feature || '').trim();
    const coefficient = Number(row.coefficient);
    if (!Number.isFinite(coefficient)) continue;

    if (feature === 'radiant') {
      radiantBias = coefficient;
      continue;
    }

    let match = feature.match(/^hero_(\d+)$/);
    if (match) {
      const hero = heroName(match[1]);
      if (hero) single.push([hero, coefficient]);
      continue;
    }

    match = feature.match(/^hero_(\d+)chero_(\d+)$/);
    if (match) {
      const left = heroName(match[1]);
      const right = heroName(match[2]);
      if (left && right) samePair.push([left, right, coefficient]);
      continue;
    }

    match = feature.match(/^hero_(\d+)xhero_(\d+)$/);
    if (match) {
      const left = heroName(match[1]);
      const right = heroName(match[2]);
      if (left && right) crossPair.push([left, right, coefficient]);
    }
  }

  const sortTuples = (items) =>
    items.sort((left, right) => left.slice(0, -1).join('|').localeCompare(right.slice(0, -1).join('|')));

  const content = `// Auto-generated from resources/bp-winrate/param_tables/output_c0.1.xlsx.
// Source model format: feature/coefficient logistic BP winrate parameters.
// Do not edit values by hand; regenerate from the source parameter table if it changes.

export const WINRATE_MODEL_SOURCE = "resources/bp-winrate/param_tables/output_c0.1.xlsx";
export const WINRATE_MODEL_GENERATED_AT = ${JSON.stringify(new Date().toISOString())};
export const RADIANT_BIAS = ${JSON.stringify(radiantBias)};

export const SINGLE_COEFFICIENTS: ReadonlyArray<readonly [string, number]> = ${JSON.stringify(sortTuples(single))};

export const SAME_PAIR_COEFFICIENTS: ReadonlyArray<readonly [string, string, number]> = ${JSON.stringify(sortTuples(samePair))};

export const CROSS_PAIR_COEFFICIENTS: ReadonlyArray<readonly [string, string, number]> = ${JSON.stringify(sortTuples(crossPair))};
`;

  fs.writeFileSync(winrateOutPath, content, 'utf8');
}

function generateHeroAttributes(heroRows) {
  const rows = heroRows
    .filter((item) => ['str', 'agi', 'int', 'all'].includes(item.attr))
    .sort((left, right) => left.id - right.id);
  const attrByHero = Object.fromEntries(rows.map((item) => [item.heroId, item.attr]));
  const orderByHero = Object.fromEntries(rows.map((item) => [item.heroId, item.id]));

  const content = `// Auto-generated from resources/bp-winrate/heroes.json.
// Used by the traditional BP screen to group heroes by primary attribute.

export type HeroAttribute = 'str' | 'agi' | 'int' | 'all';

export const ATTRIBUTE_ORDER: readonly HeroAttribute[] = ['str', 'agi', 'int', 'all'];

export const ATTRIBUTE_LABELS: Record<HeroAttribute, string> = {
  str: '力量',
  agi: '敏捷',
  int: '智力',
  all: '全才'
};

export const HERO_ATTRIBUTE_BY_ID: Record<string, HeroAttribute> = ${JSON.stringify(attrByHero, null, 2)};

export const HERO_NUMERIC_ORDER: Record<string, number> = ${JSON.stringify(orderByHero, null, 2)};
`;

  fs.writeFileSync(attributesOutPath, content, 'utf8');
}

const heroRows = readHeroes();
generateWinrateModel(heroRows);
generateHeroAttributes(heroRows);
console.log(`Generated BP winrate data from local resources (${heroRows.length} heroes).`);
