import React, { useState, useMemo } from 'react';
import { useAppState } from '@/contexts/AppState';
import { bsPrice, bsGreeks, R, type OptionType, type Direction } from '@/lib/blackScholes';

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

function GreekBar({ label, value, max, desc }: { label: string; value: number; max: number; desc: string }) {
  const [tip, setTip] = useState(false);
  const pct = Math.min(100, (Math.abs(value) / max) * 100);
  const color = value >= 0 ? C.green : C.red;
  return (
    <div style={{ marginBottom: 12 }} onMouseEnter={() => setTip(true)} onMouseLeave={() => setTip(false)}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
        <span style={{ color: C.textMid, fontSize: 13 }}>{label}</span>
        <span style={{ fontFamily: C.mono, fontSize: 13, color }}>{value.toFixed(5)}</span>
      </div>
      <div style={{ height: 5, background: C.border, borderRadius: 3, position: 'relative' }}>
        <div style={{ height: '100%', width: `${pct}%`, background: color, borderRadius: 3, transition: 'width 0.2s' }} />
      </div>
      {tip && <div style={{ fontSize: 11, color: C.textMid, marginTop: 3 }}>{desc}</div>}
    </div>
  );
}

// Mini payoff chart
function MiniPayoffChart({ S, K, T, r, sigma, type, direction }: {
  S: number; K: number; T: number; r: number; sigma: number;
  type: OptionType; direction: Direction;
}) {
  const W = 300, H = 120, PAD = 20;
  const lo = S * 0.75, hi = S * 1.25;
  const pts = useMemo(() => {
    const arr: { x: number; y: number }[] = [];
    for (let i = 0; i <= 80; i++) {
      const spot = lo + (hi - lo) * (i / 80);
      const intrinsic = type === 'call' ? Math.max(0, spot - K) : Math.max(0, K - spot);
      const premium = bsPrice(S, K, T, r, sigma, type);
      const payoff = direction === 'buy' ? intrinsic - premium : premium - intrinsic;
      arr.push({ x: i, y: payoff });
    }
    return arr;
  }, [S, K, T, r, sigma, type, direction, lo, hi]);

  const ys = pts.map(p => p.y);
  const minY = Math.min(...ys);
  const maxY = Math.max(...ys);
  const range = maxY - minY || 1;
  const toSvgY = (v: number) => PAD + (H - PAD * 2) * (1 - (v - minY) / range);
  const toSvgX = (i: number) => PAD + (W - PAD * 2) * (i / 80);
  const zeroY = toSvgY(0);
  const path = pts.map((p, i) => `${i === 0 ? 'M' : 'L'}${toSvgX(p.x).toFixed(1)},${toSvgY(p.y).toFixed(1)}`).join(' ');

  return (
    <svg width="100%" viewBox={`0 0 ${W} ${H}`} style={{ display: 'block' }}>
      <line x1={PAD} y1={zeroY} x2={W - PAD} y2={zeroY} stroke={C.border} strokeWidth={1} strokeDasharray="3,3" />
      {pts.map((p, i) => {
        if (i === 0) return null;
        const prev = pts[i - 1];
        return (
          <line key={i}
            x1={toSvgX(prev.x)} y1={toSvgY(prev.y)}
            x2={toSvgX(p.x)} y2={toSvgY(p.y)}
            stroke={p.y >= 0 ? C.green : C.red} strokeWidth={2}
          />
        );
      })}
      <text x={PAD} y={H - 2} fontSize={9} fill={C.textDim} fontFamily={C.mono}>${lo.toFixed(0)}</text>
      <text x={W - PAD} y={H - 2} fontSize={9} fill={C.textDim} fontFamily={C.mono} textAnchor="end">${hi.toFixed(0)}</text>
    </svg>
  );
}

