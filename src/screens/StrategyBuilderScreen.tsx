import React, { useState, useMemo, useCallback } from 'react';
import { useAppState } from '@/contexts/AppState';
import { STRATEGIES } from '@/lib/instruments';
import {
  bsPrice, bsGreeks, calcPayoff, calcAggGreeks, calcMeta, buildDefaultLegs, daysToExpiry, R,
  type Leg, type OptionType, type Direction,
} from '@/lib/blackScholes';

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

// Default expiry ~30 days from now
function defaultExpiry() {
  const d = new Date();
  d.setDate(d.getDate() + 30);
  return d.toISOString().split('T')[0];
}

// ── PayoffChart ────────────────────────────────────────────────────────────────
function PayoffChart({ legs, spot }: { legs: Leg[]; spot: number }) {
  const W = 520, H = 180, PAD = 40;
  const lo = spot * 0.7, hi = spot * 1.3;
  const pts = useMemo(() => {
    const arr: { x: number; y: number; s: number }[] = [];
    for (let i = 0; i <= 100; i++) {
      const s = lo + (hi - lo) * (i / 100);
      const y = calcPayoff(legs, spot, s);
      arr.push({ x: i, y, s });
    }
    return arr;
  }, [legs, spot, lo, hi]);

  const ys = pts.map(p => p.y);
  const minY = Math.min(...ys, 0);
  const maxY = Math.max(...ys, 0);
  const range = maxY - minY || 1;

  const toSvgY = (v: number) => PAD + (H - PAD * 2) * (1 - (v - minY) / range);
  const toSvgX = (i: number) => PAD + (W - PAD * 2) * (i / 100);

  const path = pts.map((p, i) => `${i === 0 ? 'M' : 'L'}${toSvgX(p.x).toFixed(1)},${toSvgY(p.y).toFixed(1)}`).join(' ');
  const spotX = toSvgX(((spot - lo) / (hi - lo)) * 100);
  const zeroY = toSvgY(0);

  return (
    <svg width="100%" viewBox={`0 0 ${W} ${H + 20}`} style={{ display: 'block' }}>
      {/* Zero line */}
      <line x1={PAD} y1={zeroY} x2={W - PAD} y2={zeroY} stroke={C.border} strokeWidth={1} strokeDasharray="4,4" />
      {/* Spot line */}
      <line x1={spotX} y1={PAD} x2={spotX} y2={H - PAD + 20} stroke={C.gold} strokeWidth={1} strokeDasharray="3,3" opacity={0.5} />
      {/* Area fill */}
      <defs>
        <linearGradient id="payoffGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={C.green} stopOpacity="0.2" />
          <stop offset="100%" stopColor={C.red} stopOpacity="0.1" />
        </linearGradient>
      </defs>
      <path
        d={`${path} L${toSvgX(100).toFixed(1)},${zeroY.toFixed(1)} L${toSvgX(0).toFixed(1)},${zeroY.toFixed(1)} Z`}
        fill="url(#payoffGrad)"
      />
      {/* Main line (profit in green, loss in red) */}
      {pts.map((p, i) => {
        if (i === 0) return null;
        const prev = pts[i - 1];
        const color = p.y >= 0 ? C.green : C.red;
        return (
          <line
            key={i}
            x1={toSvgX(prev.x)} y1={toSvgY(prev.y)}
            x2={toSvgX(p.x)} y2={toSvgY(p.y)}
            stroke={color} strokeWidth={2}
          />
        );
      })}
      {/* Labels */}
      <text x={PAD} y={H + 16} fontSize={10} fill={C.textDim} fontFamily={C.mono}>${lo.toFixed(0)}</text>
      <text x={W - PAD} y={H + 16} fontSize={10} fill={C.textDim} fontFamily={C.mono} textAnchor="end">${hi.toFixed(0)}</text>
      <text x={spotX} y={PAD - 6} fontSize={9} fill={C.gold} fontFamily={C.mono} textAnchor="middle">Current</text>
    </svg>
  );
}

