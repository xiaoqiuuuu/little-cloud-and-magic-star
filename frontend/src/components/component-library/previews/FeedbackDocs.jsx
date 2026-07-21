import { Alert, Button, CharacterEmptyState, EmptyState } from '../../../ui';


function FeedbackDocs() {
  return (
    <article className="cl-docs">
      <header className="cl-docs-header">
        <div><div className="cl-kicker">FEEDBACK · STATES</div><h1>提示与空状态</h1><p>用于保存结果、风险提示、无数据和首次使用等场景。</p></div>
        <div className="cl-docs-meta"><span className="cl-status-badge">● Ready</span><span>v0.2.0</span></div>
      </header>

      <section className="cl-section">
        <div className="cl-section-heading"><div><span className="cl-section-index">01</span><h2>Alert</h2></div><p>支持 info、success、warning、error 和可关闭状态。</p></div>
        <div className="cl-alert-demo-stack">
          <Alert type="info" title="活动配置提示" description="发布前请确认活动时间和题目列表。" />
          <Alert type="success" title="保存成功" description="最新设置已经同步到活动页面。" />
          <Alert type="warning" title="仍有未完成项目" description="有 3 道题目还没有填写答案。" action={<Button size="small" variant="secondary">查看</Button>} />
          <Alert type="error" title="活动无法发布" description="开始时间不能早于当前时间。" closable />
        </div>
      </section>

      <section className="cl-section">
        <div className="cl-section-heading"><div><span className="cl-section-index">02</span><h2>EmptyState</h2></div><p>基础空状态不依赖人物素材，适合后台工具和通用页面。</p></div>
        <div className="cl-empty-demo-grid">
          <EmptyState title="还没有活动" description="创建活动后，可以在这里管理题目和现场数据。" action={<Button size="small">创建活动</Button>} />
          <EmptyState icon="⌕" title="没有搜索结果" description="尝试减少筛选条件或更换关键词。" action={<Button size="small" variant="secondary">清除筛选</Button>} />
        </div>
      </section>

      <section className="cl-section">
        <div className="cl-section-heading"><div><span className="cl-section-index">03</span><h2>人物空状态</h2></div><p>全局角色变化时只替换插画与角色强调色。</p></div>
        <CharacterEmptyState action={<Button size="small">添加第一项</Button>} />
      </section>
    </article>
  );
}


export default FeedbackDocs;
