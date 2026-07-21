import { forwardRef } from 'react';
import './Card.css';


function classNames(...names) {
  return names.filter(Boolean).join(' ');
}


const Card = forwardRef(function Card({
  children,
  title,
  extra,
  footer,
  variant = 'outlined',
  padding = 'medium',
  selected,
  disabled = false,
  fullWidth = true,
  className = '',
  onClick,
  as,
  ...cardProps
}, ref) {
  const CardElement = as || (onClick ? 'button' : 'section');
  const isButton = CardElement === 'button';

  return (
    <CardElement
      ref={ref}
      className={classNames(
        'cui-card',
        `cui-card--${variant}`,
        `cui-card--padding-${padding}`,
        fullWidth && 'cui-card--full-width',
        onClick && 'is-interactive',
        selected && 'is-selected',
        disabled && 'is-disabled',
        className,
      )}
      {...(isButton ? {
        type: 'button',
        disabled,
        onClick,
        'aria-pressed': typeof selected === 'boolean' ? selected : undefined,
      } : {
        onClick,
        'aria-disabled': disabled || undefined,
      })}
      {...cardProps}
    >
      {(title || extra) && (
        <header className="cui-card__header">
          <div className="cui-card__title">{title}</div>
          {extra && <div className="cui-card__extra">{extra}</div>}
        </header>
      )}
      <div className="cui-card__body">{children}</div>
      {footer && <footer className="cui-card__footer">{footer}</footer>}
    </CardElement>
  );
});


export default Card;
