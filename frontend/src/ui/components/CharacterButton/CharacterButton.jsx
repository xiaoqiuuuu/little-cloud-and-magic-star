import Button from '../Button';
import { useCharacterPack } from '../../theme';
import './CharacterButton.css';


function CharacterButton({
  character,
  children,
  size = 'medium',
  selected,
  showSparkle = true,
  className = '',
  style,
  ...buttonProps
}) {
  const characterPack = useCharacterPack(character);
  const characterStyle = {
    '--cui-character-local-accent': characterPack.accent,
    '--cui-character-local-accent-deep': characterPack.accentDeep,
    '--cui-character-local-accent-soft': characterPack.accentSoft,
    '--cui-character-local-avatar-position': characterPack.avatarPosition,
    ...style,
  };

  return (
    <Button
      variant="soft"
      size={size}
      className={`cui-character-button cui-character-button--${characterPack.artworkShape} ${selected ? 'is-selected' : ''} ${className}`}
      style={characterStyle}
      aria-pressed={typeof selected === 'boolean' ? selected : undefined}
      prefix={(
        <span className="cui-character-button__avatar" aria-hidden="true">
          <img src={characterPack.assets.buttonAvatar} alt="" draggable="false" />
        </span>
      )}
      suffix={showSparkle ? <span className="cui-character-button__sparkle" aria-hidden="true">✦</span> : undefined}
      {...buttonProps}
    >
      {children}
    </Button>
  );
}


export default CharacterButton;
