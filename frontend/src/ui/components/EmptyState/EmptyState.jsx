import './EmptyState.css';


function EmptyState({
  illustration,
  icon = '☁',
  title = '暂无数据',
  description,
  action,
  size = 'medium',
  className = '',
  ...emptyProps
}) {
  return (
    <section className={`cui-empty cui-empty--${size} ${className}`} {...emptyProps}>
      {illustration ? (
        <div className="cui-empty__illustration">{illustration}</div>
      ) : (
        <span className="cui-empty__icon" aria-hidden="true">{icon}</span>
      )}
      <strong>{title}</strong>
      {description && <p>{description}</p>}
      {action && <div className="cui-empty__action">{action}</div>}
    </section>
  );
}


export default EmptyState;
