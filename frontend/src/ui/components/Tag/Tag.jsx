import './Tag.css';


function classNames(...names) {
  return names.filter(Boolean).join(' ');
}


function Tag({
  children,
  tone = 'neutral',
  variant = 'soft',
  icon,
  closable = false,
  onClose,
  className = '',
  ...tagProps
}) {
  return (
    <span className={classNames('cui-tag', `cui-tag--${tone}`, `cui-tag--${variant}`, className)} {...tagProps}>
      {icon && <span className="cui-tag__icon" aria-hidden="true">{icon}</span>}
      <span>{children}</span>
      {closable && (
        <button type="button" aria-label={`移除${typeof children === 'string' ? children : '标签'}`} onClick={onClose}>
          ×
        </button>
      )}
    </span>
  );
}


export default Tag;
