import { Link, useParams } from 'react-router-dom';
import ComponentLibraryShell from '../components/component-library/ComponentLibraryShell';
import { componentCatalog, componentGroups, getComponentById } from '../components/component-library/catalog';
import XiaoyunButtonDocs from '../components/component-library/previews/XiaoyunButtonDocs';
import ShengriButtonDocs from '../components/component-library/previews/ShengriButtonDocs';


const readyComponents = componentCatalog.filter((item) => item.status === 'ready');
const plannedComponents = componentCatalog.filter((item) => item.status === 'planned');


function ComponentLibraryOverview() {
  return (
    <div className="cl-overview">
      <section className="cl-overview-hero">
        <div className="cl-overview-copy">
          <span className="cl-kicker">LITTLE CLOUD DESIGN SYSTEM</span>
          <h1>把可爱的视觉语言，整理成可复用的系统组件。</h1>
          <p>
            Cloud UI 是项目内部的自定义组件工作台，用来集中预览、调试和记录组件 API，方便后续持续补充新的界面能力。
          </p>
          <div className="cl-overview-actions">
            <Link className="cl-primary-link" to="/components/xiaoyun-button">
              查看第一个组件
              <span aria-hidden="true">→</span>
            </Link>
            <a className="cl-secondary-link" href="#extension-guide">如何新增组件</a>
          </div>
        </div>
        <div className="cl-overview-orbit" aria-hidden="true">
          <div className="cl-orbit-core">✦</div>
          <span className="cl-orbit-item cl-orbit-item--one">UI</span>
          <span className="cl-orbit-item cl-orbit-item--two">Aa</span>
          <span className="cl-orbit-item cl-orbit-item--three">◉</span>
        </div>
      </section>

      <section className="cl-stat-grid" aria-label="组件库统计">
        <div className="cl-stat-card">
          <strong>{readyComponents.length}</strong>
          <span>可用组件</span>
        </div>
        <div className="cl-stat-card">
          <strong>{componentGroups.length}</strong>
          <span>组件分类</span>
        </div>
        <div className="cl-stat-card">
          <strong>{plannedComponents.length}</strong>
          <span>规划组件</span>
        </div>
        <div className="cl-stat-card">
          <strong>React 18</strong>
          <span>当前技术栈</span>
        </div>
      </section>

      <section className="cl-overview-section">
        <div className="cl-section-heading">
          <div>
            <span className="cl-section-index">01</span>
            <h2>组件地图</h2>
          </div>
          <p>已完成的组件可以进入详情页，规划项为后续扩展预留位置。</p>
        </div>
        <div className="cl-catalog-grid">
          {componentCatalog.map((item) => (
            item.status === 'ready' ? (
              <Link className="cl-catalog-card" to={`/components/${item.id}`} key={item.id}>
                <span className="cl-catalog-icon" aria-hidden="true">{item.icon}</span>
                <span className="cl-catalog-card-copy">
                  <span className="cl-catalog-status is-ready">Ready</span>
                  <strong>{item.name}</strong>
                  <small>{item.shortName}</small>
                  <p>{item.description}</p>
                </span>
                <span className="cl-catalog-arrow" aria-hidden="true">↗</span>
              </Link>
            ) : (
              <div className="cl-catalog-card is-planned" key={item.id}>
                <span className="cl-catalog-icon" aria-hidden="true">{item.icon}</span>
                <span className="cl-catalog-card-copy">
                  <span className="cl-catalog-status">Planned</span>
                  <strong>{item.name}</strong>
                  <small>{item.shortName}</small>
                  <p>{item.description}</p>
                </span>
              </div>
            )
          ))}
        </div>
      </section>

      <section className="cl-overview-section" id="extension-guide">
        <div className="cl-section-heading">
          <div>
            <span className="cl-section-index">02</span>
            <h2>新增组件流程</h2>
          </div>
          <p>保持实现、展示和文档彼此独立，后续维护会更轻松。</p>
        </div>
        <div className="cl-step-grid">
          <div className="cl-step-card">
            <span>1</span>
            <strong>创建组件</strong>
            <p>在 components 下建立独立目录，收拢实现、样式和资源。</p>
          </div>
          <div className="cl-step-card">
            <span>2</span>
            <strong>登记目录</strong>
            <p>在 component-library/catalog.js 中补充名称、分类和状态。</p>
          </div>
          <div className="cl-step-card">
            <span>3</span>
            <strong>编写预览</strong>
            <p>新增 previews 文档面板，覆盖交互、示例和 Props API。</p>
          </div>
        </div>
      </section>
    </div>
  );
}


function UnknownComponent({ componentId }) {
  return (
    <div className="cl-not-found">
      <span aria-hidden="true">☁</span>
      <h1>暂时没有这个组件</h1>
      <p>目录中找不到 “{componentId}”，它可能还没有登记或已经更名。</p>
      <Link to="/components">返回组件总览</Link>
    </div>
  );
}


function ComponentLibraryPage() {
  const { componentId } = useParams();
  const activeId = componentId || 'overview';
  const activeComponent = componentId ? getComponentById(componentId) : null;

  let pageContent = <ComponentLibraryOverview />;
  if (componentId === 'xiaoyun-button') pageContent = <XiaoyunButtonDocs />;
  if (componentId === 'shengri-button') pageContent = <ShengriButtonDocs />;
  if (componentId && (!activeComponent || activeComponent.status !== 'ready')) {
    pageContent = <UnknownComponent componentId={componentId} />;
  }

  return (
    <ComponentLibraryShell activeId={activeId}>
      {pageContent}
    </ComponentLibraryShell>
  );
}


export default ComponentLibraryPage;
