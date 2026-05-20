export const NINJA_NAMES = [
  'TanjiroKun',
  'InosukeBoar',
  'ZenitsuThunder',
  'NezukoChan',
  'GiyuWater',
  'RengokuFlame',
  'ShinobuMist',
  'TomiokaSilent',
  'MitsuriLove',
  'ObanaiSerpent',
];

export function getRandomNickname() {
  return NINJA_NAMES[Math.floor(Math.random() * NINJA_NAMES.length)];
}

export function getStoredNickname() {
  try {
    return sessionStorage.getItem('sr_nickname') || '';
  } catch {
    return '';
  }
}

export function storeNickname(nickname) {
  try {
    sessionStorage.setItem('sr_nickname', nickname.slice(0, 20));
  } catch {
    /* ignore */
  }
}
