import { useState } from 'react';
import MediaPreviewOverlay from './MediaPreviewOverlay';

export default function ImagePreview({ src, alt = '', className = '', character, themedClose = false }) {
  const [show, setShow] = useState(false);
  return (
    <>
      <img
        src={src}
        alt={alt}
        className={className + ' cursor-pointer'}
        onClick={() => setShow(true)}
      />
      {show && (
        <MediaPreviewOverlay
          character={character}
          themedClose={themedClose}
          onClose={() => setShow(false)}
        >
          <img
            src={src}
            alt={alt}
            className="media-preview-overlay__media"
          />
        </MediaPreviewOverlay>
      )}
    </>
  );
}
