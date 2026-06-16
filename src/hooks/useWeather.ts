import { useState, useEffect } from 'react';

// Simplified WMO Weather Codes
const getWeatherLabel = (code: number) => {
    if (code === 0) return { label: '晴朗', icon: '☀️', bg: 'from-orange-400 to-amber-200' };
    if (code >= 1 && code <= 3) return { label: '多雲', icon: '⛅', bg: 'from-sky-400 to-blue-200' };
    if (code >= 45 && code <= 48) return { label: '霧氣', icon: '🌫️', bg: 'from-slate-400 to-slate-200' };
    if (code >= 51 && code <= 67) return { label: '細雨', icon: '🌧️', bg: 'from-blue-500 to-slate-400' };
    if (code >= 71 && code <= 77) return { label: '降雪', icon: '❄️', bg: 'from-indigo-100 to-white' };
    if (code >= 80 && code <= 82) return { label: '陣雨', icon: '🌦️', bg: 'from-indigo-500 to-blue-400' };
    if (code >= 95) return { label: '雷雨', icon: '⛈️', bg: 'from-purple-600 to-indigo-600' };
    return { label: '陰天', icon: '☁️', bg: 'from-slate-400 to-gray-300' };
};

export const useWeather = () => {
    const [weather, setWeather] = useState<{ temp: number; code: number } | null>(null);

    useEffect(() => {
        // Fetch Taipei weather via internal proxy
        const fetchWeather = async () => {
            try {
                const res = await fetch('/api/weather');
                if (!res.ok) {
                    // 天氣為非必要的裝飾性 widget，上游暫時失敗時靜默降級即可，
                    // 不丟出 error（避免 Next.js dev 將 console.error 提升為錯誤覆蓋層）。
                    console.warn(`Weather widget unavailable (HTTP ${res.status})`);
                    return;
                }

                const data = await res.json();
                if (data.current_weather) {
                    setWeather({
                        temp: data.current_weather.temperature,
                        code: data.current_weather.weathercode,
                    });
                }
            } catch (e) {
                console.warn('Weather fetch failed', e);
            }
        };

        fetchWeather();
        // Refresh every 30 mins
        const interval = setInterval(fetchWeather, 30 * 60 * 1000);
        return () => clearInterval(interval);
    }, []);

    if (!weather) return null;
    return { ...weather, ...getWeatherLabel(weather.code) };
};
