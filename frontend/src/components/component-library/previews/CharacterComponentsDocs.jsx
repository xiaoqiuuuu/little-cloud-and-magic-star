import { Button, CharacterButton, CharacterCard, useCloudUI } from '../../../ui';


function ExampleContent() {
  return <div className="cl-character-content"><span>CHARACTER SLOT</span><h3>人物装饰内容区</h3><p>人物随全局资源包切换，业务内容和组件 API 保持不变。</p><Button size="small">查看详情</Button></div>;
}


function CharacterComponentsDocs() {
  const { characterPackId, characterPack, characterPacks, selectCharacterPack } = useCloudUI();

  return (
    <article className="cl-docs">
      <header className="cl-docs-header">
        <div><div className="cl-kicker">CHARACTER · BRAND</div><h1>人物组件</h1><p>同一个 CharacterButton 和 CharacterCard 根据人物资源包自动换图、换强调色，不复制业务组件。</p></div>
        <div className="cl-docs-meta"><span className="cl-status-badge">● {characterPack.name}</span><span>v0.1.0</span></div>
      </header>

      <section className="cl-section">
        <div className="cl-section-heading"><div><span className="cl-section-index">01</span><h2>人物包切换</h2></div><p>这里的选择与顶部工具栏、全局 Provider 完全同步。</p></div>
        <div className="cl-character-selector">
          {Object.values(characterPacks).map((pack) => (
            <button type="button" key={pack.id} className={characterPackId === pack.id ? 'is-active' : ''} onClick={() => selectCharacterPack(pack.id)}>
              <img src={pack.assets.buttonAvatar} alt="" /><span><strong>{pack.name}</strong><small>{pack.description}</small></span>
            </button>
          ))}
        </div>
      </section>

      <section className="cl-section">
        <div className="cl-section-heading"><div><span className="cl-section-index">02</span><h2>CharacterButton</h2></div><p>基础 Button 的人物装饰版本。</p></div>
        <div className="cl-component-demo-row"><CharacterButton size="small">小尺寸</CharacterButton><CharacterButton>默认按钮</CharacterButton><CharacterButton size="large">主操作</CharacterButton><CharacterButton loading>加载状态</CharacterButton></div>
      </section>

      <section className="cl-section">
        <div className="cl-section-heading"><div><span className="cl-section-index">03</span><h2>CharacterCard</h2></div><p>边角、侧边和水印布局共享同一内容结构。</p></div>
        <div className="cl-character-card-grid">
          <CharacterCard layout="corner"><ExampleContent /></CharacterCard>
          <CharacterCard layout="side"><ExampleContent /></CharacterCard>
          <CharacterCard layout="watermark"><ExampleContent /></CharacterCard>
          {Object.keys(characterPacks).map((packId) => <CharacterCard key={packId} character={packId} layout="corner"><ExampleContent /></CharacterCard>)}
        </div>
      </section>

      <section className="cl-section">
        <div className="cl-section-heading"><div><span className="cl-section-index">04</span><h2>使用方式</h2></div></div>
        <div className="cl-code-block"><pre><code>{`<CharacterButton>进入活动</CharacterButton>\n\n<CharacterCard layout="corner">\n  <YourContent />\n</CharacterCard>\n\n// 临时覆盖全局人物\n<CharacterButton character="birthday">送上祝福</CharacterButton>`}</code></pre></div>
      </section>
    </article>
  );
}


export default CharacterComponentsDocs;
