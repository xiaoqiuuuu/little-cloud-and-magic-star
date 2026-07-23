import { useState, useEffect } from 'react';
import './Countdown.css';

function Countdown({ initialSeconds, onComplete, compact = false }) {
  const [timeLeft, setTimeLeft] = useState(initialSeconds);
  const [isExpired, setIsExpired] = useState(false);

  useEffect(() => {
    setTimeLeft(initialSeconds);
    setIsExpired(false);
  }, [initialSeconds]);

  useEffect(() => {
    if (timeLeft <= 0) {
      setIsExpired(true);
      onComplete?.();
      return;
    }

    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [timeLeft, onComplete]);

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const getTone = () => {
    if (timeLeft <= 10) return 'danger';
    if (timeLeft <= 30) return 'warning';
    return 'primary';
  };

  return (
    <div className={`quiz-countdown ${compact ? 'is-compact' : ''}`}>
      <div className={`quiz-countdown__value is-${getTone()}`}>
        {formatTime(timeLeft)}
      </div>
      <div className="quiz-countdown__label">
        {isExpired ? '时间到！' : '剩余时间'}
      </div>
    </div>
  );
}

export default Countdown;
