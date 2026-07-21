import { useCloudUI } from '../../ui';


function ThemeToolbar() {
  const {
    themeId,
    themePresets,
    selectTheme,
    characterPackId,
    characterPacks,
    selectCharacterPack,
    mode,
    toggleMode,
  } = useCloudUI();

  return (
    <div className="cl-theme-toolbar" aria-label="全局主题设置">
      <label>
        <span>主题</span>
        <select value={themeId} onChange={(event) => selectTheme(event.target.value)}>
          {Object.values(themePresets).map((theme) => (
            <option key={theme.id} value={theme.id}>{theme.name}</option>
          ))}
        </select>
      </label>
      <label>
        <span>人物</span>
        <select value={characterPackId} onChange={(event) => selectCharacterPack(event.target.value)}>
          {Object.values(characterPacks).map((pack) => (
            <option key={pack.id} value={pack.id}>{pack.name}</option>
          ))}
        </select>
      </label>
      <button type="button" onClick={toggleMode} aria-label={`切换到${mode === 'light' ? '深色' : '浅色'}模式`}>
        {mode === 'light' ? '☾' : '☀'}
      </button>
    </div>
  );
}


export default ThemeToolbar;
