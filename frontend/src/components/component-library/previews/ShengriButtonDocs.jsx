import { useMemo, useState } from 'react';
import ShengriButton from '../../shengributton';


const tones = [
  { value: 'blush', label: '云霞粉' },
  { value: 'champagne', label: '香槟金' },
  { value: 'berry', label: '莓果紫' },
];

const sizes = [
  { value: 'small', label: '小' },
  { value: 'medium', label: '中' },
  { value: 'large', label: '大' },
];

const states = [
  { value: 'normal', label: '默认' },
  { value: 'selected', label: '选中' },
  { value: 'loading', label: '加载' },
  { value: 'disabled', label: '禁用' },
];

const propRows = [
  ['label', 'ReactNode', '—', '按钮主文字，必填'],
  ['description', 'ReactNode', '—', '辅助说明，小尺寸下自动隐藏'],
  ['eyebrow', 'ReactNode', '—', '生日主题短标签'],
  ['tone', 'blush | champagne | berry', 'blush', '按钮颜色主题'],
  ['size', 'small | medium | large', 'medium', '38 / 48 / 56px 三档高度'],
  ['selected', 'boolean', 'undefined', '启用选中态和可切换语义'],
  ['loading', 'boolean', 'false', '展示加载动画并禁止点击'],
  ['disabled', 'boolean', 'false', '禁用按钮'],
  ['showSparkle', 'boolean', 'true', '是否展示右侧星光图标'],
  ['fullWidth', 'boolean', 'false', '是否撑满父容器'],
  ['imageSrc', 'string', '内置图片', '替换左侧生日人物图案'],
  ['onClick', 'function', '—', '点击回调'],
];


function SegmentedControl({ label, options, value, onChange }) {
  return (
    <div className="cl-control-group">
      <span className="cl-control-label">{label}</span>
      <div className="cl-segmented">
        {options.map((option) => (
          <button
            type="button"
            key={option.value}
            className={value === option.value ? 'is-active' : ''}
            onClick={() => onChange(option.value)}
          >
            {option.label}
          </button>
        ))}
      </div>
    </div>
  );
}


function ToggleControl({ checked, label, description, onChange }) {
  return (
    <label className="cl-toggle-row">
      <span>
        <strong>{label}</strong>
        <small>{description}</small>
      </span>
      <input
        type="checkbox"
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
      />
      <span className="cl-toggle" aria-hidden="true" />
    </label>
  );
}


