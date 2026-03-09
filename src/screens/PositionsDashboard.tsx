import React, { useState, useMemo } from 'react';
import { useAppState } from '@/contexts/AppState';
import { bsPrice, calcAggGreeks, daysToExpiry, R } from '@/lib/blackScholes';

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

function GreekBar({ label, value, max, desc }: { label: string; value: number; max: number; desc: string }) {
  const [tip, setTip] = useState(false);
  const pct = Math.min(100, (Math.abs(value) / max) * 100);
  const color = value >= 0 ? C.green : C.red;
  return (
    <div style={{ position: 'relative', marginBottom: 8 }} onMouseEnter={() => setTip(true)} onMouseLeave={() => setTip(false)}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 3 }}>
        <span style={{ color: C.textMid, fontSize: 11 }}>{label}</span>
        <span style={{ fontFamily: C.mono, fontSize: 11, color }}>{value.toFixed(3)}</span>
      </div>
      <div style={{ height: 3, background: C.border, borderRadius: 2 }}>
        <div style={{ height: '100%', width: `${pct}%`, background: color, borderRadius: 2 }} />
      </div>
      {tip && (
        <div style={{ position: 'absolute', top: -30, left: 0, background: C.surfaceUp, border: `1px solid ${C.borderGold}`, borderRadius: 6, padding: '4px 8px', fontSize: 10, color: C.textMid, zIndex: 10, whiteSpace: 'nowrap' }}>
          {desc}
        </div>
      )}
    </div>
  );
}

