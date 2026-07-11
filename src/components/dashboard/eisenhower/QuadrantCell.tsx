'use client';

import React, { useState } from 'react';
import PersonChip from './PersonChip';
import { decodeDragPayload, zoneDisplayLabel } from './chipUtils';
import type { EisenhowerZone, PersonChipData } from './types';

/** accent 色依象限索引循環（非投資漲跌語意，僅視覺區隔） */
const ZONE_ACCENTS = [
    'border-t-rose-400',
    'border-t-amber-400',
    'border-t-sky-400',
    'border-t-slate-300',
    'border-t-violet-400',
    'border-t-emerald-400',
    'border-t-orange-400',
    'border-t-cyan-400',
];

interface QuadrantCellProps {
    zone: EisenhowerZone;
    index: number;
    zones: EisenhowerZone[];
    chips: PersonChipData[];
    placements: Record<string, string[]>;
    canDelete: boolean;
    onMove: (chipKey: string, fromZoneId: string | null, toZoneId: string | null) => void;
    onToggleZone: (chipKey: string, zoneId: string) => void;
    onClearZones: (chipKey: string) => void;
    onRename: (zoneId: string, title: string) => void;
    onDelete: (zoneId: string) => void;
}

/** 單一象限：drop target（搬家語意）+ 可就地編輯的標題（清空回預設）+ 刪除控制 */
export default function QuadrantCell({ zone, index, zones, chips, placements, canDelete, onMove, onToggleZone, onClearZones, onRename, onDelete }: QuadrantCellProps) {
    const [editing, setEditing] = useState(false);
    const [draft, setDraft] = useState('');
    const [dragOver, setDragOver] = useState(false);

    const label = zoneDisplayLabel(zone);

    const commitEdit = () => {
        setEditing(false);
        onRename(zone.id, draft);
    };

    const handleDelete = () => {
        if (window.confirm(`確定刪除象限「${label}」？其中的名片會退回待分類。`)) {
            onDelete(zone.id);
        }
    };

    return (
        <div
            onDragOver={(e) => {
                e.preventDefault();
                setDragOver(true);
            }}
            onDragLeave={() => setDragOver(false)}
            onDrop={(e) => {
                e.preventDefault();
                setDragOver(false);
                const payload = decodeDragPayload(e.dataTransfer.getData('text/plain'));
                if (payload) onMove(payload.chipKey, payload.fromZoneId, zone.id);
            }}
            className={`rounded-xl border border-border-color border-t-4 ${ZONE_ACCENTS[index % ZONE_ACCENTS.length]} p-3 min-h-[120px] transition-colors ${
                dragOver ? 'bg-primary/10 border-primary' : 'bg-white/40 dark:bg-slate-800/40'
            }`}
        >
            <div className="flex items-start justify-between gap-2 mb-2">
                {editing ? (
                    <input
                        type="text"
                        value={draft}
                        onChange={(e) => setDraft(e.target.value)}
                        onBlur={commitEdit}
                        onKeyDown={(e) => e.key === 'Enter' && commitEdit()}
                        placeholder={label}
                        autoFocus
                        className="w-full px-2 py-1 text-sm font-bold bg-white/50 backdrop-blur-sm border border-gray-200 rounded focus:bg-white focus:outline-none"
                    />
                ) : (
                    <button
                        type="button"
                        onClick={() => {
                            setDraft(zone.label);
                            setEditing(true);
                        }}
                        className="text-sm font-bold text-foreground/80 hover:text-primary flex items-center gap-1"
                        title="點擊編輯象限標題"
                    >
                        {label}
                        <svg className="w-3 h-3 opacity-40" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                        </svg>
                    </button>
                )}
                <button
                    type="button"
                    onClick={handleDelete}
                    disabled={!canDelete}
                    className="p-0.5 rounded text-foreground/30 hover:text-red-500 hover:bg-red-500/10 disabled:opacity-30 disabled:cursor-not-allowed shrink-0"
                    title={canDelete ? '刪除此象限' : '至少保留 2 個象限'}
                    aria-label={`刪除象限 ${label}`}
                >
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                </button>
            </div>

            <div className="flex flex-wrap gap-1.5">
                {chips.map((chip) => (
                    <PersonChip
                        key={chip.key}
                        chip={chip}
                        zones={zones}
                        currentZoneId={zone.id}
                        memberships={placements[chip.key] ?? []}
                        onToggleZone={onToggleZone}
                        onClearZones={onClearZones}
                    />
                ))}
                {chips.length === 0 && <span className="text-xs text-foreground/30">拖曳名片到這裡</span>}
            </div>
        </div>
    );
}
