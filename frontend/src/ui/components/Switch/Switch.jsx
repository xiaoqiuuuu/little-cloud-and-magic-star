import { forwardRef, useId, useState } from 'react';
import './Switch.css';


function classNames(...names) {
  return names.filter(Boolean).join(' ');
}


const Switch = forwardRef(function Switch({
  checked,
  defaultChecked = false,
  onChange,
  onClick,
  label,
  description,
  checkedLabel,
  uncheckedLabel,
  size = 'medium',
  disabled = false,
  className = '',
  ...switchProps
}, ref) {
  const labelId = useId();
  const [internalChecked, setInternalChecked] = useState(defaultChecked);
  const isControlled = typeof checked === 'boolean';
  const resolvedChecked = isControlled ? checked : internalChecked;

  const handleClick = (event) => {
    if (disabled) return;
    const nextChecked = !resolvedChecked;
    if (!isControlled) setInternalChecked(nextChecked);
    onChange?.(nextChecked, event);
    onClick?.(event);
  };

  const control = (
    <button
      ref={ref}
      type="button"
      role="switch"
      aria-checked={resolvedChecked}
      aria-labelledby={label ? labelId : undefined}
      className={classNames(
        'cui-switch',
        `cui-switch--${size}`,
        resolvedChecked && 'is-checked',
        !label && !description && className,
      )}
      disabled={disabled}
      onClick={handleClick}
      {...switchProps}
    >
      <span className="cui-switch__thumb" />
      {(checkedLabel || uncheckedLabel) && (
        <span className="cui-switch__state-label">
          {resolvedChecked ? checkedLabel : uncheckedLabel}
        </span>
      )}
    </button>
  );

  if (!label && !description) return control;

  return (
    <div className={classNames('cui-switch-field', disabled && 'is-disabled', className)}>
      {control}
      <span className="cui-switch-field__copy">
        {label && <strong id={labelId}>{label}</strong>}
        {description && <small>{description}</small>}
      </span>
    </div>
  );
});


export default Switch;
