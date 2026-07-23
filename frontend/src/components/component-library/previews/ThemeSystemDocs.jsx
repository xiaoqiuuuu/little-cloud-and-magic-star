import {
  Alert,
  Button,
  CharacterButton,
  getCharacterCssVariables,
  getCharacterPack,
  getTokenCssVariables,
  Input,
  Select,
  Statistic,
  Switch,
  Tag,
  useCloudUI,
} from '../../../ui';


function ThemeKit({ preset, mode, active, onSelectTheme, onSelectCharacter }) {
  const characters = preset.characterPackIds.map((packId) => getCharacterPack(packId));
  const defaultCharacter = getCharacterPack(preset.defaultCharacterPack);
  const previewStyle = {
    ...getTokenCssVariables(preset.tokens[mode]),
    ...getCharacterCssVariables(defaultCharacter),
  };

  return (
    <section className={`cl-theme-kit ${active ? 'is-active' : ''}`} style={previewStyle}>
      <header className="cl-theme-kit__header">
        <div>
          <h3>{preset.name}</h3>
        </div>
        <Button size="small" variant={active ? 'primary' : 'secondary'} onClick={() => onSelectTheme(preset.id)}>
          {active ? '当前主题' : '应用主题'}
        </Button>
      </header>

      <div className="cl-theme-kit__characters" aria-label={`${preset.name}角色`}>
        {characters.map((character) => (
          <button key={character.id} type="button" onClick={() => onSelectCharacter(character.id)}>
            <span><img src={character.assets.buttonAvatar} alt="" /></span>
            <strong>{character.name}</strong>
          </button>
        ))}
      </div>

      <div className="cl-theme-kit__components">
        <div className="cl-theme-kit__form">
          <Input label="名称" placeholder="请输入名称" />
          <Select
            label="内容状态"
            defaultValue="published"
            options={[
              { value: 'draft', label: '草稿' },
              { value: 'published', label: '已发布' },
            ]}
          />
          <Switch defaultChecked label="启用" />
        </div>
        <div className="cl-theme-kit__display">
          <div className="cl-theme-kit__tags">
            <Tag tone="primary">主题色</Tag>
            <Tag tone="success">已启用</Tag>
            <Tag tone="warning">待确认</Tag>
          </div>
          <Statistic label="示例数值" value="128" emphasis />
          <Alert type="info" title="提示信息" />
          <CharacterButton character={defaultCharacter.id}>操作按钮</CharacterButton>
        </div>
      </div>
    </section>
  );
}


function ThemeSystemDocs() {
  const {
    themeId,
    theme,
    themePresets,
    selectTheme,
    mode,
    toggleMode,
    characterPack,
    selectCharacterPack,
    tokens,
  } = useCloudUI();

  return (
    <article className="cl-docs">
      <header className="cl-docs-header">
        <div>
          <div className="cl-kicker">FOUNDATION · THEME</div>
          <h1>两套主题，六个角色</h1>
        </div>
        <div className="cl-docs-meta"><span className="cl-status-badge">● {theme.name}</span><span>{mode}</span></div>
      </header>

      <section className="cl-section">
        <div className="cl-section-heading">
          <div><span className="cl-section-index">01</span><h2>主题组件套装</h2></div>
          <p>每套主题包含三位角色，并为常用组件提供完整的亮色与暗色 Token。</p>
        </div>
        <div className="cl-theme-kit-grid">
          {Object.values(themePresets).map((preset) => (
            <ThemeKit
              key={preset.id}
              preset={preset}
              mode={mode}
              active={themeId === preset.id}
              onSelectTheme={selectTheme}
              onSelectCharacter={selectCharacterPack}
            />
          ))}
        </div>
        <div className="cl-theme-mode-row">
          <div><strong>颜色模式</strong><span>当前组合：{theme.name} · {characterPack.name} · {mode === 'light' ? '浅色' : '深色'}</span></div>
          <button type="button" onClick={toggleMode}>{mode === 'light' ? '切换深色' : '切换浅色'}</button>
        </div>
      </section>

      <section className="cl-section">
        <div className="cl-section-heading">
          <div><span className="cl-section-index">02</span><h2>当前语义 Token</h2></div>
          <p>自定义组件和 Ant Design ConfigProvider 使用同一个 Token 来源。</p>
        </div>
        <div className="cl-token-grid">
          {Object.entries(tokens).map(([name, value]) => (
            <div className="cl-token-item" key={name}>
              <span className="cl-token-color" style={{ background: value }} />
              <div><strong>{name}</strong><code>{value}</code></div>
            </div>
          ))}
        </div>
      </section>

      <section className="cl-section">
        <div className="cl-section-heading">
          <div><span className="cl-section-index">03</span><h2>接入方式</h2></div>
          <p>选择人物时会同步切换其所属主题。</p>
        </div>
        <div className="cl-code-block"><pre><code>{`<CloudUIProvider>\n  <App />\n</CloudUIProvider>\n\nconst {\n  selectTheme,\n  selectCharacterPack,\n  toggleMode,\n} = useCloudUI();`}</code></pre></div>
      </section>
    </article>
  );
}


export default ThemeSystemDocs;
