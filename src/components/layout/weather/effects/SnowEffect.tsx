import React from 'react';

export function SnowEffect() {
  return (
    <>
      {[...Array(20)].map((_, i) => (
        <div
          key={`snow-${i}`}
          className="absolute"
          style={{
            fontSize: `${0.8 + (i % 4) * 0.3}rem`,
            left: `${(i * 5) % 100}%`,
            top: '-10%',
            opacity: 0.5 + (i % 3) * 0.15,
            animation: `snowEnhanced ${3.5 + (i % 4) * 1}s ease-in-out infinite`,
            animationDelay: `${i * 0.35}s`,
          }}
        >
          ❄️
        </div>
      ))}
    </>
  );
}
