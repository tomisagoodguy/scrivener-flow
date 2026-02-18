import React from 'react';

export function ShowerEffect() {
  return (
    <>
      {/* 雨雲 */}
      {[...Array(3)].map((_, i) => (
        <div
            key={`shower-cloud-${i}`}
            className="absolute text-3xl opacity-40"
            style={{
                left: `${15 + i * 35}%`,
                top: `${5 + (i % 2) * 10}%`,
                animation: `float ${9 + i * 2}s ease-in-out infinite`,
                animationDelay: `${i * 1.5}s`,
            }}
        >
            🌧️
        </div>
      ))}
      {/* 陣雨雨滴 */}
      {[...Array(12)].map((_, i) => (
        <div
            key={`shower-rain-${i}`}
            className="absolute"
            style={{
                fontSize: `${1.3 + (i % 3) * 0.4}rem`,
                left: `${10 + (i * 8) % 80}%`,
                top: '-10%',
                opacity: 0.45 + (i % 4) * 0.1,
                animation: `rainEnhanced ${1.3 + (i % 3) * 0.3}s ease-in infinite`,
                animationDelay: `${i * 0.15}s`,
            }}
        >
            💧
        </div>
      ))}
    </>
  );
}
