'use client';

import React, { useState } from 'react';
import PersonChip from './PersonChip';
import QuadrantCell from './QuadrantCell';
import { decodeDragPayload } from './chipUtils';
import { useEisenhowerMatrix } from './useEisenhowerMatrix';
import { MAX_ZONES, MIN_ZONES } from './types';

/**
 * 首頁艾森豪矩陣（位於「未來 7 日預告」下方、「智慧待辦中心」上方）：
 * 上方「待分類」橫列 + 下方自訂象限格（2–8 格），名片可拖曳分類，全部為個人設定。
 */
export default function EisenhowerMatrix() {
    const { chips, matrix, loading, unclassifiedChips, chipsInZone, moveChip, toggleZone, clearZones, renameZone, addZone, removeZone } =
        useEisenhowerMatrix();
    const [stagingDragOver, setStagingDragOver] = useState(false);
    /** 開啟中的多選選單（anchor = 開啟時所在容器）；選單開啟期間把名片釘在原容器，勾選不會讓選單消失 */
    const [menu, setMenu] = useState<{ chipKey: string; anchor: string | null } | null>(null);
    const closeMenu = () => setMenu(null);

    const pinChip = (list: typeof chips, anchor: string | null) => {
        if (!menu || menu.anchor !== anchor || list.some((c) => c.key === menu.chipKey)) return list;
        const pinned = chips.find((c) => c.key === menu.chipKey);
        return pinned ? [...list, pinned] : list;
    };

    if (loading) {
        return <div className="glass-card p-4 h-[220px] skeleton rounded-2xl" />;
    }

    return (
        <section className="glass-card p-4 rounded-2xl animate-fade-in">
            <div className="flex items-center justify-between mb-3">
                <h2 className="text-base font-bold text-foreground/80 flex items-center gap-2">
                    <svg className="w-4 h-4 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4h7v7H4V4zm9 0h7v7h-7V4zM4 13h7v7H4v-7zm9 0h7v7h-7v-7z" />
                    </svg>
                    四象限焦點（買賣方）
                </h2>
                {matrix.zones.length < MAX_ZONES && (
                    <button
                        type="button"
                        onClick={addZone}
                        className="px-2.5 py-1 text-xs font-bold text-primary border border-dashed border-primary/40 rounded-lg hover:bg-primary/5 hover:border-primary transition-all active:scale-95"
                        title={`新增象限（最多 ${MAX_ZONES} 格）`}
                    >
                        ＋ 新增象限
                    </button>
                )}
            </div>

            {chips.length === 0 ? (
                <p className="text-sm text-foreground/40 py-6 text-center">
                    目前沒有進行中案件的買賣方名片。新增案件後，姓名會自動出現在這裡。
                </p>
            ) : (
                <>
                    <div
                        onDragOver={(e) => {
                            e.preventDefault();
                            setStagingDragOver(true);
                        }}
                        onDragLeave={() => setStagingDragOver(false)}
                        onDrop={(e) => {
                            e.preventDefault();
                            setStagingDragOver(false);
                            const payload = decodeDragPayload(e.dataTransfer.getData('text/plain'));
                            if (payload) moveChip(payload.chipKey, payload.fromZoneId, null);
                        }}
                        className={`rounded-xl border border-dashed p-3 mb-3 transition-colors ${
                            stagingDragOver ? 'bg-primary/10 border-primary' : 'border-border-color bg-white/30 dark:bg-slate-800/30'
                        }`}
                    >
                        <div className="text-xs font-medium text-foreground/50 mb-1.5">
                            待分類（{unclassifiedChips.length}）
                        </div>
                        <div className="flex flex-wrap gap-1.5">
                            {pinChip(unclassifiedChips, null).map((chip) => (
                                <PersonChip
                                    key={chip.key}
                                    chip={chip}
                                    zones={matrix.zones}
                                    currentZoneId={null}
                                    memberships={matrix.placements[chip.key] ?? []}
                                    menuOpen={menu?.anchor === null && menu.chipKey === chip.key}
                                    onOpenMenu={() => setMenu({ chipKey: chip.key, anchor: null })}
                                    onCloseMenu={closeMenu}
                                    onToggleZone={toggleZone}
                                    onClearZones={clearZones}
                                />
                            ))}
                            {unclassifiedChips.length === 0 && !menu && (
                                <span className="text-xs text-foreground/30">全部名片已分類，拖回這裡可取消分類</span>
                            )}
                        </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {matrix.zones.map((zone, index) => (
                            <QuadrantCell
                                key={zone.id}
                                zone={zone}
                                index={index}
                                zones={matrix.zones}
                                chips={pinChip(chipsInZone(zone.id), zone.id)}
                                placements={matrix.placements}
                                canDelete={matrix.zones.length > MIN_ZONES}
                                menuChipKey={menu?.anchor === zone.id ? menu.chipKey : null}
                                onOpenMenu={(chipKey) => setMenu({ chipKey, anchor: zone.id })}
                                onCloseMenu={closeMenu}
                                onMove={moveChip}
                                onToggleZone={toggleZone}
                                onClearZones={clearZones}
                                onRename={renameZone}
                                onDelete={removeZone}
                            />
                        ))}
                    </div>
                </>
            )}
        </section>
    );
}
