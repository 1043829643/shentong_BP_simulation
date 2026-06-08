import { CROSS_PAIR_COEFFICIENTS, RADIANT_BIAS, SAME_PAIR_COEFFICIENTS, SINGLE_COEFFICIENTS } from '../data/winrateModel';
import type { DraftConfig, DraftPlan, Faction } from '../types';

const singleCoefficients = new Map<string, number>(SINGLE_COEFFICIENTS);
const samePairCoefficients = new Map<string, number>(
  SAME_PAIR_COEFFICIENTS.map(([left, right, value]) => [pairKey(left, right), value])
);
const crossPairCoefficients = new Map<string, number>(
  CROSS_PAIR_COEFFICIENTS.map(([left, right, value]) => [pairKey(left, right), value])
);

export interface WinrateEvaluation {
  score: number;
  radiantWinrate: number;
}

export interface PickImpact {
  deltaMyWinrate: number;
  level: number;
}

export function evaluateDraftWinrate(radiantHeroIds: string[], direHeroIds: string[]): WinrateEvaluation {
  let score = RADIANT_BIAS;

  for (const heroId of radiantHeroIds) {
    score += singleCoefficients.get(heroId) || 0;
  }
  for (const heroId of direHeroIds) {
    score -= singleCoefficients.get(heroId) || 0;
  }

  for (const [left, right] of combinations(radiantHeroIds)) {
    score += samePairCoefficients.get(pairKey(left, right)) || 0;
  }
  for (const [left, right] of combinations(direHeroIds)) {
    score -= samePairCoefficients.get(pairKey(left, right)) || 0;
  }

  const radiantSet = new Set(radiantHeroIds);
  for (const radiantHeroId of radiantHeroIds) {
    for (const direHeroId of direHeroIds) {
      const left = radiantHeroId < direHeroId ? radiantHeroId : direHeroId;
      const right = radiantHeroId < direHeroId ? direHeroId : radiantHeroId;
      const coeff = crossPairCoefficients.get(pairKey(left, right)) || 0;
      score += radiantSet.has(left) ? coeff : -coeff;
    }
  }

  return { score, radiantWinrate: sigmoid(score) };
}

export function pickImpactLevel(plan: DraftPlan, candidateHeroId: string, targetSide: Faction, config: DraftConfig): PickImpact | null {
  if (plan.steps.some((step) => step.hero.id === candidateHeroId)) return null;

  const radiantHeroIds = plan.steps
    .filter((step) => step.action === 'Pick' && step.side === 'radiant')
    .map((step) => step.hero.id);
  const direHeroIds = plan.steps
    .filter((step) => step.action === 'Pick' && step.side === 'dire')
    .map((step) => step.hero.id);

  const baseline = evaluateDraftWinrate(radiantHeroIds, direHeroIds).radiantWinrate;
  const nextRadiantIds = targetSide === 'radiant' ? [...radiantHeroIds, candidateHeroId] : radiantHeroIds;
  const nextDireIds = targetSide === 'dire' ? [...direHeroIds, candidateHeroId] : direHeroIds;
  const preview = evaluateDraftWinrate(nextRadiantIds, nextDireIds).radiantWinrate;
  const deltaRadiant = preview - baseline;
  const deltaMyWinrate = config.faction === 'radiant' ? deltaRadiant : -deltaRadiant;
  const absPct = Math.abs(deltaMyWinrate * 100);

  if (absPct < 2) return { deltaMyWinrate, level: 0 };
  const magnitude = absPct < 5 ? 1 : absPct <= 10 ? 2 : 3;
  return { deltaMyWinrate, level: deltaMyWinrate >= 0 ? magnitude : -magnitude };
}

function sigmoid(value: number): number {
  if (value >= 0) {
    const z = Math.exp(-value);
    return 1 / (1 + z);
  }
  const z = Math.exp(value);
  return z / (1 + z);
}

function pairKey(left: string, right: string): string {
  return left < right ? `${left}|${right}` : `${right}|${left}`;
}

function combinations(items: string[]): Array<[string, string]> {
  const pairs: Array<[string, string]> = [];
  for (let left = 0; left < items.length; left += 1) {
    for (let right = left + 1; right < items.length; right += 1) {
      pairs.push([items[left], items[right]]);
    }
  }
  return pairs;
}
