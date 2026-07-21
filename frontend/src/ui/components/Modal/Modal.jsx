import { useEffect, useId, useRef } from 'react';
import { createPortal } from 'react-dom';
import './Modal.css';


const focusableSelectors = [
  'a[href]',
  'button:not([disabled])',
  'input:not([disabled])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
];
const focusableSelector = focusableSelectors.join(',');
const bodyFocusableSelector = focusableSelectors.map((selector) => `.cui-modal__body ${selector}`).join(',');


function Modal({
  open,
  onClose,
  title,
  description,
  children,
  footer,
  width = 'medium',
  closeOnOverlay = true,
  closeOnEscape = true,
  showClose = true,
  className = '',
}) {
  const titleId = useId();
  const descriptionId = useId();
  const panelRef = useRef(null);
  const onCloseRef = useRef(onClose);

  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  useEffect(() => {
    if (!open) return undefined;
    const previousActiveElement = document.activeElement;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const focusTimer = window.setTimeout(() => {
      const preferredFocus = panelRef.current?.querySelector('[data-autofocus="true"]');
      const firstBodyFocusable = panelRef.current?.querySelector(bodyFocusableSelector);
      const firstFocusable = panelRef.current?.querySelector(focusableSelector);
      (preferredFocus || firstBodyFocusable || firstFocusable || panelRef.current)?.focus();
    }, 0);

    const handleKeyDown = (event) => {
      if (event.key === 'Escape' && closeOnEscape) {
        event.preventDefault();
        onCloseRef.current?.();
        return;
      }

      if (event.key !== 'Tab' || !panelRef.current) return;
      const focusableElements = [...panelRef.current.querySelectorAll(focusableSelector)];
      if (focusableElements.length === 0) {
        event.preventDefault();
        panelRef.current.focus();
        return;
      }

      const firstElement = focusableElements[0];
      const lastElement = focusableElements[focusableElements.length - 1];
      if (event.shiftKey && document.activeElement === firstElement) {
        event.preventDefault();
        lastElement.focus();
      } else if (!event.shiftKey && document.activeElement === lastElement) {
        event.preventDefault();
        firstElement.focus();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => {
      window.clearTimeout(focusTimer);
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = previousOverflow;
      previousActiveElement?.focus?.();
    };
  }, [closeOnEscape, open]);

  if (!open || typeof document === 'undefined') return null;

  const handleOverlayMouseDown = (event) => {
    if (closeOnOverlay && event.target === event.currentTarget) onCloseRef.current?.();
  };

  return createPortal(
    <div className="cui-modal" onMouseDown={handleOverlayMouseDown}>
      <div
        ref={panelRef}
        className={`cui-modal__panel cui-modal__panel--${width} ${className}`}
        role="dialog"
        aria-modal="true"
        aria-labelledby={title ? titleId : undefined}
        aria-describedby={description ? descriptionId : undefined}
        tabIndex={-1}
      >
        {(title || description || showClose) && (
          <header className="cui-modal__header">
            <div>
              {title && <h2 id={titleId}>{title}</h2>}
              {description && <p id={descriptionId}>{description}</p>}
            </div>
            {showClose && (
              <button type="button" className="cui-modal__close" aria-label="关闭弹窗" onClick={() => onCloseRef.current?.()}>
                ×
              </button>
            )}
          </header>
        )}
        <div className="cui-modal__body">{children}</div>
        {footer && <footer className="cui-modal__footer">{footer}</footer>}
      </div>
    </div>,
    document.body,
  );
}


export default Modal;
