import React from 'react';

export function RainEffect() {
  return (
    <>
      {/* 增加雨滴數量與細節 */}
      {[...Array(15)].map((_, i) => (
        <div
          key={`rain-${i}`}
          className="absolute"
          style={{
            fontSize: `${1.2 + (i % 3) * 0.3}rem`,
            left: `${(i * 7) % 100}%`,
            top: '-10%',
            opacity: 0.4 + (i % 3) * 0.1,
            animation: `rainEnhanced ${1.8 + (i % 4) * 0.4}s ease-in infinite`,
            animationDelay: `${i * 0.2}s`,
          }}
        >
          💧
        </div>
      ))}
      {/* 背景細雨 */}
      {[...Array(8)].map((_, i) => (
        <div
          key={`mist-${i}`}
          className="absolute text-sm opacity-20"
          style={{
            left: `${i * 12}%`,
            top: `${20 + (i % 3) * 20}%`,
            animation: `drift ${15 + i * 3}s linear infinite`,
          }}
        >
          💧
        </div>
      ))}
    </>
  );
}
