import React from 'react';

export function ThunderEffect() {
  return (
    <>
      {/* 烏雲 */}
      <div
        className="absolute text-5xl opacity-60"
        style={{
          left: '35%',
          top: '10%',
          animation: 'float 7s ease-in-out infinite',
          filter: 'brightness(0.7)',
        }}
      >
        ⛈️
      </div>
      {/* 多重閃電 */}
      {[...Array(3)].map((_, i) => (
        <div
          key={`lightning-${i}`}
          className="absolute text-3xl"
          style={{
            left: `${38 + i * 8}%`,
            top: `${35 + i * 10}%`,
            animation: `lightningEnhanced ${2 + i * 0.5}s ease-in-out infinite`,
            animationDelay: `${i * 0.8}s`,
          }}
        >
          ⚡
        </div>
      ))}
      {/* 暴雨 */}
      {[...Array(18)].map((_, i) => (
        <div
          key={`storm-rain-${i}`}
          className="absolute"
          style={{
            fontSize: `${1.5 + (i % 3) * 0.5}rem`,
            left: `${(i * 6) % 100}%`,
            top: '-10%',
            opacity: 0.5 + (i % 4) * 0.1,
            animation: `rainEnhanced ${0.9 + (i % 3) * 0.2}s ease-in infinite`,
            animationDelay: `${i * 0.08}s`,
          }}
        >
          💧
        </div>
      ))}
    </>
  );
}
