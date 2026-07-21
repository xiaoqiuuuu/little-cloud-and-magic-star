import './Statistic.css';


function Statistic({
  label,
  value,
  prefix,
  suffix,
  trend,
  trendDirection = 'neutral',
  emphasis = false,
  className = '',
  ...statisticProps
}) {
  return (
    <div className={`cui-statistic ${emphasis ? 'cui-statistic--emphasis' : ''} ${className}`} {...statisticProps}>
      {label && <span className="cui-statistic__label">{label}</span>}
      <div className="cui-statistic__value">
        {prefix && <small>{prefix}</small>}
        <strong>{value}</strong>
        {suffix && <small>{suffix}</small>}
      </div>
      {trend && <span className={`cui-statistic__trend is-${trendDirection}`}>{trend}</span>}
    </div>
  );
}


export default Statistic;
