import React, { useState } from 'react';

interface InfoTooltipProps {
  text: string;
  position?: 'top' | 'right' | 'left';
}

export default function InfoTooltip({ text, position = 'top' }: InfoTooltipProps) {
  const [visible, setVisible] = useState(false);
  if (!text) return null;

  const posStyle: React.CSSProperties = position === 'top'
    ? { bottom: '130%', left: '50%', transform: 'translateX(-50%)' }
    : position === 'right'
    ? { left: '130%', top: '50%', transform: 'translateY(-50%)' }
    : { right: '130%', top: '50%', transform: 'translateY(-50%)' };

  return (
    <span style={{ position: 'relative', display: 'inline-flex', alignItems: 'center', verticalAlign: 'middle' }}>
      <span
        onMouseEnter={() => setVisible(true)}
        onMouseLeave={() => setVisible(false)}
        style={{
          display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
          width: 15, height: 15, borderRadius: '50%',
          background: 'rgba(201,168,76,0.15)',
          border: '1px solid rgba(201,168,76,0.45)',
          color: '#c9a84c', fontSize: 9, fontWeight: 700,
          cursor: 'help', fontFamily: "'IBM Plex Mono', monospace",
          marginLeft: 5, flexShrink: 0, userSelect: 'none',
        }}
      >ⓘ</span>
      {visible && (
        <div style={{
          position: 'absolute',
          ...posStyle,
          background: '#111827',
          border: '1px solid rgba(180,145,60,0.45)',
          borderRadius: 8, padding: '8px 12px',
          fontSize: 11, color: '#e8eaf0',
          zIndex: 9999, whiteSpace: 'normal',
          maxWidth: 220, minWidth: 140,
          boxShadow: '0 8px 24px rgba(0,0,0,0.75)',
          lineHeight: 1.6, pointerEvents: 'none',
          fontFamily: "'Inter', sans-serif",
        }}>
          {text}
        </div>
      )}
    </span>
  );
}
