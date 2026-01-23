'use client';

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { DialogFooter } from '@/components/ui/dialog';
import { RealEstateGuideline } from '@/data/real_estate_guidelines';

interface AddGuidelineFormProps {
    onSubmit: (data: Omit<RealEstateGuideline, 'id' | 'created_at' | 'updated_at' | 'created_by'>) => void;
}

export function AddGuidelineForm({ onSubmit }: AddGuidelineFormProps) {
    const [formData, setFormData] = useState({
        role: '買方',
        scenario: '',
        legal_info: '',
        required_docs: '',
        processing_time: '',
        special_clauses: '',
        caution: ''
    });

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onSubmit(formData);
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-6 py-6">
            <div className="grid grid-cols-2 gap-6">
                <div className="space-y-2">
                    <Label htmlFor="role" className="text-base font-bold text-slate-700">角色對象</Label>
                    <Input
                        id="role"
                        value={formData.role}
                        onChange={e => setFormData({ ...formData, role: e.target.value })}
                        placeholder="例如：買方、賣方"
                        required
                        className="h-12 text-base"
                    />
                </div>
                <div className="space-y-2">
                    <Label htmlFor="scenario" className="text-base font-bold text-slate-700">情境類別</Label>
                    <Input
                        id="scenario"
                        value={formData.scenario}
                        onChange={e => setFormData({ ...formData, scenario: e.target.value })}
                        placeholder="例如：外國人購屋"
                        required
                        className="h-12 text-base"
                    />
                </div>
            </div>

            <div className="space-y-2">
                <Label htmlFor="legal" className="text-base font-bold text-slate-700">法規須知</Label>
                <Textarea
                    id="legal"
                    value={formData.legal_info}
                    onChange={e => setFormData({ ...formData, legal_info: e.target.value })}
                    placeholder="請輸入相關法條或規定..."
                    className="min-h-[200px] text-base leading-relaxed p-4"
                />
            </div>

            <div className="space-y-2">
                <Label htmlFor="docs" className="text-base font-bold text-slate-700">應備文件</Label>
                <Textarea
                    id="docs"
                    value={formData.required_docs}
                    onChange={e => setFormData({ ...formData, required_docs: e.target.value })}
                    placeholder="請條列出需要準備的文件項目..."
                    className="min-h-[150px] text-base leading-relaxed p-4"
                />
            </div>

            <div className="space-y-2">
                <Label htmlFor="special_clauses" className="text-base font-bold text-slate-700">特約條款參考</Label>
                <Textarea
                    id="special_clauses"
                    value={formData.special_clauses}
                    onChange={e => setFormData({ ...formData, special_clauses: e.target.value })}
                    placeholder="請輸入建議的特約條款內文..."
                    className="min-h-[100px] text-base leading-relaxed p-4"
                />
            </div>

            <div className="grid grid-cols-2 gap-6">
                <div className="space-y-2">
                    <Label htmlFor="time" className="text-base font-bold text-slate-700">作業時間</Label>
                    <Input
                        id="time"
                        value={formData.processing_time}
                        onChange={e => setFormData({ ...formData, processing_time: e.target.value })}
                        placeholder="例如：7-14 個工作天"
                        className="h-12 text-base"
                    />
                </div>
                <div className="space-y-2">
                    <Label htmlFor="caution" className="text-base font-bold text-slate-700">特別注意</Label>
                    <Input
                        id="caution"
                        value={formData.caution}
                        onChange={e => setFormData({ ...formData, caution: e.target.value })}
                        placeholder="重要提醒事項..."
                        className="h-12 text-base"
                    />
                </div>
            </div>

            <DialogFooter className="pt-4">
                <Button type="submit" size="lg" className="w-full sm:w-auto text-base px-8">確認新增</Button>
            </DialogFooter>
        </form>
    );
}
