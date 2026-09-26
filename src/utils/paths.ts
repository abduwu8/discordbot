import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));

export const srcRoot = join(here, '..');
export const projectRoot = join(srcRoot, '..');
export const commandsPath = join(srcRoot, 'commands');
export const eventsPath = join(srcRoot, 'events');
export const imagesPath = join(projectRoot, 'images');
export const bannerPath = join(imagesPath, 'banner.png');
export const battleImagePath = join(imagesPath, '1v1.png');
export const roadmapBannerPath = join(imagesPath, 'Roadmap.png');
export const rulesBannerPath = join(imagesPath, 'rules.png');
export const resourcesBannerPath = join(imagesPath, 'Resources.png');
export const introductionBannerPath = join(imagesPath, 'introduction.png');
export const resumeBannerPath = join(imagesPath, 'resume.png');
export const dataPath = join(projectRoot, 'data');
export const roadmapLocksPath = join(dataPath, 'roadmap-locks.json');
export const introductionsPath = join(dataPath, 'introductions.json');
export const resumeCooldownsPath = join(dataPath, 'resume-cooldowns.json');
