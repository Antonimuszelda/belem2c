// ⏰ Date/Time Indicator Widget
import { useState, useEffect } from 'react';
import './DateTimeWidget.css';

export default function DateTimeWidget() {
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('pt-BR', {
      weekday: 'short',
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    });
  };

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('pt-BR', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  };

  return (
    <div className="datetime-widget">
      <div className="datetime-date">{formatDate(currentTime)}</div>
      <div className="datetime-time">{formatTime(currentTime)}</div>
      <div className="datetime-pulse"></div>
    </div>
  );
}
