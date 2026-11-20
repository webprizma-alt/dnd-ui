import React from 'react';
import { Eye } from 'lucide-react';
import type { EntityVisionEntry, VisionRef } from '../../shared/types';

interface VisionSelectorProps {
  catalogVisions: VisionRef[];
  value: EntityVisionEntry[];
  onChange: (next: EntityVisionEntry[]) => void;
  compact?: boolean;
  title?: string;
}

export const VisionSelector: React.FC<VisionSelectorProps> = ({
  catalogVisions,
  value,
  onChange,
  compact = false,
  title = 'Зрение (для тактической карты)',
}) => {
  const byId = new Map<string, EntityVisionEntry>(
    (value || []).map((entry) => [entry.visionId, entry])
  );

  const toggleVision = (vision: VisionRef) => {
    if (byId.has(vision.id)) {
      onChange(value.filter((entry) => entry.visionId !== vision.id));
    } else {
      const defaultRange = vision.behavior === 'normal' ? null : 60;
      onChange([...value, { visionId: vision.id, rangeFt: defaultRange }]);
    }
  };

  const updateRange = (visionId: string, raw: string) => {
    const trimmed = raw.trim();
    const parsed = trimmed === '' ? null : Math.max(5, Math.min(1200, Math.round(Number(trimmed) || 0)));
    onChange(
      value.map((entry) =>
        entry.visionId === visionId
          ? { ...entry, rangeFt: parsed && Number.isFinite(parsed) ? parsed : null }
          : entry
      )
    );
  };

  if (catalogVisions.length === 0) {
    return null;
  }

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <span className="text-[11px] text-slate-400 flex items-center gap-1.5">
          <Eye className="w-3.5 h-3.5 text-sky-400" />
          {title}
        </span>
        <span className="text-[10px] text-slate-500">1 клетка = 5 фт.</span>
      </div>

      <div className={compact ? 'grid grid-cols-1 gap-1.5' : 'grid grid-cols-1 sm:grid-cols-2 gap-1.5'}>
        {catalogVisions.map((vision) => {
          const entry = byId.get(vision.id);
          const checked = Boolean(entry);
          return (
            <div
              key={vision.id}
              title={vision.description}
              className={`flex items-center justify-between gap-2 px-2.5 py-1.5 rounded-lg border transition-colors ${
                checked
                  ? 'bg-sky-500/10 border-sky-500/40 text-sky-100'
                  : 'bg-slate-950/60 border-slate-800 text-slate-400 hover:border-slate-700'
              }`}
            >
              <label className="flex items-center gap-2 cursor-pointer min-w-0 flex-1">
                <input
                  type="checkbox"
                  checked={checked}
                  onChange={() => toggleVision(vision)}
                  className="accent-sky-500 w-3.5 h-3.5 shrink-0"
                />
                <span className="text-xs font-medium truncate">{vision.name}</span>
              </label>

              {checked && (
                <div className="flex items-center gap-1 shrink-0">
                  <input
                    type="number"
                    min={5}
                    max={1200}
                    step={5}
                    value={entry?.rangeFt ?? ''}
                    onChange={(e) => updateRange(vision.id, e.target.value)}
                    placeholder={vision.behavior === 'normal' ? '∞' : '60'}
                    title={
                      vision.behavior === 'normal'
                        ? 'Оставьте пустым для неограниченной дальности в освещённой зоне или укажите дистанцию в футах'
                        : 'Дальность действия зрения в футах'
                    }
                    className="w-16 px-1.5 py-0.5 rounded bg-slate-900 border border-sky-500/40 text-xs text-slate-100 text-center font-mono focus:outline-none focus:border-sky-400"
                  />
                  <span className="text-[10px] text-slate-400">фт.</span>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
