import { Button, Card } from '../../../ui';


function CardContent({ title = '卡片标题' }) {
  return <div className="cl-card-content-demo"><strong>{title}</strong><p>这里可以放说明文字、数据、表单或其他业务组件。</p></div>;
}


function CardDocs() {
  return (
    <article className="cl-docs">
      <header className="cl-docs-header">
        <div><div className="cl-kicker">GENERAL · CONTAINER</div><h1>Card 卡片</h1><p>通用内容容器。人物卡片在它的边框、圆角、阴影和交互规范之上增加装饰资源。</p></div>
        <div className="cl-docs-meta"><span className="cl-status-badge">● Stable</span><span>v0.1.0</span></div>
      </header>

      <section className="cl-section">
        <div className="cl-section-heading"><div><span className="cl-section-index">01</span><h2>外观</h2></div><p>Outlined、Elevated、Soft 三种基础层级。</p></div>
        <div className="cl-card-demo-grid">
          <Card variant="outlined"><CardContent title="描边卡片" /></Card>
          <Card variant="elevated"><CardContent title="浮层卡片" /></Card>
          <Card variant="soft"><CardContent title="柔和卡片" /></Card>
        </div>
      </section>

      <section className="cl-section">
        <div className="cl-section-heading"><div><span className="cl-section-index">02</span><h2>结构与交互</h2></div></div>
        <div className="cl-card-demo-grid">
          <Card title="带标题的卡片" extra="更多" footer={<Button size="small">确认</Button>}><CardContent /></Card>
          <Card onClick={() => {}} title="可点击卡片" extra="↗"><CardContent title="点击整个区域" /></Card>
        </div>
      </section>

      <section className="cl-section">
        <div className="cl-section-heading"><div><span className="cl-section-index">03</span><h2>基础用法</h2></div></div>
        <div className="cl-code-block"><pre><code>{`<Card variant="elevated" title="卡片标题" footer={<Button>确认</Button>}>\n  卡片内容\n</Card>`}</code></pre></div>
      </section>
    </article>
  );
}


export default CardDocs;
