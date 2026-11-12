import type { ThemePreference } from '@/types/api';

export const THEME_PREF_KEY = 'restaurion-theme-pref';

/** Explicit choice wins; 'system' (and anonymous visitors) is light only when the OS asks for light, else dark. */
export function resolveTheme(pref: ThemePreference | null | undefined, systemPrefersLight: boolean): 'light' | 'dark' {
  if (pref === 'light' || pref === 'dark') return pref;
  return systemPrefersLight ? 'light' : 'dark';
}

/** Sets/removes `.dark` on <html> for a preference (browser only). */
export function applyTheme(pref: ThemePreference | null | undefined): void {
  let light = false;
  try {
    light = window.matchMedia('(prefers-color-scheme: light)').matches;
  } catch {
    /* no matchMedia: treat as no light preference */
  }
  document.documentElement.classList.toggle('dark', resolveTheme(pref, light) === 'dark');
}
