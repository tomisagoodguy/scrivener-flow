interface Props {
    online: boolean;
}

/** 綠燈＝在線，灰燈＝離線。比照通訊軟體常見慣例，與投資模組紅漲綠跌無關。 */
export function OnlineDot({ online }: Props) {
    return (
        <span
            aria-label={online ? '在線' : '離線'}
            title={online ? '在線' : '離線'}
            className={`inline-block w-2 h-2 rounded-full shrink-0 ${online ? 'bg-emerald-500' : 'bg-slate-300 dark:bg-slate-600'}`}
        />
    );
}
