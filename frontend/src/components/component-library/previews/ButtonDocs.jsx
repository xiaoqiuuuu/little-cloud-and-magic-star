import { useState } from 'react';
import { Button } from '../../../ui';


const variants = ['primary', 'secondary', 'soft', 'ghost', 'danger'];
const sizes = ['small', 'medium', 'large'];


function ButtonDocs() {
  const [variant, setVariant] = useState('primary');
  const [size, setSize] = useState('medium');
  const [loading, setLoading] = useState(false);

  return (
    <article className="cl-docs">
      <header className="cl-docs-header">
        <div><div className="cl-kicker">GENERAL · ACTION</div><h1>Button 按钮</h1><p>所有业务按钮的基础实现，人物按钮也建立在它的尺寸、状态和交互规范之上。</p></div>
        <div className="cl-docs-meta"><span className="cl-status-badge">● Stable</span><span>v0.1.0</span></div>
      </header>

      <section className="cl-section">
        <div className="cl-section-heading"><div><span className="cl-section-index">01</span><h2>交互预览</h2></div><p>颜色会跟随顶部全局主题实时变化。</p></div>
        <div className="cl-base-workbench">
          <div className="cl-base-preview"><Button variant={variant} size={size} loading={loading}>保存修改</Button></div>
          <div className="cl-base-controls">
            <label><span>外观</span><select value={variant} onChange={(event) => setVariant(event.target.value)}>{variants.map((item) => <option key={item}>{item}</option>)}</select></label>
            <label><span>尺寸</span><select value={size} onChange={(event) => setSize(event.target.value)}>{sizes.map((item) => <option key={item}>{item}</option>)}</select></label>
            <label className="cl-base-check"><input type="checkbox" checked={loading} onChange={(event) => setLoading(event.target.checked)} />加载状态</label>
          </div>
        </div>
      </section>

      <section className="cl-section">
        <div className="cl-section-heading"><div><span className="cl-section-index">02</span><h2>外观</h2></div><p>语义优先，避免业务页面自行定义按钮颜色。</p></div>
        <div className="cl-component-demo-row">{variants.map((item) => <Button key={item} variant={item}>{item}</Button>)}</div>
      </section>

      <section className="cl-section">
        <div className="cl-section-heading"><div><span className="cl-section-index">03</span><h2>尺寸与状态</h2></div><p>统一使用 small、medium、large。</p></div>
        <div className="cl-example-grid">
          <div className="cl-example-card"><div className="cl-example-title"><strong>尺寸</strong><span>32 / 40 / 48px</span></div><div className="cl-component-demo-row">{sizes.map((item) => <Button key={item} size={item}>{item}</Button>)}</div></div>
          <div className="cl-example-card"><div className="cl-example-title"><strong>状态</strong><span>loading / disabled / block</span></div><div className="cl-component-demo-stack"><Button loading>保存中</Button><Button disabled>不可用</Button><Button block>撑满容器</Button></div></div>
        </div>
      </section>

      <section className="cl-section">
        <div className="cl-section-heading"><div><span className="cl-section-index">04</span><h2>基础用法</h2></div></div>
        <div className="cl-code-block"><pre><code>{`<Button variant="primary" size="medium" loading={false}>\n  保存修改\n</Button>`}</code></pre></div>
      </section>
    </article>
  );
}


export default ButtonDocs;
