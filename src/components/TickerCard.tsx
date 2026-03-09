import React, { useState } from 'react';
import { SECTOR_COLORS } from '@/lib/instruments';

const C = {
  surface:    '#0c1018',
  surfaceUp:  '#111827',
  border:     '#1c2333',
  gold:       '#c9a84c',
  goldDim:    'rgba(201,168,76,0.12)',
  text:       '#e8eaf0',
  textMid:    '#8a95a8',
  green:      '#34d399',
  red:        '#f87171',
  mono:       "'IBM Plex Mono', monospace",
};

interface Props {
  sym: string;
  name: string;
  price: number;
  prevPrice: number;
  history: number[];
  selected: boolean;
  onClick: () => void;
  sector: string;
}

export default function TickerCard({ sym, name, price, prevPrice, history, selected, onClick, sector }: Props) {
  const [hovered, setHovered] = useState(false);
  const change = prevPrice > 0 ? ((price - prevPrice) / prevPrice) * 100 : 0;
  const isUp = change >= 0;
  const sectorColor = SECTOR_COLORS[sector] || '#8a95a8';

  // Build sparkline SVG path
  const W = 60, H = 24;
  const pts = history.slice(-20);
  let sparkPath = '';
  if (pts.length > 1) {
    const minP = Math.min(...pts);
    const maxP = Math.max(...pts);
    const range = maxP - minP || 1;
    sparkPath = pts
      .map((v, i) => {
        const x = (i / (pts.length - 1)) * W;
        const y = H - ((v - minP) / range) * H;
        return `${i === 0 ? 'M' : 'L'}${x.toFixed(1)},${y.toFixed(1)}`;
      })
      .join(' ');
  }

  return (
    <div
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        background: hovered ? C.surfaceUp : C.surface,
        border: `1px solid ${selected ? C.gold : C.border}`,
        borderLeft: `3px solid ${sectorColor}`,
        borderRadius: 8,
        padding: '10px 12px',
        cursor: 'pointer',
        transition: 'all 0.15s ease',
        boxShadow: selected ? `0 0 12px rgba(201,168,76,0.2)` : 'none',
        minWidth: 160,
        userSelect: 'none',
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 6 }}>
        <div>
          <div style={{ fontFamily: C.mono, fontWeight: 600, fontSize: 14, color: selected ? C.gold : C.text }}>{sym}</div>
          <div style={{ fontSize: 10, color: C.textMid, marginTop: 1, maxWidth: 100, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{name}</div>
        </div>
        <div style={{
          fontSize: 9,
          padding: '2px 6px',
          borderRadius: 4,
          background: `${sectorColor}22`,
          color: sectorColor,
          fontWeight: 600,
          letterSpacing: '0.04em',
        }}>
          {sector}
        </div>
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
        <div>
          <div style={{ fontFamily: C.mono, fontSize: 15, fontWeight: 600, color: C.text }}>
            ${price.toFixed(2)}
          </div>
          <div style={{ fontFamily: C.mono, fontSize: 11, color: isUp ? C.green : C.red, marginTop: 2 }}>
            {isUp ? '▲' : '▼'} {Math.abs(change).toFixed(2)}%
          </div>
        </div>
        <svg width={W} height={H} style={{ overflow: 'visible' }}>
          {sparkPath && (
            <path
              d={sparkPath}
              fill="none"
              stroke={isUp ? C.green : C.red}
              strokeWidth={1.5}
              strokeLinejoin="round"
              strokeLinecap="round"
              opacity={0.8}
            />
          )}
        </svg>
      </div>
    </div>
  );
}
