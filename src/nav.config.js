/**
 * Shared navigation registry — keep desktop and mobile nav in sync.
 * Paths are derived via createPageUrl(page) unless `path` is set explicitly.
 */
export const MOBILE_NAV_ITEMS = [
  { name: 'Dashboard', page: 'Dashboard' },
  { name: 'Scanner', page: 'AssetScanner' },
  { name: 'SETH', page: 'SETH' },
  { name: 'Achievements', page: 'Achievements' },
];

export const DESKTOP_NAV_ITEMS = [
  { name: 'TIM', page: 'SETH', path: '/', alsoActive: ['/SETH'] },
  { name: 'Devices', page: 'Devices' },
  { name: 'Dashboard', page: 'Dashboard' },
  { name: 'Assets', page: 'AssetManagement' },
  { name: 'Integrity', page: 'IntegrityMonitoring' },
  { name: 'Talent', page: 'TalentInsights' },
  { name: 'Settings', page: 'UserSettings' },
];
