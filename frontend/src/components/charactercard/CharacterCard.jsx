import xiaoyunArtwork from '../xiaoyunbutton/nb-4.png';
import birthdayArtwork from '../shengributton/tj-4.png';
import './CharacterCard.css';


const artworkByCharacter = {
  xiaoyun: xiaoyunArtwork,
  birthday: birthdayArtwork,
};

const supportedCharacters = new Set(['xiaoyun', 'birthday']);
const supportedLayouts = new Set(['corner', 'side', 'watermark']);
const supportedSizes = new Set(['small', 'medium', 'large']);


function classNames(...names) {
  return names.filter(Boolean).join(' ');
}


function CharacterCard({
  character = 'xiaoyun',
  layout = 'corner',
  size = 'medium',
  imageSrc,
  children,
  selected,
  disabled = false,
  fullWidth = false,
  className = '',
  onClick,
  ...cardProps
}) {
  const cardCharacter = supportedCharacters.has(character) ? character : 'xiaoyun';
  const cardLayout = supportedLayouts.has(layout) ? layout : 'corner';
  const cardSize = supportedSizes.has(size) ? size : 'medium';
  const CardElement = onClick ? 'button' : 'section';
  const isInteractive = Boolean(onClick);
  const artwork = imageSrc || artworkByCharacter[cardCharacter];

  return (
    <CardElement
      className={classNames(
        'character-card',
        `character-card--${cardCharacter}`,
        `character-card--${cardLayout}`,
        `character-card--${cardSize}`,
        isInteractive && 'is-interactive',
        selected && 'is-selected',
        disabled && 'is-disabled',
        fullWidth && 'character-card--full-width',
        className,
      )}
      {...(isInteractive ? {
        type: 'button',
        onClick,
        disabled,
        'aria-pressed': typeof selected === 'boolean' ? selected : undefined,
      } : {
        'aria-disabled': disabled || undefined,
      })}
      {...cardProps}
    >
      <span className="character-card__surface" aria-hidden="true" />
      <span className="character-card__sparkles" aria-hidden="true">
        <i className="character-card__sparkle character-card__sparkle--one" />
        <i className="character-card__sparkle character-card__sparkle--two" />
        <i className="character-card__sparkle character-card__sparkle--three" />
      </span>
      <span className="character-card__artwork" aria-hidden="true">
        <span className="character-card__halo" />
        <img src={artwork} alt="" draggable="false" />
      </span>
      <span className="character-card__content">{children}</span>
    </CardElement>
  );
}


export default CharacterCard;
