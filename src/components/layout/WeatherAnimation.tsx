'use client';

import { useWeather } from '@/hooks/useWeather';

export function WeatherAnimation() {
    const weather = useWeather();

    if (!weather) return null;

    // 根據天氣代碼決定動畫類型
    const renderWeatherEffect = () => {
        const { code } = weather;

        // 晴天 (0)
        if (code === 0) {
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

        // 多雲 (1-3)
        if (code >= 1 && code <= 3) {
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

        // 霧氣 (45-48)
        if (code >= 45 && code <= 48) {
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

        // 細雨/雨天 (51-67) - 增強版
        if (code >= 51 && code <= 67) {
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

        // 降雪 (71-77) - 增強版
        if (code >= 71 && code <= 77) {
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

        // 陣雨 (80-82)
        if (code >= 80 && code <= 82) {
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

        // 雷雨 (95+)
        if (code >= 95) {
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

        // 預設：陰天
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
    };

    return (
        <>
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
                {renderWeatherEffect()}
            </div>

            {/* Enhanced CSS Animations */}
            <style jsx>{`
                @keyframes rainEnhanced {
                    0% {
                        transform: translateY(0) translateX(0) rotate(10deg);
                        opacity: 0;
                    }
                    5% {
                        opacity: 0.7;
                    }
                    100% {
                        transform: translateY(120vh) translateX(-15px) rotate(10deg);
                        opacity: 0;
                    }
                }

                @keyframes snowEnhanced {
                    0% {
                        transform: translateY(0) translateX(0) rotate(0deg) scale(1);
                        opacity: 0;
                    }
                    10% {
                        opacity: 0.9;
                    }
                    50% {
                        transform: translateY(60vh) translateX(20px) rotate(180deg) scale(1.1);
                    }
                    100% {
                        transform: translateY(120vh) translateX(40px) rotate(360deg) scale(0.8);
                        opacity: 0;
                    }
                }

                @keyframes drift {
                    0% {
                        transform: translateX(0) translateY(0);
                    }
                    50% {
                        transform: translateX(50vw) translateY(-5px);
                    }
                    100% {
                        transform: translateX(120vw) translateY(0);
                    }
                }

                @keyframes float {
                    0%, 100% {
                        transform: translateY(0px) scale(1);
                    }
                    25% {
                        transform: translateY(-12px) scale(1.02);
                    }
                    50% {
                        transform: translateY(-18px) scale(1);
                    }
                    75% {
                        transform: translateY(-12px) scale(0.98);
                    }
                }

                @keyframes lightningEnhanced {
                    0%, 85%, 88%, 100% {
                        opacity: 0;
                        transform: scale(1);
                    }
                    86%, 87% {
                        opacity: 1;
                        transform: scale(1.2);
                    }
                    89% {
                        opacity: 0.3;
                        transform: scale(1.1);
                    }
                }

                @keyframes glow {
                    0%, 100% {
                        opacity: 0.15;
                        transform: translate(-50%, -50%) scale(1);
                    }
                    50% {
                        opacity: 0.3;
                        transform: translate(-50%, -50%) scale(1.1);
                    }
                }
            `}</style>
        </>
    );
}
