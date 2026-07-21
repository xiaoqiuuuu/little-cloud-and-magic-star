import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import {
  characterPacks,
  defaultThemeId,
  getCharacterPack,
  getCharacterCssVariables,
  getThemePreset,
  getThemeCharacters,
  getTokenCssVariables,
  themePresets,
} from './registry';
import './theme.css';


const STORAGE_KEY = 'cloud-ui-preferences';

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
  const initialPreset = getThemePreset(initialPreferences.themeId || defaultThemeId);
  const savedCharacter = getCharacterPack(initialPreferences.characterPackId);
  const initialCharacterPackId = initialPreset.characterPackIds.includes(savedCharacter.id)
    ? savedCharacter.id
    : initialPreset.defaultCharacterPack;
  const [themeId, setThemeId] = useState(initialPreset.id);
  const [characterPackId, setCharacterPackId] = useState(
    initialCharacterPackId,
  );
  const [mode, setMode] = useState(initialPreferences.mode === 'dark' ? 'dark' : 'light');

  const theme = getThemePreset(themeId);
  const tokens = theme.tokens[mode];
  const characterPack = getCharacterPack(characterPackId);
  const themeCharacters = getThemeCharacters(theme.id);

  const selectTheme = useCallback((nextThemeId, options = {}) => {
    const nextTheme = getThemePreset(nextThemeId);
    setThemeId(nextTheme.id);
    setCharacterPackId((currentPackId) => (
      options.keepCharacter === true && nextTheme.characterPackIds.includes(currentPackId)
        ? currentPackId
        : nextTheme.defaultCharacterPack
    ));
  }, []);

  const selectCharacterPack = useCallback((nextPackId) => {
    const nextPack = getCharacterPack(nextPackId);
    setThemeId(getThemePreset(nextPack.themeId).id);
    setCharacterPackId(nextPack.id);
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

    Object.entries({
      ...getTokenCssVariables(tokens),
      ...getCharacterCssVariables(characterPack),
    }).forEach(([variableName, variableValue]) => {
      root.style.setProperty(variableName, variableValue);
    });

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
    themeCharacters,
    selectCharacterPack,
    getCharacterPack,
  }), [characterPack, mode, selectCharacterPack, selectTheme, theme, themeCharacters, tokens, toggleMode]);

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