// Styled range slider
function GoldSlider({ label, value, min, max, step, onChange, format }: {
  label: string; value: number; min: number; max: number; step: number;
  onChange: (v: number) => void; format: (v: number) => string;
}) {
  const pct = ((value - min) / (max - min)) * 100;
  return (
    <div style={{ marginBottom: 20 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
        <span style={{ color: C.textMid, fontSize: 13 }}>{label}</span>
        <span style={{ fontFamily: C.mono, background: C.goldDim, border: `1px solid ${C.borderGold}`, borderRadius: 4, padding: '2px 8px', color: C.gold, fontSize: 12 }}>
          {format(value)}
        </span>
      </div>
      <div style={{ position: 'relative' }}>
        <input
          type="range"
          min={min}
          max={max}
          step={step}
          value={value}
          onChange={e => onChange(parseFloat(e.target.value))}
          style={{
            width: '100%',
            appearance: 'none',
            height: 4,
            borderRadius: 2,
            background: `linear-gradient(to right, ${C.gold} ${pct}%, ${C.border} ${pct}%)`,
            outline: 'none',
            cursor: 'pointer',
          }}
        />
      </div>
    </div>
  );
}

export default function GreeksLabScreen() {
  const { ticker, prices } = useAppState();
  const seedSpot = prices[ticker] || 100;

  const [spotPrice, setSpotPrice] = useState(seedSpot);
  const [iv, setIv] = useState(30);
  const [dte, setDte] = useState(30);
  const [rate, setRate] = useState(5);
  const [optType, setOptType] = useState<OptionType>('call');
  const [direction, setDirection] = useState<Direction>('buy');
  const [strike, setStrike] = useState(Math.round(seedSpot));

  function resetDefaults() {
    setSpotPrice(seedSpot);
    setIv(30);
    setDte(30);
    setRate(5);
    setOptType('call');
    setDirection('buy');
    setStrike(Math.round(seedSpot));
  }

  const T = dte / 365;
  const sigma = iv / 100;
  const r = rate / 100;

  const premium = useMemo(() => bsPrice(spotPrice, strike, T, r, sigma, optType), [spotPrice, strike, T, r, sigma, optType]);
  const greeks = useMemo(() => bsGreeks(spotPrice, strike, T, r, sigma, optType), [spotPrice, strike, T, r, sigma, optType]);

  // Time decay panel: premium at various days prior
  const timeDecay = useMemo(() => {
    return [30, 21, 14, 7, 0].map(d => ({
      days: d,
      label: d === 0 ? 'Today' : `-${d}d`,
      premium: bsPrice(spotPrice, strike, Math.max(0.001, (dte - d) / 365), r, sigma, optType),
    }));
  }, [spotPrice, strike, dte, r, sigma, optType]);

  // IV sensitivity
  const ivSensitivity = useMemo(() => {
    return [-30, -15, 0, 15, 30].map(delta => ({
      delta,
      iv: iv + delta,
      premium: bsPrice(spotPrice, strike, T, r, (iv + delta) / 100, optType),
    }));
  }, [spotPrice, strike, T, r, iv, optType]);

  const maxTD = Math.max(...timeDecay.map(x => x.premium), 0.01);

  return (
    <div style={{ background: C.bg, minHeight: '100vh', paddingTop: 60 }}>
      <div style={{ maxWidth: 1200, margin: '0 auto', padding: '24px 20px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
          <h1 style={{ color: C.text, fontSize: 22, fontWeight: 700 }}>Greeks Lab</h1>
          <button onClick={resetDefaults} style={{ padding: '7px 16px', background: C.surface, border: `1px solid ${C.border}`, borderRadius: 8, color: C.textMid, fontSize: 13, cursor: 'pointer' }}>
            Reset to Defaults
          </button>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '340px 1fr', gap: 20 }}>
          {/* Left — Controls */}
          <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 12, padding: 24 }}>
            <GoldSlider label="Underlying Price" value={spotPrice} min={seedSpot * 0.5} max={seedSpot * 1.5} step={0.5} onChange={setSpotPrice} format={v => `$${v.toFixed(2)}`} />
            <GoldSlider label="Implied Volatility %" value={iv} min={5} max={150} step={1} onChange={setIv} format={v => `${v}%`} />
            <GoldSlider label="Days to Expiry" value={dte} min={1} max={365} step={1} onChange={setDte} format={v => `${v}d`} />
            <GoldSlider label="Risk-Free Rate %" value={rate} min={0} max={15} step={0.25} onChange={setRate} format={v => `${v}%`} />

            {/* Strike input */}
            <div style={{ marginBottom: 20 }}>
              <div style={{ color: C.textMid, fontSize: 13, marginBottom: 8 }}>Strike Price</div>
              <input
                type="number"
                value={strike}
                onChange={e => setStrike(parseFloat(e.target.value) || spotPrice)}
                style={{ width: '100%', background: C.surfaceUp, border: `1px solid ${C.border}`, borderRadius: 8, padding: '8px 12px', color: C.text, fontFamily: C.mono, fontSize: 14, outline: 'none' }}
              />
            </div>

            {/* Option Type toggle */}
            <div style={{ marginBottom: 20 }}>
              <div style={{ color: C.textMid, fontSize: 13, marginBottom: 8 }}>Option Type</div>
              <div style={{ display: 'flex', gap: 8 }}>
                {(['call', 'put'] as OptionType[]).map(t => (
                  <button key={t} onClick={() => setOptType(t)} style={{
                    flex: 1, padding: '8px', borderRadius: 8, cursor: 'pointer',
                    background: optType === t ? C.blue + '22' : 'transparent',
                    border: `1px solid ${optType === t ? C.blue : C.border}`,
                    color: optType === t ? C.blue : C.textMid,
                    fontWeight: optType === t ? 700 : 400, fontSize: 14,
                  }}>{t.charAt(0).toUpperCase() + t.slice(1)}</button>
                ))}
              </div>
            </div>

            {/* Direction toggle */}
            <div>
              <div style={{ color: C.textMid, fontSize: 13, marginBottom: 8 }}>Direction</div>
              <div style={{ display: 'flex', gap: 8 }}>
                {(['buy', 'sell'] as Direction[]).map(d => (
                  <button key={d} onClick={() => setDirection(d)} style={{
                    flex: 1, padding: '8px', borderRadius: 8, cursor: 'pointer',
                    background: direction === d ? (d === 'buy' ? C.green : C.red) + '22' : 'transparent',
                    border: `1px solid ${direction === d ? (d === 'buy' ? C.green : C.red) : C.border}`,
                    color: direction === d ? (d === 'buy' ? C.green : C.red) : C.textMid,
                    fontWeight: direction === d ? 700 : 400, fontSize: 14,
                  }}>{d.charAt(0).toUpperCase() + d.slice(1)}</button>
                ))}
              </div>
            </div>
          </div>

          {/* Right — Live Outputs */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {/* Premium */}
            <div style={{ background: C.surface, border: `1px solid ${C.borderGold}`, borderRadius: 12, padding: '20px 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <div style={{ color: C.textMid, fontSize: 11, marginBottom: 4 }}>Option Premium</div>
                <div style={{ fontFamily: C.mono, fontSize: 36, fontWeight: 700, color: C.gold }}>${premium.toFixed(4)}</div>
                <div style={{ fontFamily: C.mono, color: C.textMid, fontSize: 12, marginTop: 4 }}>
                  {direction === 'buy' ? 'Max Loss' : 'Max Gain'}: ${(premium * 100).toFixed(2)} per contract
                </div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ color: C.textMid, fontSize: 11, marginBottom: 4 }}>Moneyness</div>
                <div style={{ fontFamily: C.mono, fontSize: 14, color: spotPrice >= strike ? C.green : C.red }}>
                  {Math.abs(((spotPrice - strike) / strike) * 100).toFixed(1)}% {spotPrice === strike ? 'ATM' : spotPrice > strike ? (optType === 'call' ? 'ITM' : 'OTM') : (optType === 'call' ? 'OTM' : 'ITM')}
                </div>
              </div>
            </div>

            {/* Greeks */}
            <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 12, padding: '20px 24px' }}>
              <div style={{ color: C.textMid, fontSize: 11, fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 16 }}>Live Greeks</div>
              <GreekBar label="Delta (Δ)" value={greeks.delta} max={1} desc="$ change per $1 spot move" />
              <GreekBar label="Gamma (Γ)" value={greeks.gamma} max={0.1} desc="Delta change per $1 spot move" />
              <GreekBar label="Theta (Θ)" value={greeks.theta} max={5} desc="Daily time decay in $" />
              <GreekBar label="Vega (V)" value={greeks.vega} max={1} desc="$ change per 1% IV change" />
              <GreekBar label="Rho (ρ)" value={greeks.rho} max={1} desc="$ change per 1% rate change" />
            </div>

            {/* Payoff Chart */}
            <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 12, padding: '20px 24px' }}>
              <div style={{ color: C.textMid, fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 12 }}>Payoff at Expiry</div>
              <MiniPayoffChart S={spotPrice} K={strike} T={T} r={r} sigma={sigma} type={optType} direction={direction} />
            </div>

            {/* Time Decay Panel */}
            <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 12, padding: '20px 24px' }}>
              <div style={{ color: C.textMid, fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 16 }}>Theta Erosion (Time Decay)</div>
              <div style={{ display: 'flex', gap: 10 }}>
                {timeDecay.map(td => (
                  <div key={td.days} style={{ flex: 1, textAlign: 'center' }}>
                    <div style={{ height: 60, display: 'flex', alignItems: 'flex-end', justifyContent: 'center', marginBottom: 6 }}>
                      <div style={{
                        width: '70%', background: td.days === 0 ? C.gold : C.blue,
                        height: `${(td.premium / maxTD) * 100}%`, borderRadius: '3px 3px 0 0', minHeight: 2,
                        opacity: td.days === 0 ? 1 : 0.6,
                      }} />
                    </div>
                    <div style={{ fontFamily: C.mono, fontSize: 11, color: C.gold }}>${td.premium.toFixed(2)}</div>
                    <div style={{ fontSize: 10, color: C.textMid, marginTop: 2 }}>{td.label}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* IV Sensitivity */}
            <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 12, padding: '20px 24px' }}>
              <div style={{ color: C.textMid, fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 12 }}>IV Sensitivity</div>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr>
                    <th style={{ textAlign: 'left', color: C.textMid, fontSize: 11, padding: '4px 10px', borderBottom: `1px solid ${C.border}` }}>IV</th>
                    <th style={{ textAlign: 'right', color: C.textMid, fontSize: 11, padding: '4px 10px', borderBottom: `1px solid ${C.border}` }}>Premium</th>
                    <th style={{ textAlign: 'right', color: C.textMid, fontSize: 11, padding: '4px 10px', borderBottom: `1px solid ${C.border}` }}>Change</th>
                  </tr>
                </thead>
                <tbody>
                  {ivSensitivity.map(row => (
                    <tr key={row.delta} style={{ borderBottom: `1px solid ${C.border}`, background: row.delta === 0 ? C.goldDim : 'transparent' }}>
                      <td style={{ padding: '6px 10px', fontFamily: C.mono, color: row.delta === 0 ? C.gold : C.textMid, fontSize: 12 }}>
                        {row.iv}% {row.delta === 0 ? '(current)' : row.delta > 0 ? `+${row.delta}%` : `${row.delta}%`}
                      </td>
                      <td style={{ padding: '6px 10px', fontFamily: C.mono, color: C.text, fontSize: 12, textAlign: 'right' }}>
                        ${row.premium.toFixed(4)}
                      </td>
                      <td style={{ padding: '6px 10px', fontFamily: C.mono, fontSize: 12, textAlign: 'right', color: row.premium > premium ? C.green : row.premium < premium ? C.red : C.textMid }}>
                        {row.delta === 0 ? '—' : `${row.premium > premium ? '+' : ''}${(row.premium - premium).toFixed(4)}`}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
