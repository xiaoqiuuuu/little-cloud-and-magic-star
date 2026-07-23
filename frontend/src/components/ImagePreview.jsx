import { useState } from 'react';
import { Button, CharacterButton } from '../ui';

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
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-80" onClick={() => setShow(false)}>
          <img
            src={src}
            alt={alt}
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
          ) : themedClose ? (
            <Button
              variant="secondary"
              size="small"
              className="absolute top-4 right-4"
              onClick={() => setShow(false)}
            >
              关闭
            </Button>
          ) : (
            <button className="absolute top-4 right-4 text-white text-3xl font-bold" onClick={() => setShow(false)}>&times;</button>
          )}
        </div>
      )}
    </>
  );
}
