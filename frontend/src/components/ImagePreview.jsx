import { useState } from 'react';

export default function ImagePreview({ src, alt = '', className = '' }) {
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
          <button className="absolute top-4 right-4 text-white text-3xl font-bold" onClick={() => setShow(false)}>&times;</button>
        </div>
      )}
    </>
  );
}
