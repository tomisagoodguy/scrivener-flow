import React from 'react';

export function SunEffect() {
  return (
    <>
      {/* 陽光光暈效果 */}
      <div
        className="absolute text-6xl opacity-20 blur-sm"
        style={{
          left: '50%',
          top: '50%',
          transform: 'translate(-50%, -50%)',
          animation: 'glow 4s ease-in-out infinite',
        }}
      >
        ☀️
      </div>
      {/* 多個太陽飄動 */}
      {[...Array(5)].map((_, i) => (
        <div
          key={`sun-${i}`}
          className="absolute"
          style={{
            fontSize: `${2 + i * 0.5}rem`,
            left: `${10 + i * 20}%`,
            top: `${15 + (i % 2) * 30}%`,
            opacity: 0.2 + i * 0.05,
            animation: `float ${6 + i * 1.5}s ease-in-out infinite`,
            animationDelay: `${i * 1.2}s`,
          }}
        >
          ☀️
        </div>
      ))}
    </>
  );
}
