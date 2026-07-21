import {
  Button,
  CharacterButton,
  CharacterCard,
  CharacterEmptyState,
  useCloudUI,
} from '../../../ui';


function ExampleContent() {
  return <div className="cl-character-content"><span>CHARACTER SLOT</span><h3>人物装饰内容区</h3><p>人物随全局资源包切换，业务内容和组件 API 保持不变。</p><Button size="small">查看详情</Button></div>;
}


function CharacterComponentsDocs() {
  const {
    characterPackId,
    characterPack,
    characterPacks,
    selectCharacterPack,
    themePresets,
  } = useCloudUI();

  return (
    <article className="cl-docs">
      <header className="cl-docs-header">
        <div><div className="cl-kicker">CHARACTER · BRAND</div><h1>人物组件</h1><p>六个角色共享 CharacterButton、CharacterCard 和 CharacterEmptyState，不复制业务组件。</p></div>
        <div className="cl-docs-meta"><span className="cl-status-badge">● {characterPack.name}</span><span>v0.2.0</span></div>
      </header>

      <section className="cl-section">
        <div className="cl-section-heading"><div><span className="cl-section-index">01</span><h2>按主题选择角色</h2></div><p>选中角色时，全局主题会同步到该角色所属分组。</p></div>
        <div className="cl-character-theme-groups">
          {Object.values(themePresets).map((preset) => (
            <div className="cl-character-theme-group" key={preset.id}>
              <header><strong>{preset.name}</strong><span>{preset.tagline}</span></header>
              <div className="cl-character-selector">
                {preset.characterPackIds.map((packId) => {
                  const pack = characterPacks[packId];
                  return (
                    <button type="button" key={pack.id} className={characterPackId === pack.id ? 'is-active' : ''} onClick={() => selectCharacterPack(pack.id)}>
                      <img src={pack.assets.buttonAvatar} alt="" /><span><strong>{pack.name}</strong><small>{pack.description}</small></span>
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="cl-section">
        <div className="cl-section-heading"><div><span className="cl-section-index">02</span><h2>CharacterButton</h2></div><p>头像会自动聚焦角色面部，并继承每个角色自己的强调色。</p></div>
        <div className="cl-component-demo-row"><CharacterButton size="small">小尺寸</CharacterButton><CharacterButton>默认按钮</CharacterButton><CharacterButton size="large">主操作</CharacterButton><CharacterButton loading>加载状态</CharacterButton></div>
      </section>

      <section className="cl-section">
        <div className="cl-section-heading"><div><span className="cl-section-index">03</span><h2>CharacterCard</h2></div><p>完整角色图适合内容卡片、活动入口和规则说明。</p></div>
        <div className="cl-character-card-grid">
          {Object.keys(characterPacks).map((packId) => <CharacterCard key={packId} character={packId} layout="corner"><ExampleContent /></CharacterCard>)}
        </div>
      </section>

      <section className="cl-section">
        <div className="cl-section-heading"><div><span className="cl-section-index">04</span><h2>CharacterEmptyState</h2></div><p>用于暂无数据、搜索无结果和首次创建等低压力反馈场景。</p></div>
        <div className="cl-character-empty-grid">
          <CharacterEmptyState action={<Button size="small">创建第一项</Button>} />
          <CharacterEmptyState character={characterPackId === 'chengdu' ? 'xiaoyun' : 'chengdu'} title="没有搜索结果" description="换个关键词试试看，或者清除当前筛选。" action={<Button size="small" variant="secondary">清除筛选</Button>} />
        </div>
      </section>

      <section className="cl-section">
        <div className="cl-section-heading"><div><span className="cl-section-index">05</span><h2>使用方式</h2></div></div>
        <div className="cl-code-block"><pre><code>{`<CharacterButton>进入活动</CharacterButton>\n\n<CharacterCard layout="corner">\n  <YourContent />\n</CharacterCard>\n\n<CharacterEmptyState\n  title="还没有活动"\n  action={<Button>立即创建</Button>}\n/>`}</code></pre></div>
      </section>
    </article>
  );
}


export default CharacterComponentsDocs;
