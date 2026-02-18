'use client';

import { useWeather } from '@/hooks/useWeather';
import { useWeatherEffect } from './weather/useWeatherEffect';

export function WeatherAnimation() {
    const weather = useWeather();

    if (!weather) return null;

    const weatherEffect = useWeatherEffect(weather.code);

    return (
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
            {weatherEffect}
        </div>
    );
}
