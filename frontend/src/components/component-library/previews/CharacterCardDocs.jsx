import { useMemo, useState } from 'react';
import CharacterCard from '../../charactercard';


const characters = [
  { value: 'xiaoyun', label: '小云公主' },
  { value: 'birthday', label: '生日女孩' },
];

const layouts = [
  { value: 'corner', label: '边角' },
  { value: 'side', label: '侧边' },
  { value: 'watermark', label: '水印' },
];

const sizes = [
  { value: 'small', label: '小' },
  { value: 'medium', label: '中' },
  { value: 'large', label: '大' },
];

const propRows = [
  ['character', 'xiaoyun | birthday', 'xiaoyun', '选择人物图案与对应主题'],
  ['layout', 'corner | side | watermark', 'corner', '人物在卡片中的布局方式'],
  ['size', 'small | medium | large', 'medium', '控制卡片高度与人物比例'],
  ['imageSrc', 'string', '内置图片', '覆盖当前人物素材'],
  ['children', 'ReactNode', '—', '卡片内容区域，可保持为空'],
  ['selected', 'boolean', 'undefined', '交互卡片的选中状态'],
  ['disabled', 'boolean', 'false', '禁用交互卡片'],
  ['fullWidth', 'boolean', 'false', '移除默认最大宽度'],
  ['onClick', 'function', '—', '提供后将卡片转换为 button'],
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
      <span><strong>{label}</strong><small>{description}</small></span>
      <input
        type="checkbox"
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
      />
      <span className="cl-toggle" aria-hidden="true" />
    </label>
  );
}


function SampleCardContent() {
  return (
    <div className="cl-card-sample-content">
      <span>FEATURE CARD</span>
      <h3>这里可以放标题</h3>
      <p>按业务需要加入说明、数据或操作，人物区域会自动保留。</p>
      <button type="button">示例操作</button>
    </div>
  );
}


function CharacterCardDocs() {
  const [character, setCharacter] = useState('xiaoyun');
  const [layout, setLayout] = useState('corner');
  const [size, setSize] = useState('medium');
  const [showContent, setShowContent] = useState(false);
  const [interactive, setInteractive] = useState(false);
  const [selected, setSelected] = useState(false);
  const [copied, setCopied] = useState(false);

  const codeSnippet = useMemo(() => {
    const lines = [
      "import CharacterCard from '../components/charactercard';",
      '',
      '<CharacterCard',
      `  character="${character}"`,
      `  layout="${layout}"`,
      `  size="${size}"`,
    ];
    if (interactive) lines.push('  onClick={openDetails}');
    if (interactive && selected) lines.push('  selected');
    if (!showContent) {
      lines.push('/>');
      return lines.join('\n');
    }
    lines.push('>');
    lines.push('  <YourContent />');
    lines.push('</CharacterCard>');
    return lines.join('\n');
  }, [character, interactive, layout, selected, showContent, size]);

  const copyCode = async () => {
    await navigator.clipboard.writeText(codeSnippet);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1600);
  };

  return (
    <article className="cl-docs">
      <header className="cl-docs-header">
        <div>
          <div className="cl-kicker">LAYOUT · CONTENT CONTAINER</div>
          <h1>人物留白卡片</h1>
          <p>
            将两张人物图作为边角、侧边或淡水印装饰，主体区域保持空白，可承载标题、数据、表单或业务操作。
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
          <p>默认保持空白，打开示例内容后可检查实际排版空间。</p>
        </div>
        <div className="cl-workbench">
          <div className="cl-preview-canvas cl-preview-canvas--card">
            <div className="cl-preview-grid" aria-hidden="true" />
            <div className="cl-card-preview-result">
              <CharacterCard
                character={character}
                layout={layout}
                size={size}
                selected={interactive ? selected : undefined}
                onClick={interactive ? () => setSelected((value) => !value) : undefined}
                aria-label={showContent ? undefined : '空白人物装饰卡片'}
              >
                {showContent ? <SampleCardContent /> : null}
              </CharacterCard>
              <span>{showContent ? '示例内容已开启' : '当前内容区域为空白'}</span>
            </div>
          </div>
          <aside className="cl-controls" aria-label="人物卡片预览控制项">
            <SegmentedControl label="人物" options={characters} value={character} onChange={setCharacter} />
            <SegmentedControl label="布局" options={layouts} value={layout} onChange={setLayout} />
            <SegmentedControl label="尺寸" options={sizes} value={size} onChange={setSize} />
            <ToggleControl
              label="显示示例内容"
              description="检查真实内容排版"
              checked={showContent}
              onChange={setShowContent}
            />
            <ToggleControl
              label="启用卡片交互"
              description="转换为可点击按钮"
              checked={interactive}
              onChange={setInteractive}
            />
          </aside>
        </div>
      </section>

      <section className="cl-section">
        <div className="cl-section-heading">
          <div><span className="cl-section-index">02</span><h2>基础用法</h2></div>
          <p>不传 children 时就是一张纯装饰留白卡片。</p>
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
          <div><span className="cl-section-index">03</span><h2>空白卡片组合</h2></div>
          <p>两个人物各提供边角、侧边和水印三种留白方式。</p>
        </div>
        <div className="cl-card-blank-grid">
          {characters.flatMap((characterOption) => (
            layouts.map((layoutOption) => (
              <div className="cl-card-blank-item" key={`${characterOption.value}-${layoutOption.value}`}>
                <div>
                  <strong>{characterOption.label}</strong>
                  <span>{layoutOption.label}布局</span>
                </div>
                <CharacterCard
                  character={characterOption.value}
                  layout={layoutOption.value}
                  size="small"
                  aria-label={`${characterOption.label}${layoutOption.label}空白卡片`}
                />
              </div>
            ))
          ))}
        </div>
      </section>

      <section className="cl-section">
        <div className="cl-section-heading">
          <div><span className="cl-section-index">04</span><h2>Props</h2></div>
          <p>同一组件覆盖两个人物和三种布局，避免重复维护卡片实现。</p>
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
        <span className="cl-guideline-icon" aria-hidden="true">▱</span>
        <div>
          <h2>留白建议</h2>
          <p>边角布局适合标题和说明，侧边布局适合列表详情，水印布局适合数据和表单。内容不宜覆盖人物面部区域。</p>
        </div>
      </section>
    </article>
  );
}


export default CharacterCardDocs;
