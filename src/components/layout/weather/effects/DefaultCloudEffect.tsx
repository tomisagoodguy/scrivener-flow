import React from 'react';

export function DefaultCloudEffect() {
  return (
    <>
      {[...Array(5)].map((_, i) => (
        <div
          key={`default-cloud-${i}`}
          className="absolute"
          style={{
            fontSize: `${2.5 + (i % 2) * 0.5}rem`,
            left: `${5 + i * 22}%`,
            top: `${15 + (i % 3) * 20}%`,
            opacity: 0.25 + (i % 3) * 0.08,
            animation: `drift ${22 + i * 4}s linear infinite`,
            animationDelay: `${i * 3}s`,
          }}
        >
          ☁️
        </div>
      ))}
    </>
  );
}
