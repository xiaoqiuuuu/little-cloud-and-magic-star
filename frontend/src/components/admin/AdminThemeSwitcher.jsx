import { Button, Popover } from 'antd';
import {
  CheckOutlined,
  MoonOutlined,
  SkinOutlined,
  SunOutlined,
} from '@ant-design/icons';
import { useCloudUI } from '../../ui';
import './AdminThemeSwitcher.css';


function AdminThemePanel({ compact = false }) {
  const {
    themeId,
    theme,
    themePresets,
    selectTheme,
    characterPackId,
    characterPacks,
    selectCharacterPack,
    mode,
    toggleMode,
  } = useCloudUI();
  const availableCharacters = theme.characterPackIds.map((packId) => characterPacks[packId]);

  return (
    <div className={`admin-theme-panel ${compact ? 'is-compact' : ''}`}>
      <header className="admin-theme-panel__header">
        <div>
          <span>后台外观</span>
          <strong>{theme.name}</strong>
        </div>
        <span className="admin-theme-panel__mode">{mode === 'light' ? '浅色' : '深色'}</span>
      </header>

      <div className="admin-theme-panel__section">
        <span className="admin-theme-panel__label">主题</span>
        <div className="admin-theme-options">
          {Object.values(themePresets).map((preset) => (
            <button
              type="button"
              key={preset.id}
              className={themeId === preset.id ? 'is-active' : ''}
              onClick={() => selectTheme(preset.id)}
              aria-pressed={themeId === preset.id}
            >
              <span
                className="admin-theme-options__swatch"
                style={{ background: preset.tokens[mode].gradientPrimary }}
                aria-hidden="true"
              />
              <span>
                <strong>{preset.name}</strong>
                <small>{preset.tagline}</small>
              </span>
              {themeId === preset.id && <CheckOutlined />}
            </button>
          ))}
        </div>
      </div>

      <div className="admin-theme-panel__section">
        <span className="admin-theme-panel__label">主题角色</span>
        <div className="admin-character-options">
          {availableCharacters.map((character) => (
            <button
              type="button"
              key={character.id}
              className={characterPackId === character.id ? 'is-active' : ''}
              onClick={() => selectCharacterPack(character.id)}
              aria-label={`选择${character.name}`}
              aria-pressed={characterPackId === character.id}
            >
              <img src={character.assets.buttonAvatar} alt="" draggable="false" />
              <span>{character.name}</span>
            </button>
          ))}
        </div>
      </div>

      <button type="button" className="admin-mode-toggle" onClick={toggleMode}>
        <span className="admin-mode-toggle__icon" aria-hidden="true">
          {mode === 'light' ? <MoonOutlined /> : <SunOutlined />}
        </span>
        <span>
          <strong>{mode === 'light' ? '切换到深色模式' : '切换到浅色模式'}</strong>
          <small>选择会自动保存在当前浏览器</small>
        </span>
      </button>
    </div>
  );
}


function AdminThemeSwitcher({ variant = 'popover', className = '' }) {
  const { theme, characterPack } = useCloudUI();

  if (variant === 'panel') {
    return <AdminThemePanel compact />;
  }

  return (
    <Popover
      trigger="click"
      placement="bottomRight"
      content={<AdminThemePanel />}
      overlayClassName="admin-theme-popover"
    >
      <Button className={`admin-theme-trigger ${className}`} icon={<SkinOutlined />} title="切换后台主题">
        <span className="admin-theme-trigger__avatar" aria-hidden="true">
          <img src={characterPack.assets.buttonAvatar} alt="" draggable="false" />
        </span>
        <span className="admin-theme-trigger__label">{theme.name}</span>
      </Button>
    </Popover>
  );
}


export { AdminThemePanel };
export default AdminThemeSwitcher;
