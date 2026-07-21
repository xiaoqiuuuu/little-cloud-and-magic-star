import { forwardRef, useId } from 'react';
import './Select.css';


function classNames(...names) {
  return names.filter(Boolean).join(' ');
}


const Select = forwardRef(function Select({
  label,
  helperText,
  error,
  status,
  size = 'medium',
  block = true,
  options = [],
  placeholder,
  className = '',
  id,
  disabled = false,
  children,
  ...selectProps
}, ref) {
  const generatedId = useId();
  const selectId = id || generatedId;
  const resolvedStatus = error ? 'error' : status;
  const message = error || helperText;
  const messageId = message ? `${selectId}-message` : undefined;

  return (
    <label className={classNames('cui-select-field', block && 'cui-select-field--block', className)} htmlFor={selectId}>
      {label && <span className="cui-select-field__label">{label}</span>}
      <span className={classNames(
        'cui-select',
        `cui-select--${size}`,
        resolvedStatus && `cui-select--${resolvedStatus}`,
        disabled && 'is-disabled',
      )}>
        <select
          ref={ref}
          id={selectId}
          disabled={disabled}
          aria-invalid={resolvedStatus === 'error' || undefined}
          aria-describedby={messageId}
          {...selectProps}
        >
          {placeholder && <option value="" disabled>{placeholder}</option>}
          {options.map((option) => (
            <option key={option.value} value={option.value} disabled={option.disabled}>
              {option.label}
            </option>
          ))}
          {children}
        </select>
        <span className="cui-select__arrow" aria-hidden="true">⌄</span>
      </span>
      {message && (
        <span id={messageId} className={classNames('cui-select-field__message', resolvedStatus && `is-${resolvedStatus}`)}>
          {message}
        </span>
      )}
    </label>
  );
});


export default Select;
