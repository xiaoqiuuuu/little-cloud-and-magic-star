import { useState } from 'react';
import MediaPreviewOverlay from './MediaPreviewOverlay';

export default function AudioPreview({ src, className = '', character, themedClose = false }) {
  const [show, setShow] = useState(false);
  return (
    <>
      <div className="relative w-full h-full cursor-pointer" onClick={() => setShow(true)}>
        <audio
          src={src}
          className={className + ' pointer-events-none'}
        />
        <div className="absolute inset-0 flex items-center justify-center bg-gray-100 hover:bg-gray-200 transition rounded">
          <span className="text-gray-600 text-2xl">点击播放</span>
        </div>
      </div>
      {show && (
        <MediaPreviewOverlay
          character={character}
          themedClose={themedClose}
          contentClassName="is-audio"
          onClose={() => setShow(false)}
        >
          <audio
            src={src}
            controls
            autoPlay
            className="media-preview-overlay__audio"
          />
        </MediaPreviewOverlay>
      )}
    </>
  );
}
