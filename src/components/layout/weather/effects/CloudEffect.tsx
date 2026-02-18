import React from 'react';

export function CloudEffect() {
  return (
    <>
      {/* 多層雲朵營造深度 */}
      {[...Array(6)].map((_, i) => (
        <div
          key={`cloud-${i}`}
          className="absolute"
          style={{
            fontSize: `${2 + (i % 3) * 0.8}rem`,
            left: `${-15 + i * 20}%`,
            top: `${10 + (i % 3) * 25}%`,
            opacity: 0.25 + (i % 3) * 0.1,
            animation: `drift ${18 + i * 4}s linear infinite`,
            animationDelay: `${i * 2.5}s`,
            filter: i % 2 === 0 ? 'blur(1px)' : 'none',
          }}
        >
          ☁️
        </div>
      ))}
    </>
  );
}
