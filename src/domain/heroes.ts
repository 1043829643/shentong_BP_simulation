import { FALLBACK_BY_ROLE, HEROES, HERO_NAME_TO_ID, REAL_741_POOL_NAMES, TEAM_POOL_ROWS, TEAM_POOLS, tiers } from '../data/dotaData';
import type { FlatPool, Hero, HeroPool, RoleKey, RolePool, Tier, TierPool } from '../types';

const heroList = HEROES as Hero[];
const heroNameToId = HERO_NAME_TO_ID as Map<string, string>;
const teamPools = TEAM_POOLS as Record<string, Record<string, Partial<Record<Tier, string[]>>>>;
const teamPoolRows = TEAM_POOL_ROWS as Record<string, Array<{ heroName: string; role: string | number; frequency: number }>>;
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
  const emptyFlat = (): FlatPool => ({ flat: [] });
  return {
    '1': emptyFlat(),
    '2': emptyFlat(),
    '3': emptyFlat(),
    '4': emptyFlat(),
    '5': emptyFlat(),
    flex: emptyFlat()
  };
}

export function flattenRolePoolByFrequency(rolePool?: RolePool): Hero[] {
  if (!rolePool) return [];
  if ('flat' in rolePool) return rolePool.flat;
  const tierPool = rolePool as TierPool;
  const heroes: Hero[] = [];
  for (const tier of tierList) heroes.push(...(tierPool[tier] || []));
  return heroes;
}

export function flattenTeamPoolByFrequency(pool: HeroPool): HeroPool {
  return {
    '1': { flat: flattenRolePoolByFrequency(pool['1']) },
    '2': { flat: flattenRolePoolByFrequency(pool['2']) },
    '3': { flat: flattenRolePoolByFrequency(pool['3']) },
    '4': { flat: flattenRolePoolByFrequency(pool['4']) },
    '5': { flat: flattenRolePoolByFrequency(pool['5']) },
    flex: { flat: flattenRolePoolByFrequency(pool.flex) }
  };
}

export function buildPoolData(teamId: string, customPool?: HeroPool | null): HeroPool {
  if (teamId === 'CUSTOM' && customPool) return flattenTeamPoolByFrequency(customPool);
  if (teamPoolRows[teamId]) return buildPoolFromRows(teamPoolRows[teamId]);
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
    const flatHeroes: Hero[] = [];
    for (const tier of tierList) {
      for (const heroId of raw[role]?.[tier] || raw[roleKey]?.[tier] || []) {
        const heroObj = getHero(heroId);
        flatHeroes.push(heroObj);
        if (!appearances.has(heroId)) appearances.set(heroId, new Set());
        appearances.get(heroId)?.add(role);
        if (!bestTier.has(heroId) || tierWeight[tier] > tierWeight[bestTier.get(heroId)!]) {
          bestTier.set(heroId, tier);
        }
      }
    }
    pool[roleKey] = { flat: flatHeroes };
  }

  const flexHeroes = [...appearances.entries()]
    .filter(([, roleSet]) => roleSet.size >= 2)
    .map(([heroId, roleSet]) => ({
      hero: getHero(heroId),
      score: roleSet.size * 10 + tierWeight[bestTier.get(heroId) || 'C']
    }))
    .sort((left, right) => right.score - left.score || displayName(left.hero).localeCompare(displayName(right.hero), 'zh-CN'))
    .map((item) => item.hero);
  pool.flex = { flat: flexHeroes };

  return pool;
}

export function buildPoolFromRows(rows: Array<{ heroName: string; role: string | number; tier?: string; frequency?: number }>): HeroPool {
  const pool = blankPool();
  const byRole = new Map<string, Map<string, { hero: Hero; frequency: number; firstIndex: number }>>();
  const heroRoles = new Map<string, Set<string>>();

  rows.forEach((row, index) => {
    const role = String(row.role).trim();
    if (!['1', '2', '3', '4', '5'].includes(role)) return;

    const heroObj = getHeroByName(row.heroName);
    if (!heroById.has(heroObj.id)) heroById.set(heroObj.id, heroObj);

    const frequency = Number.isFinite(row.frequency)
      ? Number(row.frequency)
      : tierWeight[normalizeTier(row.tier)];
    if (!byRole.has(role)) byRole.set(role, new Map());
    const roleHeroes = byRole.get(role)!;
    const existing = roleHeroes.get(heroObj.id);
    if (existing) {
      existing.frequency += frequency;
    } else {
      roleHeroes.set(heroObj.id, { hero: heroObj, frequency, firstIndex: index });
    }

    if (!heroRoles.has(heroObj.id)) heroRoles.set(heroObj.id, new Set());
    heroRoles.get(heroObj.id)?.add(role);
  });

  for (const role of ['1', '2', '3', '4', '5']) {
    const roleKey = role as RoleKey;
    pool[roleKey] = {
      flat: [...(byRole.get(role)?.values() || [])]
        .sort((left, right) => right.frequency - left.frequency || left.firstIndex - right.firstIndex)
        .map((item) => item.hero)
    };
  }

  const flexScores = new Map<string, { hero: Hero; frequency: number; firstIndex: number }>();
  for (const [heroId, roleSet] of heroRoles) {
    if (roleSet.size < 2) continue;
    for (const role of roleSet) {
      const item = byRole.get(role)?.get(heroId);
      if (!item) continue;
      const existing = flexScores.get(heroId);
      if (existing) {
        existing.frequency += item.frequency;
        existing.firstIndex = Math.min(existing.firstIndex, item.firstIndex);
      } else {
        flexScores.set(heroId, { ...item });
      }
    }
  }

  pool.flex = {
    flat: [...flexScores.values()]
      .sort((left, right) => right.frequency - left.frequency || left.firstIndex - right.firstIndex)
      .map((item) => item.hero)
  };

  return pool;
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
