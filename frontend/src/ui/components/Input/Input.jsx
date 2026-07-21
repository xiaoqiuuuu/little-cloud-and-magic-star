import { forwardRef, useId } from 'react';
import './Input.css';


function classNames(...names) {
  return names.filter(Boolean).join(' ');
}


const Input = forwardRef(function Input({
  label,
  helperText,
  error,
  status,
  size = 'medium',
  prefix,
  suffix,
  block = true,
  className = '',
  id,
  disabled = false,
  ...inputProps
}, ref) {
  const generatedId = useId();
  const inputId = id || generatedId;
  const resolvedStatus = error ? 'error' : status;
  const message = error || helperText;
  const messageId = message ? `${inputId}-message` : undefined;

  return (
    <label className={classNames('cui-input-field', block && 'cui-input-field--block', className)} htmlFor={inputId}>
      {label && <span className="cui-input-field__label">{label}</span>}
      <span className={classNames(
        'cui-input',
        `cui-input--${size}`,
        resolvedStatus && `cui-input--${resolvedStatus}`,
        disabled && 'is-disabled',
      )}>
        {prefix && <span className="cui-input__prefix" aria-hidden="true">{prefix}</span>}
        <input
          ref={ref}
          id={inputId}
          disabled={disabled}
          aria-invalid={resolvedStatus === 'error' || undefined}
          aria-describedby={messageId}
          {...inputProps}
        />
        {suffix && <span className="cui-input__suffix" aria-hidden="true">{suffix}</span>}
      </span>
      {message && (
        <span id={messageId} className={classNames('cui-input-field__message', resolvedStatus && `is-${resolvedStatus}`)}>
          {message}
        </span>
      )}
    </label>
  );
});


export default Input;