function ShengriButtonDocs() {
  const [tone, setTone] = useState('blush');
  const [size, setSize] = useState('medium');
  const [state, setState] = useState('normal');
  const [showDetails, setShowDetails] = useState(true);
  const [fullWidth, setFullWidth] = useState(false);
  const [copied, setCopied] = useState(false);
  const [clickCount, setClickCount] = useState(0);

  const codeSnippet = useMemo(() => {
    const lines = [
      "import ShengriButton from '../components/shengributton';",
      '',
      '<ShengriButton',
      `  tone="${tone}"`,
      `  size="${size}"`,
      '  label="送上生日祝福"',
    ];
    if (showDetails) {
      lines.push('  eyebrow="HAPPY BIRTHDAY"');
      lines.push('  description="为今天的主角送上祝福"');
    }
    if (state === 'selected') lines.push('  selected');
    if (state === 'loading') lines.push('  loading');
    if (state === 'disabled') lines.push('  disabled');
    if (fullWidth) lines.push('  fullWidth');
    lines.push('  onClick={sendBirthdayWish}');
    lines.push('/>');
    return lines.join('\n');
  }, [fullWidth, showDetails, size, state, tone]);

  const copyCode = async () => {
    await navigator.clipboard.writeText(codeSnippet);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1600);
  };

  const activeStateProps = {
    selected: state === 'selected' ? true : undefined,
    loading: state === 'loading',
    disabled: state === 'disabled',
  };

  return (
    <article className="cl-docs">
      <header className="cl-docs-header">
        <div>
          <div className="cl-kicker">ACTIONS · CELEBRATION</div>
          <h1>生日庆祝按钮</h1>
          <p>
            使用圆形人物肖像、彩屑和柔和庆祝配色，适合生日祝福、纪念日活动、礼物领取等特色操作。
          </p>
        </div>
        <div className="cl-docs-meta">
          <span className="cl-status-badge">● Stable</span>
          <span>v0.1.0</span>
        </div>
      </header>

      <section className="cl-section">
        <div className="cl-section-heading">
          <div><span className="cl-section-index">01</span><h2>交互预览</h2></div>
          <p>在系统按钮尺寸内保留生日人物与庆祝氛围。</p>
        </div>
        <div className="cl-workbench">
          <div className="cl-preview-canvas cl-preview-canvas--birthday">
            <div className="cl-preview-grid" aria-hidden="true" />
            <div className="cl-preview-result">
              <ShengriButton
                tone={tone}
                size={size}
                eyebrow={showDetails ? 'HAPPY BIRTHDAY' : undefined}
                label="送上生日祝福"
                description={showDetails ? '为今天的主角送上祝福' : undefined}
                fullWidth={fullWidth}
                onClick={() => setClickCount((count) => count + 1)}
                {...activeStateProps}
              />
              <span className="cl-preview-message" aria-live="polite">
                {clickCount > 0 ? `已送出 ${clickCount} 份祝福` : '点击按钮送出祝福'}
              </span>
            </div>
          </div>
          <aside className="cl-controls" aria-label="生日按钮预览控制项">
            <SegmentedControl label="主题" options={tones} value={tone} onChange={setTone} />
            <SegmentedControl label="尺寸" options={sizes} value={size} onChange={setSize} />
            <SegmentedControl label="状态" options={states} value={state} onChange={setState} />
            <ToggleControl
              label="显示辅助信息"
              description="生日标签与描述文字"
              checked={showDetails}
              onChange={setShowDetails}
            />
            <ToggleControl
              label="撑满容器"
              description="适合移动端祝福入口"
              checked={fullWidth}
              onChange={setFullWidth}
            />
          </aside>
        </div>
      </section>

      <section className="cl-section">
        <div className="cl-section-heading">
          <div><span className="cl-section-index">02</span><h2>基础用法</h2></div>
          <p>默认云霞粉主题与中等尺寸适合大部分活动页面。</p>
        </div>
        <div className="cl-code-block">
          <div className="cl-code-toolbar">
            <span>JSX</span>
            <button type="button" onClick={copyCode}>{copied ? '已复制 ✓' : '复制代码'}</button>
          </div>
          <pre><code>{codeSnippet}</code></pre>
        </div>
      </section>

      <section className="cl-section">
        <div className="cl-section-heading">
          <div><span className="cl-section-index">03</span><h2>视觉组合</h2></div>
          <p>三套颜色分别对应甜美、温暖和浪漫的庆祝场景。</p>
        </div>
        <div className="cl-example-grid">
          <div className="cl-example-card cl-example-card--wide">
            <div className="cl-example-title"><strong>主题</strong><span>Blush / Champagne / Berry</span></div>
            <div className="cl-example-stack">
              <ShengriButton tone="blush" label="生日祝福" description="云霞粉" />
              <ShengriButton tone="champagne" label="领取礼物" description="香槟金" />
              <ShengriButton tone="berry" label="点亮心愿" description="莓果紫" />
            </div>
          </div>
          <div className="cl-example-card">
            <div className="cl-example-title"><strong>尺寸</strong><span>适配不同密度</span></div>
            <div className="cl-example-stack">
              <ShengriButton size="small" label="小尺寸" />
              <ShengriButton size="medium" label="中尺寸" />
              <ShengriButton size="large" label="大尺寸" />
            </div>
          </div>
          <div className="cl-example-card">
            <div className="cl-example-title"><strong>状态</strong><span>完整操作反馈</span></div>
            <div className="cl-example-stack">
              <ShengriButton label="已送出" selected />
              <ShengriButton label="发送祝福" loading />
              <ShengriButton label="活动未开始" disabled />
            </div>
          </div>
        </div>
      </section>

      <section className="cl-section">
        <div className="cl-section-heading">
          <div><span className="cl-section-index">04</span><h2>Props</h2></div>
          <p>API 与小云按钮保持相近，业务切换成本更低。</p>
        </div>
        <div className="cl-props-table-wrap">
          <table className="cl-props-table">
            <thead><tr><th>属性</th><th>类型</th><th>默认值</th><th>说明</th></tr></thead>
            <tbody>
              {propRows.map(([name, type, defaultValue, description]) => (
                <tr key={name}>
                  <td><code>{name}</code></td>
                  <td>{type}</td>
                  <td><code>{defaultValue}</code></td>
                  <td>{description}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="cl-guideline-card">
        <span className="cl-guideline-icon" aria-hidden="true">✦</span>
        <div>
          <h2>使用建议</h2>
          <p>生日按钮适合作为活动页的特色主操作。同一操作区避免和小云按钮同时作为主按钮，以保持清晰的视觉重点。</p>
        </div>
      </section>
    </article>
  );
}


export default ShengriButtonDocs;
