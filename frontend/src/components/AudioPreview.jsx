import { useState } from 'react';
import { CharacterButton } from '../ui';

export default function AudioPreview({ src, className = '', character }) {
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
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-90" onClick={() => setShow(false)}>
          <div className="bg-white p-6 rounded-lg shadow-2xl" onClick={e => e.stopPropagation()}>
            <audio
              src={src}
              controls
              autoPlay
              className="w-full min-w-[300px]"
            />
          </div>
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
