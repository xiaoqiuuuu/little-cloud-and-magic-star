import { useState } from 'react';
import { Input } from '../../../ui';


function InputDocs() {
  const [value, setValue] = useState('');

  return (
    <article className="cl-docs">
      <header className="cl-docs-header">
        <div><div className="cl-kicker">GENERAL · FORM</div><h1>Input 输入框</h1><p>统一标签、辅助信息、前后缀、尺寸和校验状态，作为后续表单组件的基础。</p></div>
        <div className="cl-docs-meta"><span className="cl-status-badge">● Stable</span><span>v0.2.0</span></div>
      </header>

      <section className="cl-section">
        <div className="cl-section-heading"><div><span className="cl-section-index">01</span><h2>基础输入</h2></div><p>输入框自动跟随全局主题与颜色模式。</p></div>
        <div className="cl-input-demo-panel">
          <Input label="活动名称" placeholder="请输入活动名称" value={value} onChange={(event) => setValue(event.target.value)} helperText={`已输入 ${value.length} 个字符`} prefix="✦" />
        </div>
      </section>

      <section className="cl-section">
        <div className="cl-section-heading"><div><span className="cl-section-index">02</span><h2>状态与尺寸</h2></div></div>
        <div className="cl-form-demo-grid">
          <Input size="small" label="小尺寸" placeholder="Small" />
          <Input size="medium" label="默认尺寸" placeholder="Medium" />
          <Input size="large" label="大尺寸" placeholder="Large" />
          <Input label="错误状态" defaultValue="错误内容" error="请输入正确的内容" />
          <Input label="成功状态" defaultValue="验证通过" status="success" helperText="内容有效" suffix="✓" />
          <Input label="禁用状态" defaultValue="暂不可修改" disabled />
        </div>
      </section>

      <section className="cl-section">
        <div className="cl-section-heading"><div><span className="cl-section-index">03</span><h2>基础用法</h2></div></div>
        <div className="cl-code-block"><pre><code>{`<Input\n  label="活动名称"\n  placeholder="请输入活动名称"\n  helperText="最多 30 个字符"\n/>`}</code></pre></div>
      </section>
    </article>
  );
}


export default InputDocs;
