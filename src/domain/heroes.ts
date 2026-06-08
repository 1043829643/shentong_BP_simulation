import { FALLBACK_BY_ROLE, HEROES, HERO_NAME_TO_ID, REAL_741_POOL_NAMES, TEAM_POOLS, tiers } from '../data/dotaData';
import type { FlatPool, Hero, HeroPool, RoleKey, Tier, TierPool } from '../types';

const heroList = HEROES as Hero[];
const heroNameToId = HERO_NAME_TO_ID as Map<string, string>;
const teamPools = TEAM_POOLS as Record<string, Record<string, Partial<Record<Tier, string[]>>>>;
const fallbackByRole = FALLBACK_BY_ROLE as Record<number, string[]>;
const tierList = tiers as Tier[];
const real741PoolNames = REAL_741_POOL_NAMES as Record<string, string[]>;

const heroById = new Map<string, Hero>(heroList.map((hero) => [hero.id, hero]));
const tierWeight: Record<Tier, number> = { S: 4, A: 3, B: 2, C: 1 };

export function getHero(id: string): Hero {
  return heroById.get(id) ?? { id, name: id, cn: id, roles: [] };
}

export function getAllHeroes(): Hero[] {
  return heroList;
}

export function getHeroByName(name: string): Hero {
  const normalized = name.trim();
  const mappedId = heroNameToId.get(normalized);
  if (mappedId) return { ...getHero(mappedId), cn: normalized };
  const found = getAllHeroes().find((item) => item.id === normalized || item.name.toLowerCase() === normalized.toLowerCase() || item.cn === normalized);
  if (found) return found;
  const fallbackId = normalized.toLowerCase().replace(/[^a-z0-9一-龥]+/g, '_').replace(/^_+|_+$/g, '') || normalized;
  return { id: fallbackId, name: normalized, cn: normalized, roles: [] };
}

export function imageUrl(heroId: string): string {
  return 'https://cdn.cloudflare.steamstatic.com/apps/dota2/images/dota_react/heroes/' + heroId + '.png';
}

export function displayName(heroObj: Hero): string {
  return heroObj.cn || heroObj.name;
}

export function initials(heroObj: Hero): string {
  return (heroObj.cn || heroObj.name || '?').slice(0, 2);
}

export function blankPool(): HeroPool {
  return {
    '1': { S: [], A: [], B: [], C: [] },
    '2': { S: [], A: [], B: [], C: [] },
    '3': { S: [], A: [], B: [], C: [] },
    '4': { S: [], A: [], B: [], C: [] },
    '5': { S: [], A: [], B: [], C: [] },
    flex: { S: [], A: [], B: [], C: [] }
  };
}

export function buildPoolData(teamId: string, customPool?: HeroPool | null): HeroPool {
  if (teamId === 'CUSTOM' && customPool) return customPool;
  if (teamPools[teamId]) return buildPoolFromRaw(teamPools[teamId]);
  if (teamId === 'NONE') return buildGeneratedPool(2);
  if (teamId === 'CUSTOM') return buildGeneratedPool(5);
  return buildGeneratedPool(teamId.length);
}

export function buildGeneratedPool(seed: number): HeroPool {
  const raw: Record<string, Record<Tier, string[]>> = {};
  for (const role of [1, 2, 3, 4, 5]) {
    const list = rotate(fallbackByRole[role], seed + role);
    raw[String(role)] = {
      S: list.slice(0, 3),
      A: list.slice(3, 6),
      B: list.slice(6, 9),
      C: list.slice(9, 12)
    };
  }
  return buildPoolFromRaw(raw);
}

export function buildPoolFromRaw(raw: Record<string, Partial<Record<Tier, string[]>>>): HeroPool {
  const pool = blankPool();
  const appearances = new Map<string, Set<number>>();
  const bestTier = new Map<string, Tier>();

  for (const role of [1, 2, 3, 4, 5]) {
    const roleKey = String(role) as RoleKey;
    const tierPool = pool[roleKey] as TierPool;
    for (const tier of tierList) {
      for (const heroId of raw[role]?.[tier] || raw[roleKey]?.[tier] || []) {
        const heroObj = getHero(heroId);
        tierPool[tier].push(heroObj);
        if (!appearances.has(heroId)) appearances.set(heroId, new Set());
        appearances.get(heroId)?.add(role);
        if (!bestTier.has(heroId) || tierWeight[tier] > tierWeight[bestTier.get(heroId)!]) {
          bestTier.set(heroId, tier);
        }
      }
    }
  }

  const flexPool = pool.flex as TierPool;
  for (const [heroId, roleSet] of appearances) {
    if (roleSet.size >= 2) flexPool[bestTier.get(heroId) || 'C'].push(getHero(heroId));
  }

  return pool;
}

export function buildPoolFromRows(rows: Array<{ heroName: string; role: string | number; tier?: string }>): HeroPool {
  const raw: Record<string, Record<Tier, string[]>> = {};
  for (const role of ['1', '2', '3', '4', '5']) raw[role] = { S: [], A: [], B: [], C: [] };

  for (const row of rows) {
    const role = String(row.role).trim();
    if (!['1', '2', '3', '4', '5'].includes(role)) continue;
    const tier = normalizeTier(row.tier);
    const heroObj = getHeroByName(row.heroName);
    raw[role][tier].push(heroObj.id);
    if (!heroById.has(heroObj.id)) heroById.set(heroObj.id, heroObj);
  }

  return buildPoolFromRaw(raw);
}

export function buildReal741Pool(): Record<string, Hero[]> {
  const pool: Record<string, Hero[]> = {};
  for (const [role, heroNames] of Object.entries(real741PoolNames)) {
    pool[role] = heroNames.map((heroName) => getHeroByName(heroName));
  }
  return pool;
}

export function buildOtherHeroPool(allHeroesByRole: Record<string, Hero[]>, ownPool: HeroPool): HeroPool {
  const ownHeroIds = collectPoolHeroIds(ownPool);
  const otherPool = {} as HeroPool;
  for (const [role, heroes] of Object.entries(allHeroesByRole)) {
    otherPool[role as RoleKey] = {
      flat: heroes
        .filter((heroObj) => !ownHeroIds.has(heroObj.id))
        .slice()
        .sort((left, right) => displayName(left).localeCompare(displayName(right), 'zh-CN'))
    } as FlatPool;
  }
  otherPool.flex = { flat: [] };
  return otherPool;
}

export function collectPoolHeroIds(pool?: HeroPool | null): Set<string> {
  const ids = new Set<string>();
  if (!pool) return ids;
  for (const roleValue of Object.values(pool)) {
    if ('flat' in roleValue) {
      for (const heroObj of roleValue.flat) ids.add(heroObj.id);
      continue;
    }
    for (const heroes of Object.values(roleValue)) {
      for (const heroObj of heroes) ids.add(heroObj.id);
    }
  }
  return ids;
}

function rotate<T>(items: T[], amount: number): T[] {
  const offset = amount % items.length;
  return [...items.slice(offset), ...items.slice(0, offset)];
}

function normalizeTier(value?: string): Tier {
  const tier = String(value || 'C').trim().toUpperCase();
  return tier === 'S' || tier === 'A' || tier === 'B' || tier === 'C' ? tier : 'C';
}
