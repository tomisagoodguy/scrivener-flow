import React from 'react';
import {
    SunEffect,
    CloudEffect,
    FogEffect,
    RainEffect,
    SnowEffect,
    ShowerEffect,
    ThunderEffect,
    DefaultCloudEffect,
} from './effects';

export function useWeatherEffect(code: number | undefined) {
    if (code === undefined) return null;

    // 晴天 (0)
    if (code === 0) return <SunEffect />;

    // 多雲 (1-3)
    if (code >= 1 && code <= 3) return <CloudEffect />;

    // 霧氣 (45-48)
    if (code >= 45 && code <= 48) return <FogEffect />;

    // 細雨/雨天 (51-67)
    if (code >= 51 && code <= 67) return <RainEffect />;

    // 降雪 (71-77)
    if (code >= 71 && code <= 77) return <SnowEffect />;

    // 陣雨 (80-82)
    if (code >= 80 && code <= 82) return <ShowerEffect />;

    // 雷雨 (95+)
    if (code >= 95) return <ThunderEffect />;

    // 預設：陰天
    return <DefaultCloudEffect />;
}
