import { forwardRef } from 'react';
import './Button.css';


function classNames(...names) {
  return names.filter(Boolean).join(' ');
}


const Button = forwardRef(function Button({
  children,
  variant = 'primary',
  size = 'medium',
  loading = false,
  block = false,
  prefix,
  suffix,
  disabled = false,
  className = '',
  ...buttonProps
}, ref) {
  return (
    <button
      ref={ref}
      type="button"
      className={classNames(
        'cui-button',
        `cui-button--${variant}`,
        `cui-button--${size}`,
        block && 'cui-button--block',
        loading && 'is-loading',
        className,
      )}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      {...buttonProps}
    >
      {loading && <span className="cui-button__spinner" aria-hidden="true" />}
      {!loading && prefix && <span className="cui-button__prefix">{prefix}</span>}
      <span className="cui-button__content">{children}</span>
      {!loading && suffix && <span className="cui-button__suffix">{suffix}</span>}
    </button>
  );
});


export default Button;
