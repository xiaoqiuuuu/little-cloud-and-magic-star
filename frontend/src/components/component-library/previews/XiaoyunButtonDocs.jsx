import { useMemo, useState } from 'react';
import XiaoyunButton, { XiaoyunButtonGroup } from '../../xiaoyunbutton';


const tones = [
  { value: 'sky', label: '天空蓝' },
  { value: 'rose', label: '甜心粉' },
  { value: 'violet', label: '星光紫' },
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
  ['eyebrow', 'ReactNode', '—', '位于标题上方的短标签'],
  ['tone', 'sky | rose | violet', 'sky', '按钮颜色主题'],
  ['size', 'small | medium | large', 'medium', '38 / 48 / 56px 三档高度'],
  ['selected', 'boolean', 'undefined', '启用可切换按钮语义'],
  ['loading', 'boolean', 'false', '展示加载状态并禁止点击'],
  ['disabled', 'boolean', 'false', '禁用按钮'],
  ['showArrow', 'boolean', 'true', '是否展示右侧动作图标'],
  ['fullWidth', 'boolean', 'false', '是否撑满父容器'],
  ['imageSrc', 'string', '内置图片', '替换左侧角色图案'],
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


function XiaoyunButtonDocs() {
  const [tone, setTone] = useState('sky');
  const [size, setSize] = useState('medium');
  const [state, setState] = useState('normal');
  const [showDetails, setShowDetails] = useState(true);
  const [fullWidth, setFullWidth] = useState(false);
  const [copied, setCopied] = useState(false);
  const [clickCount, setClickCount] = useState(0);

  const codeSnippet = useMemo(() => {
    const lines = [
      "import XiaoyunButton from '../components/xiaoyunbutton';",
      '',
      '<XiaoyunButton',
      `  tone="${tone}"`,
      `  size="${size}"`,
      '  label="进入梦幻舞台"',
    ];

    if (showDetails) {
      lines.push('  eyebrow="MAGIC STAGE"');
      lines.push('  description="和小云一起闪亮登场"');
    }
    if (state === 'selected') lines.push('  selected');
    if (state === 'loading') lines.push('  loading');
    if (state === 'disabled') lines.push('  disabled');
    if (fullWidth) lines.push('  fullWidth');
    lines.push('  onClick={handleClick}');
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
          <div className="cl-kicker">ACTIONS · 操作组件</div>
          <h1>小云图案按钮</h1>
          <p>
            在常规系统按钮中加入轻量角色识别图案，适合活动入口、特色操作和需要品牌感的主按钮。
          </p>
        </div>
        <div className="cl-docs-meta">
          <span className="cl-status-badge">● Stable</span>
          <span>v0.1.0</span>
        </div>
      </header>

      <section className="cl-section">
        <div className="cl-section-heading">
          <div>
            <span className="cl-section-index">01</span>
            <h2>交互预览</h2>
          </div>
          <p>调整参数，实时确认组件在系统中的尺寸与状态。</p>
        </div>

        <div className="cl-workbench">
          <div className="cl-preview-canvas">
            <div className="cl-preview-grid" aria-hidden="true" />
            <div className="cl-preview-result">
              <XiaoyunButton
                tone={tone}
                size={size}
                eyebrow={showDetails ? 'MAGIC STAGE' : undefined}
                label="进入梦幻舞台"
                description={showDetails ? '和小云一起闪亮登场' : undefined}
                fullWidth={fullWidth}
                onClick={() => setClickCount((count) => count + 1)}
                {...activeStateProps}
              />
              <span className="cl-preview-message" aria-live="polite">
                {clickCount > 0 ? `已点击 ${clickCount} 次` : '点击按钮试试看'}
              </span>
            </div>
          </div>

          <aside className="cl-controls" aria-label="按钮预览控制项">
            <SegmentedControl label="主题" options={tones} value={tone} onChange={setTone} />
            <SegmentedControl label="尺寸" options={sizes} value={size} onChange={setSize} />
            <SegmentedControl label="状态" options={states} value={state} onChange={setState} />
            <ToggleControl
              label="显示辅助信息"
              description="Eyebrow 与描述文字"
              checked={showDetails}
              onChange={setShowDetails}
            />
            <ToggleControl
              label="撑满容器"
              description="适合移动端主操作"
              checked={fullWidth}
              onChange={setFullWidth}
            />
          </aside>
        </div>
      </section>

      <section className="cl-section">
        <div className="cl-section-heading">
          <div>
            <span className="cl-section-index">02</span>
            <h2>基础用法</h2>
          </div>
          <p>组件默认使用中等尺寸和天空蓝主题。</p>
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
          <div>
            <span className="cl-section-index">03</span>
            <h2>组件矩阵</h2>
          </div>
          <p>用统一示例快速检查不同尺寸、主题和状态。</p>
        </div>

        <div className="cl-example-grid">
          <div className="cl-example-card cl-example-card--wide">
            <div className="cl-example-title">
              <strong>尺寸</strong>
              <span>Small / Medium / Large</span>
            </div>
            <XiaoyunButtonGroup>
              <XiaoyunButton size="small" label="小尺寸" />
              <XiaoyunButton size="medium" label="中尺寸" description="默认推荐" />
              <XiaoyunButton size="large" label="大尺寸" description="适合主操作" />
            </XiaoyunButtonGroup>
          </div>

          <div className="cl-example-card">
            <div className="cl-example-title">
              <strong>主题</strong>
              <span>与页面语义匹配</span>
            </div>
            <div className="cl-example-stack">
              <XiaoyunButton tone="sky" label="天空蓝" />
              <XiaoyunButton tone="rose" label="甜心粉" />
              <XiaoyunButton tone="violet" label="星光紫" />
            </div>
          </div>

          <div className="cl-example-card">
            <div className="cl-example-title">
              <strong>状态</strong>
              <span>提供明确操作反馈</span>
            </div>
            <div className="cl-example-stack">
              <XiaoyunButton label="已选择" selected />
              <XiaoyunButton label="正在加载" loading />
              <XiaoyunButton label="暂不可用" disabled />
            </div>
          </div>
        </div>
      </section>

      <section className="cl-section">
        <div className="cl-section-heading">
          <div>
            <span className="cl-section-index">04</span>
            <h2>Props</h2>
          </div>
          <p>保持 API 简单，让业务页面按需组合。</p>
        </div>
        <div className="cl-props-table-wrap">
          <table className="cl-props-table">
            <thead>
              <tr>
                <th>属性</th>
                <th>类型</th>
                <th>默认值</th>
                <th>说明</th>
              </tr>
            </thead>
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
        <span className="cl-guideline-icon" aria-hidden="true">♢</span>
        <div>
          <h2>使用建议</h2>
          <p>
            同一区域建议只使用一个带角色图案的主按钮，普通次级操作继续使用基础按钮，避免插画元素过多影响信息层级。
          </p>
        </div>
      </section>
    </article>
  );
}


export default XiaoyunButtonDocs;
