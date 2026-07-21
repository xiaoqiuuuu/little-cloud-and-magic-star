import EmptyState from '../EmptyState';
import { useCharacterPack } from '../../theme';
import './CharacterEmptyState.css';


function CharacterEmptyState({
  character,
  title = '还没有内容',
  description = '创建第一条内容后，我会在这里陪你一起整理。',
  style,
  ...emptyProps
}) {
  const characterPack = useCharacterPack(character);
  const characterStyle = {
    '--cui-character-local-accent': characterPack.accent,
    '--cui-character-local-accent-deep': characterPack.accentDeep,
    '--cui-character-local-accent-soft': characterPack.accentSoft,
    ...style,
  };

  return (
    <EmptyState
      className="cui-character-empty"
      title={title}
      description={description}
      style={characterStyle}
      illustration={(
        <img src={characterPack.assets.emptyState} alt="" draggable="false" />
      )}
      {...emptyProps}
    />
  );
}


export default CharacterEmptyState;
