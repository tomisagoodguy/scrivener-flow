'use client';

import React from 'react';
import Link from 'next/link';
import { encodeDragPayload, zoneDisplayLabel } from './chipUtils';
import type { EisenhowerZone, PersonChipData } from './types';

interface PersonChipProps {
    chip: PersonChipData;
    zones: EisenhowerZone[];
    /** 這個「實例」所在的 zone id；null = 待分類區的實例 */
    currentZoneId: string | null;
    /** 名片目前所有歸屬（供選單勾號） */
    memberships: string[];
    /** 選單狀態由容器控管：勾選導致實例搬家時選單不會消失 */
    menuOpen: boolean;
    onOpenMenu: () => void;
    onCloseMenu: () => void;
    onToggleZone: (chipKey: string, zoneId: string) => void;
    onClearZones: (chipKey: string) => void;
}

/**
 * 案件名片（一案一卡，可屬多格）：卡面並列買賣雙方姓名，案號僅 hover tooltip。
 * 拖曳＝搬家（payload 帶來源格）；「⋯」選單為勾選式多選；格內實例有「✕ 從此格移除」。
 * 選單開啟時停用拖曳，避免瀏覽器把勾選的點擊誤判成 drag start。
 */
export default function PersonChip({ chip, zones, currentZoneId, memberships, menuOpen, onOpenMenu, onCloseMenu, onToggleZone, onClearZones }: PersonChipProps) {
    return (
        <div
            draggable={!menuOpen}
            onDragStart={(e) => {
                e.dataTransfer.setData('text/plain', encodeDragPayload(chip.key, currentZoneId));
                e.dataTransfer.effectAllowed = 'move';
            }}
            className="relative inline-flex items-center gap-1 pl-2 pr-1 py-1 rounded-lg border border-border-color bg-white/60 dark:bg-slate-800/60 shadow-sm cursor-grab active:cursor-grabbing select-none"
        >
            <Link
                href={`/cases/${chip.caseId}`}
                className="inline-flex items-center gap-1.5 text-sm font-medium text-foreground hover:text-primary hover:underline"
                title={`案件 ${chip.caseNumber}`}
                draggable={false}
            >
                {chip.buyerName && (
                    <span className="inline-flex items-center gap-0.5">
                        <span className="px-1 py-0.5 rounded text-[10px] font-bold shrink-0 bg-sky-500/10 text-sky-700 dark:text-sky-300">買</span>
                        {chip.buyerName}
                    </span>
                )}
                {chip.sellerName && (
                    <span className="inline-flex items-center gap-0.5">
                        <span className="px-1 py-0.5 rounded text-[10px] font-bold shrink-0 bg-amber-500/10 text-amber-700 dark:text-amber-300">賣</span>
                        {chip.sellerName}
                    </span>
                )}
            </Link>

            <button
                type="button"
                onClick={() => (menuOpen ? onCloseMenu() : onOpenMenu())}
                className="p-0.5 rounded text-foreground/40 hover:text-foreground hover:bg-black/5 dark:hover:bg-white/10"
                title="選擇所屬象限（可多選）"
                aria-label={`選擇 ${chip.buyerName ?? chip.sellerName ?? ''} 的象限`}
            >
                <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M10 6a2 2 0 110-4 2 2 0 010 4zM10 12a2 2 0 110-4 2 2 0 010 4zM10 18a2 2 0 110-4 2 2 0 010 4z" />
                </svg>
            </button>

            {currentZoneId && (
                <button
                    type="button"
                    onClick={() => onToggleZone(chip.key, currentZoneId)}
                    className="p-0.5 rounded text-foreground/30 hover:text-red-500 hover:bg-red-500/10"
                    title="從此格移除"
                    aria-label={`把 ${chip.buyerName ?? chip.sellerName ?? ''} 從此格移除`}
                >
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                </button>
            )}

            {menuOpen && (
                <>
                    <div className="fixed inset-0 z-10" onClick={onCloseMenu} />
                    <div role="menu" className="absolute right-0 top-full mt-1 z-20 min-w-[150px] rounded-lg border border-border-color bg-white dark:bg-slate-800 shadow-lg py-1">
                        {zones.map((zone) => {
                            const checked = memberships.includes(zone.id);
                            return (
                                <button
                                    key={zone.id}
                                    type="button"
                                    onClick={() => onToggleZone(chip.key, zone.id)}
                                    className="w-full text-left px-3 py-1.5 text-xs text-foreground hover:bg-primary/10 flex items-center gap-2"
                                >
                                    <span className={`w-3.5 h-3.5 rounded border flex items-center justify-center shrink-0 ${checked ? 'bg-primary border-primary text-white' : 'border-gray-300'}`}>
                                        {checked && (
                                            <svg className="w-2.5 h-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                                            </svg>
                                        )}
                                    </span>
                                    {zoneDisplayLabel(zone)}
                                </button>
                            );
                        })}
                        <button
                            type="button"
                            disabled={memberships.length === 0}
                            onClick={() => {
                                onCloseMenu();
                                onClearZones(chip.key);
                            }}
                            className="w-full text-left px-3 py-1.5 text-xs text-foreground/60 border-t border-border-color hover:bg-primary/10 disabled:opacity-40 disabled:cursor-default"
                        >
                            移回待分類
                        </button>
                    </div>
                </>
            )}
        </div>
    );
}
