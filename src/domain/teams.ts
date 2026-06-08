import { TEAMS } from '../data/dotaData';

export interface TeamInfo {
  name: string;
  type: 'none' | 'preset' | 'custom' | string;
}

const teamsById = TEAMS as Record<string, TeamInfo>;

export function getTeam(teamId: string): TeamInfo {
  return teamsById[teamId] ?? teamsById.NONE;
}

export function getTeams(): Array<[string, TeamInfo]> {
  return Object.entries(teamsById);
}
