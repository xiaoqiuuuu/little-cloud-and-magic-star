import { useState } from 'react';
import { CharacterButton } from '../ui';

export default function VideoPreview({ src, className = '', character }) {
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
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-90" onClick={() => setShow(false)}>
          <video
            src={src}
            controls
            autoPlay
            className="max-w-full max-h-full rounded shadow-lg border-4 border-white"
            onClick={e => e.stopPropagation()}
          />
          {character ? (
            <CharacterButton
              character={character}
              size="small"
              showSparkle={false}
              className="absolute top-4 right-4"
              onClick={() => setShow(false)}
            >
              关闭
            </CharacterButton>
          ) : (
            <button className="absolute top-4 right-4 text-white text-3xl font-bold" onClick={() => setShow(false)}>&times;</button>
          )}
        </div>
      )}
    </>
  );
}
