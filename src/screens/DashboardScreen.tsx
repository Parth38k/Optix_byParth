import React, { useRef, useState, useEffect, useCallback } from 'react';
import { useAppState } from '@/contexts/AppState';
import { TICKERS, STRATEGIES, STRATEGY_EXPLANATIONS, SECTOR_COLORS } from '@/lib/instruments';
import TickerCard from '@/components/TickerCard';

const C = {
  bg:         '#06080f',
  surface:    '#0c1018',
  surfaceUp:  '#111827',
  border:     '#1c2333',
  borderGold: 'rgba(180,145,60,0.35)',
  gold:       '#c9a84c',
  goldLight:  '#e2c97e',
  goldDim:    'rgba(201,168,76,0.12)',
  goldDimB:   'rgba(201,168,76,0.25)',
  text:       '#e8eaf0',
  textMid:    '#8a95a8',
  textDim:    '#3d4a5c',
  green:      '#34d399',
  red:        '#f87171',
  orange:     '#fb923c',
  blue:       '#60a5fa',
  mono:       "'IBM Plex Mono', monospace",
};
const goldGrad = 'linear-gradient(135deg,#c9a84c,#e2c97e,#b8960a)';

const RISK_COLORS = { Low: C.green, Med: C.orange, High: C.red };

export default function DashboardScreen() {
  const {
    ticker, setTicker, strat, setStrat, prices, prevPrices, history, positions,
    goToBuilder, lastUpdate, userProfile,
  } = useAppState();

  // ── Ticker Tape ────────────────────────────────────────────────────────────
  const tapeRef = useRef<HTMLDivElement>(null);
  const rafRef = useRef<number>(0);
  const posRef = useRef(0);
  const pausedRef = useRef(false);
  const [tapePaused, setTapePaused] = useState(false);
  const [searchQ, setSearchQ] = useState('');
  const [sectorFilter, setSectorFilter] = useState('All');
  const [typeFilter, setTypeFilter] = useState('All');

  const filteredTickers = TICKERS.filter(t => {
    const matchSearch = t.sym.toLowerCase().includes(searchQ.toLowerCase()) ||
      t.name.toLowerCase().includes(searchQ.toLowerCase());
    const matchSector = sectorFilter === 'All' || t.sector === sectorFilter;
    const matchType = typeFilter === 'All' || t.type === typeFilter;
    return matchSearch && matchSector && matchType;
  });

  const sectors = ['All', ...Array.from(new Set(TICKERS.map(t => t.sector)))];

  const scroll = useCallback(() => {
    const el = tapeRef.current;
    if (!el || pausedRef.current) {
      rafRef.current = requestAnimationFrame(scroll);
      return;
    }
    posRef.current += 0.6;
    const half = el.scrollWidth / 2;
    if (posRef.current >= half) posRef.current = 0;
    el.style.transform = `translateX(-${posRef.current}px)`;
    rafRef.current = requestAnimationFrame(scroll);
  }, []);

  useEffect(() => {
    rafRef.current = requestAnimationFrame(scroll);
    return () => cancelAnimationFrame(rafRef.current);
  }, [scroll]);

  function togglePause() {
    pausedRef.current = !pausedRef.current;
    setTapePaused(p => !p);
  }

  // Overview stats
  const spy = prices['SPY'] || 540;
  const spyPrev = prevPrices['SPY'] || spy;
  const spyChg = ((spy - spyPrev) / spyPrev) * 100;
  const vix = prices['VIX'] || 15;
  const openPositions = positions.filter(p => p.status === 'Active').length;

  const tierColor = userProfile
    ? userProfile.tier === 'Advanced' ? C.green : userProfile.tier === 'Standard' ? C.orange : C.red
    : C.textMid;

  return (
    <div style={{ background: C.bg, minHeight: '100vh', paddingTop: 60 }}>
      {/* ── Ticker Tape ── */}
      <div style={{
        background: C.surface,
        borderBottom: `1px solid ${C.border}`,
        borderTop: `1px solid ${C.border}`,
        overflow: 'hidden',
        position: 'relative',
        height: 44,
      }}>
        <div
          ref={tapeRef}
          onMouseEnter={() => { pausedRef.current = true; setTapePaused(true); }}
          onMouseLeave={() => { pausedRef.current = false; setTapePaused(false); }}
          style={{ display: 'flex', gap: 32, whiteSpace: 'nowrap', willChange: 'transform', padding: '0 16px' }}
        >
          {[...filteredTickers, ...filteredTickers].map((t, i) => {
            const p = prices[t.sym] || t.seed;
            const pp = prevPrices[t.sym] || p;
            const chg = ((p - pp) / pp) * 100;
            const isUp = chg >= 0;
            return (
              <div
                key={`${t.sym}-${i}`}
                onClick={() => setTicker(t.sym)}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 8,
                  cursor: 'pointer',
                  height: 44,
                  borderLeft: `2px solid ${SECTOR_COLORS[t.sector] || '#8a95a8'}`,
                  paddingLeft: 10,
                }}
              >
                <span style={{ fontFamily: C.mono, fontWeight: 700, fontSize: 12, color: t.sym === ticker ? C.gold : C.text }}>{t.sym}</span>
                <span style={{ fontFamily: C.mono, fontSize: 12, color: C.textMid }}>${p.toFixed(2)}</span>
                <span style={{ fontFamily: C.mono, fontSize: 11, color: isUp ? C.green : C.red }}>
                  {isUp ? '▲' : '▼'}{Math.abs(chg).toFixed(2)}%
                </span>
              </div>
            );
          })}
        </div>
        <button
          onClick={togglePause}
          style={{
            position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)',
            background: C.surfaceUp, border: `1px solid ${C.border}`, borderRadius: 4,
            color: C.textMid, fontSize: 10, padding: '3px 8px', cursor: 'pointer',
          }}
        >
          {tapePaused ? '▶' : '⏸'}
        </button>
      </div>

      <div style={{ maxWidth: 1400, margin: '0 auto', padding: '24px 20px' }}>
        {/* Filters */}
        <div style={{ display: 'flex', gap: 10, marginBottom: 24, flexWrap: 'wrap' }}>
          <input
            value={searchQ}
            onChange={e => setSearchQ(e.target.value)}
            placeholder="Search ticker or name…"
            style={{
              background: C.surface, border: `1px solid ${C.border}`, borderRadius: 8,
              padding: '8px 14px', color: C.text, fontSize: 13, width: 200,
              outline: 'none',
            }}
          />
          <div style={{ display: 'flex', gap: 6 }}>
            {sectors.map(s => (
              <button key={s} onClick={() => setSectorFilter(s)} style={{
                padding: '6px 12px', borderRadius: 6, fontSize: 12, cursor: 'pointer',
                background: sectorFilter === s ? C.goldDim : C.surface,
                border: `1px solid ${sectorFilter === s ? C.gold : C.border}`,
                color: sectorFilter === s ? C.gold : C.textMid,
              }}>{s}</button>
            ))}
          </div>
          <div style={{ display: 'flex', gap: 6 }}>
            {['All', 'Stock', 'ETF'].map(tp => (
              <button key={tp} onClick={() => setTypeFilter(tp)} style={{
                padding: '6px 12px', borderRadius: 6, fontSize: 12, cursor: 'pointer',
                background: typeFilter === tp ? C.goldDim : C.surface,
                border: `1px solid ${typeFilter === tp ? C.gold : C.border}`,
                color: typeFilter === tp ? C.gold : C.textMid,
              }}>{tp}</button>
            ))}
          </div>
        </div>

        {/* Ticker Cards Grid */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 10, marginBottom: 28 }}>
          {filteredTickers.map(t => (
            <TickerCard
              key={t.sym}
              sym={t.sym}
              name={t.name}
              price={prices[t.sym] || t.seed}
              prevPrice={prevPrices[t.sym] || t.seed}
              history={history[t.sym] || []}
              selected={ticker === t.sym}
              onClick={() => setTicker(t.sym)}
              sector={t.sector}
            />
          ))}
        </div>

        {/* Market Overview Stats */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(180px,1fr))', gap: 12, marginBottom: 32 }}>
          {[
            { label: 'SPY', val: `$${spy.toFixed(2)}`, sub: `${spyChg >= 0 ? '▲' : '▼'}${Math.abs(spyChg).toFixed(2)}%`, subColor: spyChg >= 0 ? C.green : C.red },
            { label: 'VIX', val: vix.toFixed(2), sub: 'Volatility Index', subColor: C.textMid },
            { label: 'Open Positions', val: String(openPositions), sub: 'Paper Trades', subColor: C.textMid },
            { label: 'Last Update', val: lastUpdate || '--:--:--', sub: 'Live Prices', subColor: C.green },
          ].map(item => (
            <div key={item.label} style={{
              background: C.surface, border: `1px solid ${C.border}`,
              borderRadius: 10, padding: '14px 18px',
            }}>
              <div style={{ color: C.textMid, fontSize: 11, marginBottom: 6 }}>{item.label}</div>
              <div style={{ fontFamily: C.mono, fontSize: 20, fontWeight: 700, color: C.text }}>{item.val}</div>
              <div style={{ fontFamily: C.mono, fontSize: 11, color: item.subColor, marginTop: 4 }}>{item.sub}</div>
            </div>
          ))}
        </div>

        {/* Strategy Library */}
        <div style={{ marginBottom: 32 }}>
          <div style={{ color: C.textMid, fontSize: 12, fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 16 }}>
            Strategy Library
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 10 }}>
            {Object.entries(STRATEGIES).map(([name, info]) => {
              const selected = strat === name;
              const exp = STRATEGY_EXPLANATIONS[name];
              return (
                <StratCard
                  key={name}
                  name={name}
                  info={info}
                  selected={selected}
                  explanation={exp?.simple || ''}
                  onClick={() => setStrat(name)}
                  onBuild={() => { setStrat(name); goToBuilder(); }}
                />
              );
            })}
          </div>
        </div>

        {/* CTA Bar */}
        <div style={{
          position: 'sticky', bottom: 0, background: C.surface,
          borderTop: `1px solid ${C.borderGold}`, padding: '14px 20px',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          flexWrap: 'wrap', gap: 12,
        }}>
          <div style={{ color: C.textMid, fontSize: 14 }}>
            Selected:{' '}
            <span style={{ color: C.gold, fontWeight: 600 }}>{strat}</span>
            {' '}on{' '}
            <span style={{ color: C.text, fontWeight: 600 }}>{ticker}</span>
            {' '}@{' '}
            <span style={{ fontFamily: C.mono, color: C.text }}>${(prices[ticker] || 0).toFixed(2)}</span>
          </div>
          <button
            onClick={goToBuilder}
            style={{
              background: goldGrad, border: 'none', borderRadius: 8,
              padding: '10px 24px', color: '#06080f', fontWeight: 700,
              fontSize: 14, cursor: 'pointer', letterSpacing: '0.04em',
            }}
          >
            Build Strategy →
          </button>
        </div>
      </div>
    </div>
  );
}

