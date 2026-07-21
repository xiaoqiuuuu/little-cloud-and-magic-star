import { Card, Statistic, Tag } from '../../../ui';


function DataDisplayDocs() {
  return (
    <article className="cl-docs">
      <header className="cl-docs-header">
        <div><div className="cl-kicker">DATA DISPLAY · STATUS</div><h1>标签与统计</h1><p>覆盖后台列表、账号状态、活动统计和内容分类等高频展示场景。</p></div>
        <div className="cl-docs-meta"><span className="cl-status-badge">● Ready</span><span>v0.2.0</span></div>
      </header>

      <section className="cl-section">
        <div className="cl-section-heading"><div><span className="cl-section-index">01</span><h2>Tag</h2></div><p>语义色由主题提供，避免业务页面自行维护色值。</p></div>
        <div className="cl-component-demo-stack">
          <div className="cl-component-demo-row cl-component-demo-row--nested">
            <Tag>默认</Tag><Tag tone="primary">主题</Tag><Tag tone="info">信息</Tag><Tag tone="success">启用</Tag><Tag tone="warning">待确认</Tag><Tag tone="danger">已停止</Tag>
          </div>
          <div className="cl-component-demo-row cl-component-demo-row--nested">
            <Tag tone="primary" variant="outlined">描边</Tag><Tag tone="success" variant="solid">完成</Tag><Tag tone="warning" icon="✦">重要</Tag><Tag tone="danger" closable>筛选条件</Tag>
          </div>
        </div>
      </section>

      <section className="cl-section">
        <div className="cl-section-heading"><div><span className="cl-section-index">02</span><h2>Statistic</h2></div><p>适合活动概览、访问统计和操作次数。</p></div>
        <div className="cl-statistic-demo-grid">
          <Statistic label="活动题目" value="36" suffix="道" />
          <Statistic label="今日参与" value="1,286" suffix="人" trend="较昨日 +18%" trendDirection="up" emphasis />
          <Statistic label="答题正确率" value="84.6" suffix="%" trend="较上周 +2.4%" trendDirection="up" />
          <Statistic label="待处理内容" value="7" trend="需要关注" trendDirection="down" />
        </div>
      </section>

      <section className="cl-section">
        <div className="cl-section-heading"><div><span className="cl-section-index">03</span><h2>组合示例</h2></div></div>
        <Card title="活动概览" extra={<Tag tone="success">进行中</Tag>}>
          <div className="cl-statistic-demo-grid is-compact">
            <Statistic label="题目" value="36" suffix="道" />
            <Statistic label="参与" value="1,286" suffix="人" />
          </div>
        </Card>
      </section>
    </article>
  );
}


export default DataDisplayDocs;
