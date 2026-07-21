import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import {
  characterPacks,
  defaultThemeId,
  getCharacterPack,
  getThemePreset,
  themePresets,
} from './registry';
import './theme.css';


const STORAGE_KEY = 'cloud-ui-preferences';

const tokenVariableMap = {
  colorPrimary: '--cui-color-primary',
  colorPrimaryHover: '--cui-color-primary-hover',
  colorPrimarySoft: '--cui-color-primary-soft',
  colorOnPrimary: '--cui-color-on-primary',
  colorSurface: '--cui-color-surface',
  colorSurfaceRaised: '--cui-color-surface-raised',
  colorSurfaceMuted: '--cui-color-surface-muted',
  colorText: '--cui-color-text',
  colorTextMuted: '--cui-color-text-muted',
  colorBorder: '--cui-color-border',
  colorFocus: '--cui-color-focus',
  colorDanger: '--cui-color-danger',
  colorSuccess: '--cui-color-success',
  shadowCard: '--cui-shadow-card',
};

const CloudUIContext = createContext(null);


function readInitialPreferences() {
  if (typeof window === 'undefined') return {};
  try {
    return JSON.parse(window.localStorage.getItem(STORAGE_KEY) || '{}');
  } catch {
    return {};
  }
}


export function CloudUIProvider({ children }) {
  const initialPreferences = useMemo(readInitialPreferences, []);
  const [themeId, setThemeId] = useState(initialPreferences.themeId || defaultThemeId);
  const initialPreset = getThemePreset(initialPreferences.themeId || defaultThemeId);
  const [characterPackId, setCharacterPackId] = useState(
    initialPreferences.characterPackId || initialPreset.defaultCharacterPack,
  );
  const [mode, setMode] = useState(initialPreferences.mode === 'dark' ? 'dark' : 'light');

  const theme = getThemePreset(themeId);
  const tokens = theme.tokens[mode];
  const characterPack = getCharacterPack(characterPackId);

  const selectTheme = useCallback((nextThemeId, options = {}) => {
    const nextTheme = getThemePreset(nextThemeId);
    setThemeId(nextTheme.id);
    if (options.keepCharacter !== true) {
      setCharacterPackId(nextTheme.defaultCharacterPack);
    }
  }, []);

  const selectCharacterPack = useCallback((nextPackId) => {
    setCharacterPackId(getCharacterPack(nextPackId).id);
  }, []);

  const toggleMode = useCallback(() => {
    setMode((currentMode) => currentMode === 'light' ? 'dark' : 'light');
  }, []);

  useEffect(() => {
    const root = document.documentElement;
    root.dataset.cuiTheme = theme.id;
    root.dataset.cuiCharacter = characterPack.id;
    root.dataset.cuiMode = mode;
    root.style.colorScheme = mode;

    Object.entries(tokens).forEach(([tokenName, tokenValue]) => {
      const variableName = tokenVariableMap[tokenName];
      if (variableName) root.style.setProperty(variableName, tokenValue);
    });
    root.style.setProperty('--cui-character-accent', characterPack.accent);
    root.style.setProperty('--cui-character-accent-deep', characterPack.accentDeep);
    root.style.setProperty('--cui-character-accent-soft', characterPack.accentSoft);

    window.localStorage.setItem(STORAGE_KEY, JSON.stringify({
      themeId: theme.id,
      characterPackId: characterPack.id,
      mode,
    }));
  }, [characterPack, mode, theme.id, tokens]);

  const value = useMemo(() => ({
    themeId: theme.id,
    theme,
    themePresets,
    tokens,
    mode,
    setMode,
    toggleMode,
    selectTheme,
    characterPackId: characterPack.id,
    characterPack,
    characterPacks,
    selectCharacterPack,
    getCharacterPack,
  }), [characterPack, mode, selectCharacterPack, selectTheme, theme, tokens, toggleMode]);

  return <CloudUIContext.Provider value={value}>{children}</CloudUIContext.Provider>;
}


export function useCloudUI() {
  const context = useContext(CloudUIContext);
  if (!context) throw new Error('useCloudUI must be used inside CloudUIProvider');
  return context;
}


export function useCharacterPack(packId) {
  const { characterPack } = useCloudUI();
  return packId ? getCharacterPack(packId) : characterPack;
}
