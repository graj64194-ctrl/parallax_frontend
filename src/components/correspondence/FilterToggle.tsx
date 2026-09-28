import React from 'react';
import { useParallax } from '../../state/ParallaxContext';
import { MatchFilterType } from '../../types/correspondence';
import { CheckCircle2, XCircle, Layers, Eye } from 'lucide-react';

export const FilterToggle: React.FC = () => {
  const { matchFilter, setMatchFilter, matchPairs, sourceKeypoints, setCursorLabel } = useParallax();

  const inliersCount = matchPairs.filter(m => m.isRansacInlier).length;
  const outliersCount = matchPairs.filter(m => !m.isRansacInlier).length;

  const filters: { id: MatchFilterType; label: string; count: number; icon: React.ReactNode; color: string }[] = [
    {
      id: 'ANMS_ONLY',
      label: 'ANMS DISTRIBUTED',
      count: matchPairs.filter(m => m.isRansacInlier && m.isAnmsSelected).length,
      icon: <CheckCircle2 className="h-3.5 w-3.5 text-cyan-accent" />,
      color: 'text-cyan-accent border-cyan-accent/40 bg-cyan-accent/10',
    },
    {
      id: 'INLIERS',
      label: 'VERIFIED INLIERS',
      count: inliersCount,
      icon: <CheckCircle2 className="h-3.5 w-3.5 text-match-green" />,
      color: 'text-match-green border-match-green/40 bg-match-green/10',
    },
    {
      id: 'OUTLIERS',
      label: 'REJECTED OUTLIERS',
      count: outliersCount,
      icon: <XCircle className="h-3.5 w-3.5 text-match-outlier" />,
      color: 'text-match-outlier border-match-outlier/40 bg-match-outlier/10',
    },
    {
      id: 'CANDIDATES',
      label: 'ALL CANDIDATES',
      count: matchPairs.length,
      icon: <Eye className="h-3.5 w-3.5 text-amber-400" />,
      color: 'text-amber-400 border-amber-400/40 bg-amber-400/10',
    },
    {
      id: 'ALL_FEATURES',
      label: 'RAW KEYPOINTS',
      count: sourceKeypoints.length,
      icon: <Layers className="h-3.5 w-3.5 text-lunar-300" />,
      color: 'text-white border-white/40 bg-white/10',
    },
  ];

  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="font-mono-tech text-[10px] text-lunar-400 uppercase mr-1">
        CORRESPONDENCE FILTER:
      </span>
      {filters.map((f) => {
        const isActive = matchFilter === f.id;
        return (
          <button
            key={f.id}
            onClick={() => setMatchFilter(f.id)}
            onMouseEnter={() => setCursorLabel(`SHOW ${f.label}`)}
            onMouseLeave={() => setCursorLabel('')}
            className={`flex items-center gap-1.5 px-3 py-1 rounded font-mono-tech text-xs tracking-wider border transition-all ${
              isActive
                ? `${f.color} shadow-sm font-semibold`
                : 'bg-space-950/60 border-white/10 text-lunar-400 hover:text-white hover:bg-white/5'
            }`}
          >
            {f.icon}
            <span>{f.label}</span>
            <span className="ml-1 px-1.5 py-0.2 rounded text-[10px] bg-white/5 border border-white/10">
              {f.count}
            </span>
          </button>
        );
      })}
    </div>
  );
};
