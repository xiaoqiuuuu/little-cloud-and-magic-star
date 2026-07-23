import { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Button, CharacterButton } from '../ui';
import './MediaPreviewOverlay.css';


function MediaPreviewOverlay({
  children,
  onClose,
  character,
  themedClose = false,
  contentClassName = '',
}) {
  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const handleKeyDown = (event) => {
      if (event.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [onClose]);

  if (typeof document === 'undefined') return null;

  const closeAction = character ? (
    <CharacterButton
      character={character}
      size="small"
      showSparkle={false}
      className="media-preview-overlay__close"
      onClick={onClose}
    >
      关闭
    </CharacterButton>
  ) : themedClose ? (
    <Button
      variant="secondary"
      size="small"
      className="media-preview-overlay__close"
      onClick={onClose}
    >
      关闭
    </Button>
  ) : (
    <button
      type="button"
      className="media-preview-overlay__close media-preview-overlay__close--plain"
      aria-label="关闭资源预览"
      onClick={onClose}
    >
      ×
    </button>
  );

  return createPortal(
    <div
      className="media-preview-overlay"
      role="dialog"
      aria-modal="true"
      aria-label="资源预览"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div
        className={`media-preview-overlay__content ${contentClassName}`}
        onMouseDown={(event) => event.stopPropagation()}
      >
        {children}
      </div>
      {closeAction}
    </div>,
    document.body,
  );
}


export default MediaPreviewOverlay;
