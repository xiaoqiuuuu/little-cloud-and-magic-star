import princessArtwork from './nb-4.png';
import './XiaoyunButton.css';


const supportedTones = new Set(['sky', 'rose', 'violet']);
const supportedSizes = new Set(['small', 'medium', 'large']);


function classNames(...names) {
  return names.filter(Boolean).join(' ');
}


function XiaoyunButton({
  label,
  description,
  eyebrow,
  imageSrc = princessArtwork,
  tone = 'sky',
  size = 'medium',
  selected,
  loading = false,
  disabled = false,
  showArrow = true,
  fullWidth = false,
  className = '',
  ...buttonProps
}) {
  const buttonTone = supportedTones.has(tone) ? tone : 'sky';
  const buttonSize = supportedSizes.has(size) ? size : 'medium';
  const hasPressedState = typeof selected === 'boolean';
  const isDisabled = disabled || loading;

  return (
    <button
      type="button"
      className={classNames(
        'xiaoyun-button',
        `xiaoyun-button--${buttonTone}`,
        `xiaoyun-button--${buttonSize}`,
        selected && 'is-selected',
        loading && 'is-loading',
        fullWidth && 'xiaoyun-button--full-width',
        className,
      )}
      aria-pressed={hasPressedState ? selected : undefined}
      aria-busy={loading || undefined}
      disabled={isDisabled}
      {...buttonProps}
    >
      <span className="xiaoyun-button__surface" aria-hidden="true" />

      <span className="xiaoyun-button__artwork" aria-hidden="true">
        <span className="xiaoyun-button__halo" />
        <span className="xiaoyun-button__bubble xiaoyun-button__bubble--one" />
        <span className="xiaoyun-button__bubble xiaoyun-button__bubble--two" />
        <img src={imageSrc} alt="" draggable="false" />
      </span>

      <span className="xiaoyun-button__copy">
        {eyebrow && <span className="xiaoyun-button__eyebrow">{eyebrow}</span>}
        <span className="xiaoyun-button__label">
          {loading ? '正在施展魔法…' : label}
        </span>
        {description && (
          <span className="xiaoyun-button__description">{description}</span>
        )}
      </span>

      {showArrow && (
        <span className="xiaoyun-button__action" aria-hidden="true">
          {selected ? '✓' : '›'}
        </span>
      )}
    </button>
  );
}


export function XiaoyunButtonGroup({ children, className = '', label = '功能入口' }) {
  return (
    <div
      className={classNames('xiaoyun-button-group', className)}
      role="group"
      aria-label={label}
    >
      {children}
    </div>
  );
}


export default XiaoyunButton;
