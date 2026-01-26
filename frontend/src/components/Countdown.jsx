import { useState, useEffect } from 'react';

function Countdown({ initialSeconds, onComplete }) {
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

  const getColorClass = () => {
    if (timeLeft <= 10) return 'text-red-600 animate-pulse';
    if (timeLeft <= 30) return 'text-orange-600';
    return 'text-blue-600';
  };

  return (
    <div className="flex flex-col items-center">
      <div className={`text-2xl md:text-4xl font-bold ${getColorClass()} transition-colors duration-300`}>
        {formatTime(timeLeft)}
      </div>
      <div className="text-xs text-gray-500 mt-1">
        {isExpired ? '时间到！' : '剩余时间'}
      </div>
    </div>
  );
}

export default Countdown;
