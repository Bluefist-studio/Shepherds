import { buildLevel } from './level-settings.js';

export function createLevel(levelId = 'gated') {
  return buildLevel(levelId);
}
