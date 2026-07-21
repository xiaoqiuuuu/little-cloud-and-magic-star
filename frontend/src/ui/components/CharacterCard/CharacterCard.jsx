import Card from '../Card';
import { useCharacterPack } from '../../theme';
import './CharacterCard.css';


function CharacterCard({
  character,
  layout = 'corner',
  size = 'medium',
  children,
  className = '',
  style,
  ...cardProps
}) {
  const characterPack = useCharacterPack(character);
  const characterStyle = {
    '--cui-character-local-accent': characterPack.accent,
    '--cui-character-local-accent-deep': characterPack.accentDeep,
    '--cui-character-local-accent-soft': characterPack.accentSoft,
    ...style,
  };

  return (
    <Card
      variant="soft"
      padding="none"
      className={`cui-character-card cui-character-card--${layout} cui-character-card--${size} cui-character-card--${characterPack.artworkShape} ${className}`}
      style={characterStyle}
      {...cardProps}
    >
      <span className="cui-character-card__decor" aria-hidden="true">
        <span className="cui-character-card__halo" />
        <img src={characterPack.assets.cardCorner} alt="" draggable="false" />
        <i className="cui-character-card__bubble cui-character-card__bubble--one" />
        <i className="cui-character-card__bubble cui-character-card__bubble--two" />
      </span>
      <div className="cui-character-card__content">{children}</div>
    </Card>
  );
}


export default CharacterCard;