export default function PositionsDashboard() {
  const { positions, prices, updatePositionNotes, closePosition, goToBuilder } = useAppState();
  const [selectedPos, setSelectedPos] = useState<string | null>(null);

  const openPositions = positions.filter(p => p.status === 'Active');

  // Calculate MTM P&L for each position
  const positionsWithPnL = useMemo(() => {
    return openPositions.map(pos => {
      const currentSpot = prices[pos.ticker] || pos.entrySpot;
      let currentValue = 0;
      pos.legs.forEach(leg => {
        const entryT = daysToExpiry(leg.expiry) / 365;
        const currentValue_leg = bsPrice(currentSpot, leg.strike, entryT, R, leg.iv / 100, leg.type);
        const entryValue_leg = bsPrice(pos.entrySpot, leg.strike, entryT, R, leg.iv / 100, leg.type);
        const legPnl = (leg.direction === 'buy' ? currentValue_leg - entryValue_leg : entryValue_leg - currentValue_leg) * leg.qty * 100;
        currentValue += legPnl;
      });
      const minDTE = Math.min(...pos.legs.map(l => daysToExpiry(l.expiry)));
      return { ...pos, pnl: currentValue, currentSpot, minDTE };
    });
  }, [openPositions, prices]);

  const totalPnL = positionsWithPnL.reduce((s, p) => s + p.pnl, 0);
  const totalMargin = openPositions.reduce((s, p) => s + p.meta.margin, 0);
  const expiringCount = positionsWithPnL.filter(p => p.minDTE <= 7).length;

  // Aggregate portfolio greeks
  const portfolioGreeks = useMemo(() => {
    const init = { delta: 0, gamma: 0, theta: 0, vega: 0, rho: 0 };
    openPositions.forEach(pos => {
      const spot = prices[pos.ticker] || pos.entrySpot;
      const g = calcAggGreeks(pos.legs, spot);
      init.delta += g.delta;
      init.gamma += g.gamma;
      init.theta += g.theta;
      init.vega += g.vega;
      init.rho += g.rho;
    });
    return init;
  }, [openPositions, prices]);

  const selected = positionsWithPnL.find(p => p.id === selectedPos);

  return (
    <div style={{ background: C.bg, minHeight: '100vh', paddingTop: 60 }}>
      <div style={{ maxWidth: 1300, margin: '0 auto', padding: '24px 20px' }}>
        <h1 style={{ color: C.text, fontSize: 22, fontWeight: 700, marginBottom: 24 }}>Positions Dashboard</h1>

        {/* Header Stats */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(180px,1fr))', gap: 12, marginBottom: 28 }}>
          {[
            { label: 'Open Positions', val: String(openPositions.length), color: C.text },
            {
              label: "P&L Today",
              val: `${totalPnL >= 0 ? '+' : ''}$${totalPnL.toFixed(0)}`,
              color: totalPnL >= 0 ? C.green : C.red,
            },
            { label: 'Margin Used', val: totalMargin > 0 ? `$${totalMargin.toFixed(0)}` : '—', color: C.orange },
            { label: 'Expiring ≤7 DTE', val: String(expiringCount), color: expiringCount > 0 ? C.orange : C.textMid },
          ].map(item => (
            <div key={item.label} style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 10, padding: '14px 18px' }}>
              <div style={{ color: C.textMid, fontSize: 11, marginBottom: 6 }}>{item.label}</div>
              <div style={{ fontFamily: C.mono, fontSize: 22, fontWeight: 700, color: item.color }}>{item.val}</div>
            </div>
          ))}
        </div>

        {/* Portfolio Greeks */}
        {openPositions.length > 0 && (
          <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 10, padding: '16px 20px', marginBottom: 24 }}>
            <div style={{ color: C.textMid, fontSize: 11, fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 14 }}>
              Portfolio Greeks Exposure
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5,1fr)', gap: 16 }}>
              <GreekBar label="Delta (Δ)" value={portfolioGreeks.delta} max={500} desc="Price sensitivity" />
              <GreekBar label="Gamma (Γ)" value={portfolioGreeks.gamma} max={50} desc="Delta change rate" />
              <GreekBar label="Theta (Θ)" value={portfolioGreeks.theta} max={200} desc="Daily time decay" />
              <GreekBar label="Vega (V)" value={portfolioGreeks.vega} max={500} desc="IV sensitivity" />
              <GreekBar label="Rho (ρ)" value={portfolioGreeks.rho} max={200} desc="Rate sensitivity" />
            </div>
          </div>
        )}

        {/* Positions Table */}
        {openPositions.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '80px 20px', background: C.surface, borderRadius: 16, border: `1px solid ${C.border}` }}>
            <div style={{ fontSize: 48, marginBottom: 16 }}>📊</div>
            <h3 style={{ color: C.text, marginBottom: 10 }}>No paper trades yet</h3>
            <p style={{ color: C.textMid, marginBottom: 24 }}>Build your first strategy to start tracking positions.</p>
            <button onClick={goToBuilder} style={{ padding: '10px 24px', background: goldGrad, border: 'none', borderRadius: 8, color: '#06080f', fontWeight: 700, cursor: 'pointer' }}>
              Build your first strategy →
            </button>
          </div>
        ) : (
          <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 12, overflow: 'hidden' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead>
                <tr style={{ borderBottom: `1px solid ${C.border}` }}>
                  {['Strategy / Ticker', 'Legs', 'Entry Date', 'Entry Cost', 'P&L', 'DTE', 'Risk', ''].map(h => (
                    <th key={h} style={{ padding: '12px 16px', textAlign: h === 'P&L' || h === 'Entry Cost' ? 'right' : 'left', color: C.textMid, fontWeight: 500, fontSize: 11, letterSpacing: '0.06em' }}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {positionsWithPnL.map(pos => {
                  const isPos = pos.pnl >= 0;
                  const dteColor = pos.minDTE <= 7 ? C.red : pos.minDTE <= 30 ? C.orange : C.green;
                  const riskColor = RISK_COLORS[pos.meta.riskClass];
                  return (
                    <tr key={pos.id} style={{ borderBottom: `1px solid ${C.border}`, background: selectedPos === pos.id ? C.goldDim : 'transparent' }}>
                      <td style={{ padding: '12px 16px' }}>
                        <div style={{ fontWeight: 600, color: C.text }}>{pos.strategy}</div>
                        <div style={{ fontFamily: C.mono, color: C.gold, fontSize: 12 }}>{pos.ticker} @ ${pos.entrySpot.toFixed(2)}</div>
                      </td>
                      <td style={{ padding: '12px 16px', color: C.textMid, fontSize: 11, maxWidth: 200 }}>
                        {pos.legs.slice(0, 2).map(l =>
                          `${l.direction === 'buy' ? 'BUY' : 'SELL'} ${l.qty}x $${l.strike} ${l.type.toUpperCase()}`
                        ).join(' + ')}
                        {pos.legs.length > 2 && ` +${pos.legs.length - 2} more`}
                      </td>
                      <td style={{ padding: '12px 16px', fontFamily: C.mono, color: C.textMid, fontSize: 11 }}>{pos.entryDate}</td>
                      <td style={{ padding: '12px 16px', fontFamily: C.mono, textAlign: 'right', color: pos.entryCost < 0 ? C.green : C.orange }}>
                        {pos.entryCost < 0 ? '+' : '-'}${Math.abs(pos.entryCost).toFixed(0)}
                      </td>
                      <td style={{ padding: '12px 16px', fontFamily: C.mono, textAlign: 'right', color: isPos ? C.green : C.red, fontWeight: 600 }}>
                        {isPos ? '+' : ''}${pos.pnl.toFixed(0)}
                      </td>
                      <td style={{ padding: '12px 16px', fontFamily: C.mono, color: dteColor }}>
                        {pos.minDTE}d
                      </td>
                      <td style={{ padding: '12px 16px' }}>
                        <span style={{ padding: '3px 8px', borderRadius: 4, fontSize: 11, background: `${riskColor}22`, color: riskColor, fontWeight: 600 }}>
                          {pos.meta.riskClass}
                        </span>
                      </td>
                      <td style={{ padding: '12px 16px' }}>
                        <button
                          onClick={() => setSelectedPos(selectedPos === pos.id ? null : pos.id)}
                          style={{ padding: '5px 12px', background: C.goldDim, border: `1px solid ${C.borderGold}`, borderRadius: 6, color: C.gold, fontSize: 12, cursor: 'pointer' }}
                        >
                          View
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Detail Panel */}
        {selected && (
          <div style={{
            marginTop: 20, background: C.surface, border: `1px solid ${C.borderGold}`,
            borderRadius: 12, padding: 24,
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 }}>
              <div>
                <h3 style={{ color: C.gold, fontSize: 18 }}>{selected.strategy} — {selected.ticker}</h3>
                <div style={{ fontFamily: C.mono, color: C.textMid, fontSize: 12, marginTop: 4 }}>
                  Entered {selected.entryDate} @ ${selected.entrySpot.toFixed(2)} · Current ${(prices[selected.ticker] || selected.entrySpot).toFixed(2)}
                </div>
              </div>
              <button onClick={() => setSelectedPos(null)} style={{ background: 'transparent', border: 'none', color: C.textMid, fontSize: 18, cursor: 'pointer' }}>✕</button>
            </div>

            {/* Legs detail */}
            <div style={{ marginBottom: 20 }}>
              {selected.legs.map(leg => (
                <div key={leg.id} style={{ display: 'flex', gap: 12, padding: '8px 0', borderBottom: `1px solid ${C.border}`, fontSize: 13 }}>
                  <span style={{ color: leg.direction === 'buy' ? C.green : C.red, fontWeight: 600, width: 36 }}>{leg.direction === 'buy' ? 'BUY' : 'SELL'}</span>
                  <span style={{ fontFamily: C.mono, color: C.text }}>{leg.qty}x ${leg.strike} {leg.type.toUpperCase()}</span>
                  <span style={{ color: C.textMid }}>exp {leg.expiry}</span>
                  <span style={{ fontFamily: C.mono, color: C.gold }}>{leg.iv}% IV</span>
                  <span style={{ fontFamily: C.mono, color: C.textMid }}>{selected.minDTE}d DTE</span>
                </div>
              ))}
            </div>

            {/* Notes */}
            <div style={{ marginBottom: 16 }}>
              <label style={{ color: C.textMid, fontSize: 12, display: 'block', marginBottom: 6 }}>Entry Notes</label>
              <textarea
                value={selected.notes || ''}
                onChange={e => updatePositionNotes(selected.id, e.target.value)}
                placeholder="Add notes about this trade…"
                rows={3}
                style={{
                  width: '100%', background: C.surfaceUp, border: `1px solid ${C.border}`,
                  borderRadius: 8, padding: '10px 14px', color: C.text, fontSize: 13,
                  resize: 'vertical', outline: 'none',
                }}
              />
            </div>

            <button
              onClick={() => { closePosition(selected.id); setSelectedPos(null); }}
              style={{ padding: '8px 18px', background: C.red + '22', border: `1px solid ${C.red}`, borderRadius: 8, color: C.red, fontSize: 13, cursor: 'pointer' }}
            >
              Close Position
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
