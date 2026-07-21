import { Card, CharacterButton, useCloudUI } from '../../../ui';


function ThemeSystemDocs() {
  const {
    themeId,
    theme,
    themePresets,
    selectTheme,
    mode,
    toggleMode,
    characterPackId,
    characterPack,
    characterPacks,
    selectCharacterPack,
    tokens,
  } = useCloudUI();

  return (
    <article className="cl-docs">
      <header className="cl-docs-header">
        <div>
          <div className="cl-kicker">FOUNDATION · THEME</div>
          <h1>全局主题系统</h1>
          <p>颜色模式、语义 Token、Ant Design 和人物资源包由同一个 Provider 统一管理。</p>
        </div>
        <div className="cl-docs-meta"><span className="cl-status-badge">● Active</span><span>{mode}</span></div>
      </header>

      <section className="cl-section">
        <div className="cl-section-heading">
          <div><span className="cl-section-index">01</span><h2>主题预设</h2></div>
          <p>切换预设时默认同步对应人物，也可以在顶部工具栏单独覆盖。</p>
        </div>
        <div className="cl-theme-preset-grid">
          {Object.values(themePresets).map((preset) => (
            <Card
              key={preset.id}
              variant={themeId === preset.id ? 'soft' : 'outlined'}
              selected={themeId === preset.id}
              onClick={() => selectTheme(preset.id)}
            >
              <div className="cl-theme-preset-card">
                <span className="cl-theme-swatch" style={{ background: preset.tokens.light.colorPrimary }} />
                <div><strong>{preset.name}</strong><p>{preset.description}</p></div>
              </div>
            </Card>
          ))}
        </div>
        <div className="cl-theme-mode-row">
          <div><strong>颜色模式</strong><span>当前为 {mode === 'light' ? '浅色模式' : '深色模式'}</span></div>
          <button type="button" onClick={toggleMode}>{mode === 'light' ? '切换深色' : '切换浅色'}</button>
        </div>
      </section>

      <section className="cl-section">
        <div className="cl-section-heading">
          <div><span className="cl-section-index">02</span><h2>人物资源包</h2></div>
          <p>组件使用角色化资源名称，不依赖具体图片文件路径。</p>
        </div>
        <div className="cl-character-pack-grid">
          {Object.values(characterPacks).map((pack) => (
            <button
              type="button"
              key={pack.id}
              className={`cl-character-pack-card ${characterPackId === pack.id ? 'is-active' : ''}`}
              onClick={() => selectCharacterPack(pack.id)}
            >
              <span className={`cl-character-pack-image is-${pack.artworkShape}`}>
                <img src={pack.assets.buttonAvatar} alt="" />
              </span>
              <span><strong>{pack.name}</strong><small>{pack.description}</small></span>
            </button>
          ))}
        </div>
        <div className="cl-theme-live-example">
          <span>当前组合：{theme.name} · {characterPack.name}</span>
          <CharacterButton>主题实时预览</CharacterButton>
        </div>
      </section>

      <section className="cl-section">
        <div className="cl-section-heading">
          <div><span className="cl-section-index">03</span><h2>语义 Token</h2></div>
          <p>基础组件只读取语义变量，不直接写死主题颜色。</p>
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
          <div><span className="cl-section-index">04</span><h2>接入方式</h2></div>
          <p>Provider 已在应用根节点接入，并同步 Ant Design ConfigProvider。</p>
        </div>
        <div className="cl-code-block"><pre><code>{`<CloudUIProvider>\n  <App />\n</CloudUIProvider>\n\nconst { selectTheme, selectCharacterPack, toggleMode } = useCloudUI();`}</code></pre></div>
      </section>
    </article>
  );
}


export default ThemeSystemDocs;
