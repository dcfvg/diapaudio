import { memo } from "react";
import "./Clock.css";

function Clock({ analogAngles, clockDisplays, mode = 'analog', onToggleMode, ...rest }) {
  const isAnalog = mode === 'analog';
  
  return (
    <div 
      className="viewer__clock" 
      id="viewer-clock" 
      onClick={onToggleMode}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onToggleMode?.();
        }
      }}
      {...rest}
    >
      <svg className={`clock-svg clock-analog${isAnalog ? '' : ' hidden'}`} viewBox="0 0 100 100" aria-hidden="true">
        <circle className="clock-face" cx="50" cy="50" r="48" />
        <line className="clock-tick" x1="50" y1="2" x2="50" y2="8" transform="rotate(0 50 50)" />
        <line className="clock-tick" x1="50" y1="2" x2="50" y2="8" transform="rotate(30 50 50)" />
        <line className="clock-tick" x1="50" y1="2" x2="50" y2="8" transform="rotate(60 50 50)" />
        <line className="clock-tick" x1="50" y1="2" x2="50" y2="8" transform="rotate(90 50 50)" />
        <line className="clock-tick" x1="50" y1="2" x2="50" y2="8" transform="rotate(120 50 50)" />
        <line className="clock-tick" x1="50" y1="2" x2="50" y2="8" transform="rotate(150 50 50)" />
        <line className="clock-tick" x1="50" y1="2" x2="50" y2="8" transform="rotate(180 50 50)" />
        <line className="clock-tick" x1="50" y1="2" x2="50" y2="8" transform="rotate(210 50 50)" />
        <line className="clock-tick" x1="50" y1="2" x2="50" y2="8" transform="rotate(240 50 50)" />
        <line className="clock-tick" x1="50" y1="2" x2="50" y2="8" transform="rotate(270 50 50)" />
        <line className="clock-tick" x1="50" y1="2" x2="50" y2="8" transform="rotate(300 50 50)" />
        <line className="clock-tick" x1="50" y1="2" x2="50" y2="8" transform="rotate(330 50 50)" />
        <line
          className="clock-hour-hand"
          id="clock-hour-hand"
          x1="50"
          y1="50"
          x2="50"
          y2="30"
          transform={`rotate(${analogAngles.hour} 50 50)`}
        />
        <line
          className="clock-minute-hand"
          id="clock-minute-hand"
          x1="50"
          y1="50"
          x2="50"
          y2="18"
          transform={`rotate(${analogAngles.minute} 50 50)`}
        />
        <line
          className="clock-second-hand"
          id="clock-second-hand"
          x1="50"
          y1="50"
          x2="50"
          y2="12"
          transform={`rotate(${analogAngles.second} 50 50)`}
        />
        <circle className="clock-center" cx="50" cy="50" r="3" />
      </svg>
      {!isAnalog && (
        <div className="clock-digital-info">
          <span className="clock-digital-time">{clockDisplays.time}</span>
          <span className="clock-digital-separator"> · </span>
          <span className="clock-digital-date">{clockDisplays.date?.toUpperCase?.() || clockDisplays.date}</span>
        </div>
      )}
    </div>
  );
}

export default memo(Clock);
