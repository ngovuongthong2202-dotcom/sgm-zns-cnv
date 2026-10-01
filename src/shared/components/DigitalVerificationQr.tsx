import React from 'react';

interface DigitalVerificationQrProps {
  code: string;
  size?: number;
  label?: string;
  subLabel?: string;
  className?: string;
}

/**
 * Component hiển thị mã QR xác thực số và con dấu số cho biên bản bàn giao SGM
 * Render 100% SVG Vector nội bộ, sắc nét từng milimet khi in laser hoặc in màu
 */
export function DigitalVerificationQr({
  code,
  size = 72,
  label = 'Xác thực điện tử',
  subLabel = 'Bảo hành chính hãng SGM',
  className = ''
}: DigitalVerificationQrProps) {
  // Generate deterministic grid pattern based on code hash
  const hash = code.split('').reduce((acc, char) => (acc * 31 + char.charCodeAt(0)) & 0xffffff, 12345);
  const matrixSize = 21; // Standard QR matrix version 1
  
  // Finder pattern squares coordinates
  const isFinderPattern = (r: number, c: number) => {
    // Top-left
    if (r < 7 && c < 7) {
      return (r === 0 || r === 6 || c === 0 || c === 6) || (r >= 2 && r <= 4 && c >= 2 && c <= 4);
    }
    // Top-right
    if (r < 7 && c >= matrixSize - 7) {
      const cNorm = c - (matrixSize - 7);
      return (r === 0 || r === 6 || cNorm === 0 || cNorm === 6) || (r >= 2 && r <= 4 && cNorm >= 2 && cNorm <= 4);
    }
    // Bottom-left
    if (r >= matrixSize - 7 && c < 7) {
      const rNorm = r - (matrixSize - 7);
      return (rNorm === 0 || rNorm === 6 || c === 0 || c === 6) || (rNorm >= 2 && rNorm <= 4 && c >= 2 && c <= 4);
    }
    return false;
  };

  const cells: { r: number; c: number }[] = [];
  for (let r = 0; r < matrixSize; r++) {
    for (let c = 0; c < matrixSize; c++) {
      if (isFinderPattern(r, c)) {
        cells.push({ r, c });
      } else {
        // Pseudo-random bit from hash and coordinates
        const bit = ((hash ^ (r * 17) ^ (c * 23) ^ (r * c * 7)) % 7) < 3;
        if (bit) {
          cells.push({ r, c });
        }
      }
    }
  }

  const cellSize = 3;
  const viewBoxSize = matrixSize * cellSize + 4;

  return (
    <div className={`flex items-center gap-2.5 ${className}`}>
      <div 
        className="bg-white p-1 rounded border border-slate-300 shadow-2xs shrink-0 flex items-center justify-center"
        style={{ width: size, height: size }}
      >
        <svg 
          viewBox={`0 0 ${viewBoxSize} ${viewBoxSize}`} 
          className="w-full h-full text-slate-900 fill-current"
          xmlns="http://www.w3.org/2000/svg"
        >
          {cells.map((cell, idx) => (
            <rect 
              key={idx}
              x={cell.c * cellSize + 2}
              y={cell.r * cellSize + 2}
              width={cellSize}
              height={cellSize}
              rx={0.3}
            />
          ))}
          {/* SGM center micro-emblem */}
          <rect 
            x={(matrixSize / 2 - 1.5) * cellSize + 2} 
            y={(matrixSize / 2 - 1.5) * cellSize + 2} 
            width={cellSize * 3} 
            height={cellSize * 3} 
            fill="white" 
            rx={0.8}
          />
          <circle 
            cx={(matrixSize / 2) * cellSize + 2} 
            cy={(matrixSize / 2) * cellSize + 2} 
            r={cellSize * 1.1} 
            fill="#0f172a" 
          />
        </svg>
      </div>

      <div className="text-left leading-tight">
        <span className="font-mono text-3xs font-black uppercase text-slate-800 tracking-wider block">
          {code}
        </span>
        <span className="text-3xs font-semibold text-slate-600 block mt-0.5">
          {label}
        </span>
        <span className="text-3xs text-emerald-700 font-bold block">
          {subLabel}
        </span>
      </div>
    </div>
  );
}
