import { useState } from 'react';
import MediaPreviewOverlay from './MediaPreviewOverlay';

export default function VideoPreview({ src, className = '', character, themedClose = false }) {
  const [show, setShow] = useState(false);
  return (
    <>
      <div className="relative w-full h-full cursor-pointer" onClick={() => setShow(true)}>
        <video
          src={src}
          className={className + ' pointer-events-none'}
        />
        <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-0 hover:bg-opacity-10 transition">
          <span className="text-white text-4xl opacity-70">▶</span>
        </div>
      </div>
      {show && (
        <MediaPreviewOverlay
          character={character}
          themedClose={themedClose}
          onClose={() => setShow(false)}
        >
          <video
            src={src}
            controls
            autoPlay
            className="media-preview-overlay__media"
          />
        </MediaPreviewOverlay>
      )}
    </>
  );
}
