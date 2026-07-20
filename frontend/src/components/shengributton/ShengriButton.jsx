import birthdayArtwork from './tj-4.png';
import './ShengriButton.css';


const supportedTones = new Set(['blush', 'champagne', 'berry']);
const supportedSizes = new Set(['small', 'medium', 'large']);


function classNames(...names) {
  return names.filter(Boolean).join(' ');
}


function ShengriButton({
  label,
  description,
  eyebrow,
  imageSrc = birthdayArtwork,
  tone = 'blush',
  size = 'medium',
  selected,
  loading = false,
  disabled = false,
  fullWidth = false,
  showSparkle = true,
  className = '',
  ...buttonProps
}) {
  const buttonTone = supportedTones.has(tone) ? tone : 'blush';
  const buttonSize = supportedSizes.has(size) ? size : 'medium';
  const hasPressedState = typeof selected === 'boolean';
  const isDisabled = disabled || loading;

  return (
    <button
      type="button"
      className={classNames(
        'shengri-button',
        `shengri-button--${buttonTone}`,
        `shengri-button--${buttonSize}`,
        selected && 'is-selected',
        loading && 'is-loading',
        fullWidth && 'shengri-button--full-width',
        className,
      )}
      aria-pressed={hasPressedState ? selected : undefined}
      aria-busy={loading || undefined}
      disabled={isDisabled}
      {...buttonProps}
    >
      <span className="shengri-button__surface" aria-hidden="true" />
      <span className="shengri-button__confetti" aria-hidden="true">
        <i className="shengri-button__confetti-dot shengri-button__confetti-dot--one" />
        <i className="shengri-button__confetti-dot shengri-button__confetti-dot--two" />
        <i className="shengri-button__confetti-dot shengri-button__confetti-dot--three" />
      </span>

      <span className="shengri-button__portrait" aria-hidden="true">
        <span className="shengri-button__portrait-ring" />
        <img src={imageSrc} alt="" draggable="false" />
      </span>

      <span className="shengri-button__copy">
        {eyebrow && <span className="shengri-button__eyebrow">{eyebrow}</span>}
        <span className="shengri-button__label">
          {loading ? `正在${label}...` : label}
        </span>
        {description && <span className="shengri-button__description">{description}</span>}
      </span>

      {showSparkle && (
        <span className="shengri-button__action" aria-hidden="true">
          {selected ? '✓' : '✦'}
        </span>
      )}
    </button>
  );
}


export default ShengriButton;
