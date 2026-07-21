import { useState } from 'react';
import { Button, Input, Select, Switch } from '../../../ui';


function SelectionControlsDocs() {
  const [theme, setTheme] = useState('aurora');
  const [published, setPublished] = useState(true);

  return (
    <article className="cl-docs">
      <header className="cl-docs-header">
        <div><div className="cl-kicker">DATA ENTRY · CONTROLS</div><h1>选择与开关</h1><p>Select 和 Switch 延续 Input 的尺寸、校验和无障碍约定。</p></div>
        <div className="cl-docs-meta"><span className="cl-status-badge">● Ready</span><span>v0.2.0</span></div>
      </header>

      <section className="cl-section">
        <div className="cl-section-heading"><div><span className="cl-section-index">01</span><h2>活动设置示例</h2></div><p>对应项目里常见的活动主题、状态和公开开关。</p></div>
        <div className="cl-settings-demo">
          <Input label="活动名称" defaultValue="2026 夏日现场答题" helperText="最多 100 个字符" />
          <Select
            label="视觉主题"
            value={theme}
            onChange={(event) => setTheme(event.target.value)}
            options={[
              { value: 'aurora', label: '星海舞台' },
              { value: 'celebration', label: '糖果庆典' },
            ]}
          />
          <Switch checked={published} onChange={setPublished} label="公开活动" description="允许访问者在首页看到这个活动" />
          <Button block>保存设置</Button>
        </div>
      </section>

      <section className="cl-section">
        <div className="cl-section-heading"><div><span className="cl-section-index">02</span><h2>尺寸与状态</h2></div></div>
        <div className="cl-form-demo-grid">
          <Select size="small" label="小尺寸" defaultValue="draft" options={[{ value: 'draft', label: '草稿' }]} />
          <Select size="large" label="大尺寸" defaultValue="published" options={[{ value: 'published', label: '已发布' }]} />
          <Select label="错误状态" defaultValue="" error="请选择活动状态" placeholder="请选择" options={[{ value: 'ready', label: '就绪' }]} />
          <Select label="禁用状态" defaultValue="locked" disabled options={[{ value: 'locked', label: '已锁定' }]} />
        </div>
        <div className="cl-component-demo-row cl-component-demo-row--switches">
          <Switch size="small" defaultChecked label="小尺寸" />
          <Switch defaultChecked label="默认尺寸" />
          <Switch label="关闭状态" />
          <Switch disabled label="禁用状态" />
        </div>
      </section>

      <section className="cl-section">
        <div className="cl-section-heading"><div><span className="cl-section-index">03</span><h2>使用方式</h2></div></div>
        <div className="cl-code-block"><pre><code>{`<Select\n  label="活动状态"\n  options={[{ value: 'active', label: '进行中' }]}\n/>\n\n<Switch\n  checked={enabled}\n  onChange={setEnabled}\n  label="启用活动"\n/>`}</code></pre></div>
      </section>
    </article>
  );
}


export default SelectionControlsDocs;
