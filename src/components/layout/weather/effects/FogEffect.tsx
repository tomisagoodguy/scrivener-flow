import React from 'react';

export function FogEffect() {
  return (
    <div className="absolute inset-0">
      {[...Array(10)].map((_, i) => (
        <div
          key={`fog-${i}`}
          className="absolute"
          style={{
            fontSize: `${1.5 + (i % 2) * 0.5}rem`,
            left: `${i * 10}%`,
            top: `${15 + (i % 4) * 20}%`,
            opacity: 0.15 + (i % 3) * 0.05,
            animation: `drift ${12 + i * 2}s linear infinite`,
            animationDelay: `${i * 0.8}s`,
            filter: 'blur(2px)',
          }}
        >
          🌫️
        </div>
      ))}
    </div>
  );
}