interface StratCardProps {
  name: string;
  info: { risk: 'Low' | 'Med' | 'High'; view: string; legs: number };
  selected: boolean;
  explanation: string;
  onClick: () => void;
  onBuild: () => void;
}

function StratCard({ name, info, selected, explanation, onClick, onBuild }: StratCardProps) {
  const [hovered, setHovered] = useState(false);
  const riskColor = RISK_COLORS[info.risk];

  return (
    <div
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        background: hovered ? C.surfaceUp : C.surface,
        border: `1px solid ${selected ? C.gold : C.border}`,
        borderRadius: 10, padding: '14px 16px', cursor: 'pointer',
        transition: 'all 0.15s ease', position: 'relative',
        boxShadow: selected ? `0 0 16px rgba(201,168,76,0.15)` : 'none',
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
        <div style={{ fontWeight: 600, fontSize: 14, color: selected ? C.gold : C.text }}>{name}</div>
        <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
          <span style={{
            fontSize: 10, padding: '2px 7px', borderRadius: 4,
            background: `${riskColor}22`, color: riskColor, fontWeight: 600,
          }}>{info.risk}</span>
          <span style={{ fontSize: 10, color: C.textDim, fontFamily: C.mono }}>{info.legs}L</span>
        </div>
      </div>
      <div style={{ color: C.textMid, fontSize: 12, lineHeight: 1.4 }}>{info.view}</div>

      {hovered && (
        <div style={{
          position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(6,8,15,0.92)', borderRadius: 10,
          display: 'flex', flexDirection: 'column', alignItems: 'center',
          justifyContent: 'center', padding: 16, gap: 10,
        }}>
          <div style={{ color: C.textMid, fontSize: 12, textAlign: 'center', lineHeight: 1.5 }}>
            {explanation}
          </div>
          <button
            onClick={e => { e.stopPropagation(); onBuild(); }}
            style={{
              background: goldGrad, border: 'none', borderRadius: 6,
              padding: '8px 16px', color: '#06080f', fontWeight: 700,
              fontSize: 12, cursor: 'pointer',
            }}
          >
            Build This →
          </button>
        </div>
      )}
    </div>
  );
}
