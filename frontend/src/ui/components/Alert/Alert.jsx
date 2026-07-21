import { useState } from 'react';
import './Alert.css';


const defaultIcons = {
  info: 'i',
  success: '✓',
  warning: '!',
  error: '×',
};


function Alert({
  type = 'info',
  title,
  description,
  action,
  icon,
  showIcon = true,
  closable = false,
  onClose,
  className = '',
  children,
  ...alertProps
}) {
  const [visible, setVisible] = useState(true);
  if (!visible) return null;

  const handleClose = (event) => {
    setVisible(false);
    onClose?.(event);
  };

  return (
    <section
      className={`cui-alert cui-alert--${type} ${closable ? 'cui-alert--closable' : ''} ${className}`}
      role={type === 'error' || type === 'warning' ? 'alert' : 'status'}
      {...alertProps}
    >
      {showIcon && <span className="cui-alert__icon" aria-hidden="true">{icon || defaultIcons[type]}</span>}
      <div className="cui-alert__content">
        {title && <strong>{title}</strong>}
        {(description || children) && <div>{description || children}</div>}
      </div>
      {action && <div className="cui-alert__action">{action}</div>}
      {closable && <button className="cui-alert__close" type="button" aria-label="关闭提示" onClick={handleClose}>×</button>}
    </section>
  );
}


export default Alert;