// ── ScenarioTable ─────────────────────────────────────────────────────────────
function ScenarioTable({ legs, spot }: { legs: Leg[]; spot: number }) {
  const scenarios = [-20, -10, -5, 0, 5, 10, 20];
  return (
    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
      <thead>
        <tr>
          <th style={{ textAlign: 'left', padding: '6px 10px', color: C.textMid, fontWeight: 500, fontSize: 11, borderBottom: `1px solid ${C.border}` }}>Spot Change</th>
          <th style={{ textAlign: 'right', padding: '6px 10px', color: C.textMid, fontWeight: 500, fontSize: 11, borderBottom: `1px solid ${C.border}` }}>Price</th>
          <th style={{ textAlign: 'right', padding: '6px 10px', color: C.textMid, fontWeight: 500, fontSize: 11, borderBottom: `1px solid ${C.border}` }}>P&L</th>
        </tr>
      </thead>
      <tbody>
        {scenarios.map(pct => {
          const s = spot * (1 + pct / 100);
          const pnl = calcPayoff(legs, spot, s);
          const isPos = pnl >= 0;
          return (
            <tr key={pct} style={{ borderBottom: `1px solid ${C.border}` }}>
              <td style={{ padding: '7px 10px', fontFamily: C.mono, color: pct === 0 ? C.gold : C.textMid }}>
                {pct > 0 ? `+${pct}%` : pct === 0 ? 'Flat' : `${pct}%`}
              </td>
              <td style={{ padding: '7px 10px', fontFamily: C.mono, color: C.text, textAlign: 'right' }}>
                ${s.toFixed(2)}
              </td>
              <td style={{ padding: '7px 10px', fontFamily: C.mono, color: isPos ? C.green : C.red, textAlign: 'right' }}>
                {isPos ? '+' : ''}${pnl.toFixed(0)}
              </td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}

// ── GreekBar ──────────────────────────────────────────────────────────────────
function GreekBar({ label, value, max, desc }: { label: string; value: number; max: number; desc: string }) {
  const [tip, setTip] = useState(false);
  const pct = Math.min(100, (Math.abs(value) / max) * 100);
  const color = value >= 0 ? C.green : C.red;

  return (
    <div
      style={{ position: 'relative', marginBottom: 10 }}
      onMouseEnter={() => setTip(true)}
      onMouseLeave={() => setTip(false)}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
        <span style={{ color: C.textMid, fontSize: 12 }}>{label}</span>
        <span style={{ fontFamily: C.mono, fontSize: 12, color }}>{value.toFixed(4)}</span>
      </div>
      <div style={{ height: 4, background: C.border, borderRadius: 2, overflow: 'hidden' }}>
        <div style={{ height: '100%', width: `${pct}%`, background: color, borderRadius: 2, transition: 'width 0.3s' }} />
      </div>
      {tip && (
        <div style={{
          position: 'absolute', top: -36, left: 0, background: C.surfaceUp,
          border: `1px solid ${C.borderGold}`, borderRadius: 6, padding: '5px 10px',
          fontSize: 11, color: C.textMid, zIndex: 10, whiteSpace: 'nowrap',
        }}>
          {desc}
        </div>
      )}
    </div>
  );
}

// ── LegRow ────────────────────────────────────────────────────────────────────
function LegRow({
  leg, spot, onChange, onRemove,
}: {
  leg: Leg;
  spot: number;
  onChange: (updated: Leg) => void;
  onRemove: () => void;
}) {
  const T = daysToExpiry(leg.expiry) / 365;
  const premium = bsPrice(spot, leg.strike, T, R, leg.iv / 100, leg.type);
  const cost = (leg.direction === 'buy' ? 1 : -1) * premium * leg.qty * 100;

  return (
    <div style={{
      background: C.surfaceUp, border: `1px solid ${C.border}`, borderRadius: 8,
      padding: '12px 16px', display: 'grid',
      gridTemplateColumns: '100px 80px 90px 90px 70px 70px 1fr 80px',
      gap: 10, alignItems: 'center', fontSize: 13,
    }}>
      {/* Direction */}
      <div style={{ display: 'flex', gap: 4 }}>
        {(['buy', 'sell'] as Direction[]).map(d => (
          <button key={d} onClick={() => onChange({ ...leg, direction: d })} style={{
            flex: 1, padding: '5px 0', borderRadius: 5, fontSize: 11, cursor: 'pointer',
            background: leg.direction === d ? (d === 'buy' ? C.green : C.red) + '33' : 'transparent',
            border: `1px solid ${leg.direction === d ? (d === 'buy' ? C.green : C.red) : C.border}`,
            color: leg.direction === d ? (d === 'buy' ? C.green : C.red) : C.textMid,
            fontWeight: leg.direction === d ? 700 : 400,
          }}>
            {d.toUpperCase()}
          </button>
        ))}
      </div>
      {/* Type */}
      <div style={{ display: 'flex', gap: 4 }}>
        {(['call', 'put'] as OptionType[]).map(t => (
          <button key={t} onClick={() => onChange({ ...leg, type: t })} style={{
            flex: 1, padding: '5px 0', borderRadius: 5, fontSize: 11, cursor: 'pointer',
            background: leg.type === t ? C.blue + '22' : 'transparent',
            border: `1px solid ${leg.type === t ? C.blue : C.border}`,
            color: leg.type === t ? C.blue : C.textMid,
            fontWeight: leg.type === t ? 700 : 400,
          }}>
            {t[0].toUpperCase() + t.slice(1)}
          </button>
        ))}
      </div>
      {/* Strike */}
      <input
        type="number"
        value={leg.strike}
        onChange={e => onChange({ ...leg, strike: parseFloat(e.target.value) || spot })}
        style={{ fontFamily: C.mono, background: C.bg, border: `1px solid ${C.border}`, borderRadius: 6, padding: '5px 8px', color: C.text, fontSize: 13, width: '100%' }}
      />
      {/* Expiry */}
      <input
        type="date"
        value={leg.expiry}
        onChange={e => onChange({ ...leg, expiry: e.target.value })}
        style={{ fontFamily: C.mono, background: C.bg, border: `1px solid ${C.border}`, borderRadius: 6, padding: '5px 8px', color: C.text, fontSize: 12, width: '100%' }}
      />
      {/* Qty */}
      <input
        type="number"
        value={leg.qty}
        min={1}
        onChange={e => onChange({ ...leg, qty: parseInt(e.target.value) || 1 })}
        style={{ fontFamily: C.mono, background: C.bg, border: `1px solid ${C.border}`, borderRadius: 6, padding: '5px 8px', color: C.text, fontSize: 13, width: '100%' }}
      />
      {/* IV */}
      <input
        type="number"
        value={leg.iv}
        onChange={e => onChange({ ...leg, iv: parseFloat(e.target.value) || 30 })}
        style={{ fontFamily: C.mono, background: C.bg, border: `1px solid ${C.border}`, borderRadius: 6, padding: '5px 8px', color: C.text, fontSize: 13, width: '100%' }}
      />
      {/* Premium */}
      <div style={{ fontFamily: C.mono, fontSize: 13, color: cost < 0 ? C.green : C.orange, textAlign: 'right' }}>
        {cost < 0 ? '+' : '-'}${Math.abs(cost).toFixed(2)}
      </div>
      {/* Remove */}
      <button onClick={onRemove} style={{
        background: 'transparent', border: `1px solid ${C.border}`, borderRadius: 6,
        color: C.red, fontSize: 16, cursor: 'pointer', padding: '4px 8px',
      }}>×</button>
    </div>
  );
}

// ── Main Builder ──────────────────────────────────────────────────────────────
export function ContextAwareBuilder({ onBack }: { onBack: () => void }) {
  const { ticker, strat, prices, addPosition, goToPositions } = useAppState();
  const spot = prices[ticker] || 100;

  const [activeTab, setActiveTab] = useState<'build' | 'payoff' | 'greeks' | 'scenarios' | 'review'>('build');
  const [legs, setLegs] = useState<Leg[]>(() => buildDefaultLegs(strat, spot, defaultExpiry()));
  const [confirmed, setConfirmed] = useState(false);

  // Reset legs when strat or ticker changes
  React.useEffect(() => {
    setLegs(buildDefaultLegs(strat, spot, defaultExpiry()));
    setConfirmed(false);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [strat, ticker]);

  const greeks = useMemo(() => calcAggGreeks(legs, spot), [legs, spot]);
  const meta = useMemo(() => calcMeta(legs, spot), [legs, spot]);
  const totalCost = useMemo(() =>
    legs.reduce((sum, leg) => {
      const T = daysToExpiry(leg.expiry) / 365;
      const p = bsPrice(spot, leg.strike, T, R, leg.iv / 100, leg.type);
      return sum + (leg.direction === 'buy' ? 1 : -1) * p * leg.qty * 100;
    }, 0),
    [legs, spot]
  );

  function addLeg() {
    const newLeg: Leg = {
      id: `leg_${Date.now()}`,
      type: 'call',
      direction: 'buy',
      strike: Math.round(spot),
      expiry: defaultExpiry(),
      qty: 1,
      iv: 30,
    };
    setLegs(prev => [...prev, newLeg]);
  }

  function updateLeg(id: string, updated: Leg) {
    setLegs(prev => prev.map(l => (l.id === id ? updated : l)));
  }

  function removeLeg(id: string) {
    setLegs(prev => prev.filter(l => l.id !== id));
  }

  function handleConfirm() {
    addPosition({
      ticker,
      strategy: strat,
      legs,
      entryDate: new Date().toISOString().split('T')[0],
      entrySpot: spot,
      entryCost: totalCost,
      meta,
    });
    setConfirmed(true);
  }

  const riskColor = RISK_COLORS[meta.riskClass];
  const TABS = ['build', 'payoff', 'greeks', 'scenarios', 'review'] as const;

  if (confirmed) {
    return (
      <div style={{ minHeight: '100vh', background: C.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 20, padding: 24 }}>
        <div style={{ fontSize: 56 }}>✓</div>
        <h2 style={{ color: C.green, fontSize: 24 }}>Paper Trade Saved!</h2>
        <p style={{ color: C.textMid, textAlign: 'center' }}>
          {strat} on {ticker} has been added to your positions at ${spot.toFixed(2)}.
        </p>
        <div style={{ display: 'flex', gap: 12 }}>
          <button onClick={onBack} style={{ padding: '10px 20px', background: C.surface, border: `1px solid ${C.border}`, borderRadius: 8, color: C.text, cursor: 'pointer' }}>
            ← Back to Dashboard
          </button>
          <button onClick={goToPositions} style={{ padding: '10px 20px', background: goldGrad, border: 'none', borderRadius: 8, color: '#06080f', fontWeight: 700, cursor: 'pointer' }}>
            View Positions →
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={{ background: C.bg, minHeight: '100vh', paddingTop: 60 }}>
      <div style={{ maxWidth: 1100, margin: '0 auto', padding: '24px 20px' }}>
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
          <div>
            <button onClick={onBack} style={{ background: 'transparent', border: 'none', color: C.textMid, cursor: 'pointer', marginBottom: 8, fontSize: 13 }}>
              ← Dashboard
            </button>
            <h1 style={{ color: C.text, fontSize: 22, fontWeight: 700 }}>
              {strat} <span style={{ color: C.gold }}>/ {ticker}</span>
              <span style={{ fontFamily: C.mono, fontSize: 14, color: C.textMid, marginLeft: 12 }}>@ ${spot.toFixed(2)}</span>
            </h1>
          </div>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <span style={{
              padding: '4px 12px', borderRadius: 6, fontSize: 12, fontWeight: 700,
              background: `${riskColor}22`, color: riskColor, border: `1px solid ${riskColor}`,
            }}>{meta.riskClass} Risk</span>
          </div>
        </div>

        {/* Tabs */}
        <div style={{ display: 'flex', gap: 2, marginBottom: 24, background: C.surface, border: `1px solid ${C.border}`, borderRadius: 10, padding: 4 }}>
          {TABS.map(tab => (
            <button key={tab} onClick={() => setActiveTab(tab)} style={{
              flex: 1, padding: '8px 4px', borderRadius: 8, border: 'none', cursor: 'pointer',
              background: activeTab === tab ? C.goldDim : 'transparent',
              color: activeTab === tab ? C.gold : C.textMid,
              fontSize: 13, fontWeight: activeTab === tab ? 600 : 400,
              transition: 'all 0.15s ease', textTransform: 'capitalize',
            }}>
              {tab === 'review' ? 'Review & Confirm' : tab.charAt(0).toUpperCase() + tab.slice(1)}
            </button>
          ))}
        </div>

        {/* Tab Content */}
        {activeTab === 'build' && (
          <div>
            <div style={{ marginBottom: 12, display: 'grid', gridTemplateColumns: '100px 80px 90px 90px 70px 70px 1fr 80px', gap: 10, padding: '0 0 8px', fontSize: 11, color: C.textMid }}>
              <div>Direction</div><div>Type</div><div>Strike</div><div>Expiry</div><div>Qty</div><div>IV %</div><div style={{ textAlign: 'right' }}>Net Premium</div><div></div>
            </div>
            {legs.map(leg => (
              <LegRow
                key={leg.id}
                leg={leg}
                spot={spot}
                onChange={updated => updateLeg(leg.id, updated)}
                onRemove={() => removeLeg(leg.id)}
              />
            ))}
            <div style={{ marginTop: 12, display: 'flex', gap: 10, justifyContent: 'space-between', alignItems: 'center' }}>
              <button onClick={addLeg} style={{
                background: C.surface, border: `1px dashed ${C.border}`, borderRadius: 8,
                padding: '10px 20px', color: C.textMid, fontSize: 13, cursor: 'pointer',
              }}>
                + Add Leg
              </button>
              <div style={{ fontFamily: C.mono, fontSize: 16, color: totalCost < 0 ? C.green : C.orange }}>
                Net: {totalCost < 0 ? '+' : '-'}${Math.abs(totalCost).toFixed(2)}{' '}
                <span style={{ fontSize: 12, color: C.textMid }}>{totalCost < 0 ? 'Credit' : 'Debit'}</span>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'payoff' && (
          <div style={{ background: C.surface, borderRadius: 12, padding: 24, border: `1px solid ${C.border}` }}>
            <div style={{ color: C.textMid, fontSize: 12, marginBottom: 16 }}>Payoff at Expiry</div>
            <PayoffChart legs={legs} spot={spot} />
            <div style={{ display: 'flex', gap: 16, marginTop: 16, justifyContent: 'center' }}>
              <div style={{ fontFamily: C.mono, fontSize: 12, color: C.green }}>
                Max Profit: {meta.maxProfit === 'unlimited' ? '∞' : `$${(meta.maxProfit as number).toFixed(0)}`}
              </div>
              <div style={{ fontFamily: C.mono, fontSize: 12, color: C.red }}>
                Max Loss: {meta.maxLoss === 'unlimited' ? '∞' : `$${Math.abs(meta.maxLoss as number).toFixed(0)}`}
              </div>
              {meta.breakEvens.length > 0 && (
                <div style={{ fontFamily: C.mono, fontSize: 12, color: C.textMid }}>
                  Break-Even{meta.breakEvens.length > 1 ? 's' : ''}: {meta.breakEvens.map(b => `$${b.toFixed(2)}`).join(', ')}
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'greeks' && (
          <div style={{ background: C.surface, borderRadius: 12, padding: 24, border: `1px solid ${C.border}` }}>
            <div style={{ color: C.textMid, fontSize: 12, marginBottom: 20 }}>Portfolio Greeks (Aggregate)</div>
            <GreekBar label="Delta (Δ)" value={greeks.delta} max={200} desc="Sensitivity to $1 price move" />
            <GreekBar label="Gamma (Γ)" value={greeks.gamma} max={10} desc="Rate of change of delta" />
            <GreekBar label="Theta (Θ)" value={greeks.theta} max={50} desc="Daily time decay (per day)" />
            <GreekBar label="Vega (V)" value={greeks.vega} max={100} desc="Sensitivity to 1% IV change" />
            <GreekBar label="Rho (ρ)" value={greeks.rho} max={50} desc="Sensitivity to 1% rate change" />
          </div>
        )}

        {activeTab === 'scenarios' && (
          <div style={{ background: C.surface, borderRadius: 12, border: `1px solid ${C.border}`, overflow: 'hidden' }}>
            <div style={{ padding: '16px 20px', borderBottom: `1px solid ${C.border}`, color: C.textMid, fontSize: 12 }}>
              Scenario Analysis (P&L at Expiry)
            </div>
            <ScenarioTable legs={legs} spot={spot} />
          </div>
        )}

        {activeTab === 'review' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div style={{ background: C.surface, borderRadius: 12, padding: 24, border: `1px solid ${C.border}` }}>
              <h3 style={{ color: C.text, marginBottom: 16 }}>Strategy Summary</h3>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                {[
                  { label: 'Ticker', value: ticker },
                  { label: 'Strategy', value: strat },
                  { label: 'Spot Price', value: `$${spot.toFixed(2)}` },
                  { label: 'Net Cost', value: `${totalCost < 0 ? '+' : '-'}$${Math.abs(totalCost).toFixed(2)} ${totalCost < 0 ? 'Credit' : 'Debit'}` },
                  { label: 'Max Profit', value: meta.maxProfit === 'unlimited' ? '∞ Unlimited' : `$${(meta.maxProfit as number).toFixed(0)}` },
                  { label: 'Max Loss', value: meta.maxLoss === 'unlimited' ? '∞ Unlimited' : `$${Math.abs(meta.maxLoss as number).toFixed(0)}` },
                  { label: 'Risk Class', value: meta.riskClass },
                  { label: 'Margin Req.', value: meta.margin > 0 ? `$${meta.margin.toFixed(0)}` : 'None' },
                ].map(({ label, value }) => (
                  <div key={label} style={{ background: C.surfaceUp, borderRadius: 8, padding: '12px 16px' }}>
                    <div style={{ color: C.textMid, fontSize: 11, marginBottom: 4 }}>{label}</div>
                    <div style={{ fontFamily: C.mono, color: C.text, fontSize: 14, fontWeight: 600 }}>{value}</div>
                  </div>
                ))}
              </div>

              {meta.warnings.length > 0 && (
                <div style={{ marginTop: 16, padding: '12px 16px', background: C.red + '11', border: `1px solid ${C.red}44`, borderRadius: 8 }}>
                  {meta.warnings.map((w, i) => (
                    <div key={i} style={{ color: C.red, fontSize: 13, marginBottom: 4 }}>⚠ {w}</div>
                  ))}
                </div>
              )}

              <div style={{ marginTop: 20, padding: '12px 16px', background: C.goldDim, borderRadius: 8, border: `1px solid ${C.borderGold}` }}>
                <p style={{ color: C.textMid, fontSize: 12, lineHeight: 1.6 }}>
                  <strong style={{ color: C.gold }}>Paper Trade Disclaimer:</strong> This is a simulated trade for educational purposes only. No real money is involved. Past simulated performance does not guarantee future results.
                </p>
              </div>

              <button
                onClick={handleConfirm}
                style={{
                  marginTop: 20, width: '100%', padding: '14px',
                  background: goldGrad, border: 'none', borderRadius: 10,
                  color: '#06080f', fontWeight: 700, fontSize: 16, cursor: 'pointer',
                  letterSpacing: '0.04em',
                }}
              >
                Confirm Paper Trade →
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default ContextAwareBuilder;
