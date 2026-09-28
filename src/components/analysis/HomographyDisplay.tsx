import React from 'react';
import { useParallax } from '../../state/ParallaxContext';
import { Binary, Move } from 'lucide-react';

export const HomographyDisplay: React.FC = () => {
  const { metrics, explainMode, setCursorLabel } = useParallax();
  const matrix = metrics.homographyMatrix;

  return (
    <div className="bg-[#161616] rounded-none sm:rounded-sm p-5 border border-[#262626] space-y-3 text-left">
      <div className="flex items-center justify-between border-b border-[#262626] pb-3">
        <div className="flex items-center gap-2">
          <Binary className="h-4 w-4 text-[#A0A0A0]" />
          <h4 className="font-sans text-sm font-semibold text-[#F7F7F5]">
            {explainMode ? 'Geometric Transformation Formula' : '3×3 Projective Homography Matrix (H)'}
          </h4>
        </div>
        <span className="text-[10px] font-mono-tech px-2 py-0.5 rounded-none bg-[#111111] border border-[#262626] text-[#8C8C89]">
          DOF: 8
        </span>
      </div>

      <p className="text-xs text-[#8C8C89] font-sans leading-relaxed">
        {explainMode
          ? 'This 3x3 table of numbers tells the computer exactly how to shift, rotate, and stretch Image A so that it lands directly on top of Image B.'
          : 'Planar homography transformation mapping homogeneous coordinates between OHRC reference plane and TMC-2 sensor projection.'}
      </p>

      {/* 3x3 Matrix Grid */}
      <div 
        className="bg-[#111111] p-3 rounded-none border border-[#262626] font-mono-tech text-xs grid grid-cols-3 gap-2 text-center"
        onMouseEnter={() => setCursorLabel('PROJECTIVE MATRIX H')}
        onMouseLeave={() => setCursorLabel('')}
      >
        {matrix.map((row, rIdx) => 
          row.map((val, cIdx) => (
            <div 
              key={`${rIdx}-${cIdx}`}
              className="p-2 rounded-none bg-[#161616] border border-[#262626] text-[#F7F7F5] font-medium hover:border-[#383838] transition-colors"
            >
              <div className="text-[9px] text-[#646462] mb-0.5">h_{rIdx+1}{cIdx+1}</div>
              <div>{val > 0.001 ? val.toFixed(4) : val.toExponential(2)}</div>
            </div>
          ))
        )}
      </div>

      {/* Physical Decomposition Readout */}
      <div className="pt-2 border-t border-[#262626] flex flex-wrap items-center justify-between text-[11px] font-mono-tech text-[#8C8C89] gap-2">
        <div className="flex items-center gap-1.5">
          <Move className="h-3 w-3 text-[#A0A0A0]" />
          <span>Translation: Δx = +14.2 px, Δy = +8.6 px</span>
        </div>
        <div>Scale Factor: 1.040×</div>
        <div>Rotation: -0.98°</div>
      </div>
    </div>
  );
};
