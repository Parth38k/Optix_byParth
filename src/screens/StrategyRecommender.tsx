import React, { useState } from 'react';
import { useAppState } from '@/contexts/AppState';
import { STRATEGIES } from '@/lib/instruments';

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

type MarketView = 'Strongly Bearish' | 'Bearish' | 'Neutral' | 'Bullish' | 'Strongly Bullish';
type VolView = 'Vol Spike Expected' | 'Stable' | 'Vol Crush Expected';
type Horizon = '< 2 weeks' | '1 month' | '3 months' | '6 months+';
type RiskAppetite = 'Conservative' | 'Moderate' | 'Aggressive';

interface Recommendation {
  name: string;
  score: number;
  rationale: string;
}

function scoreStrategies(market: MarketView, vol: VolView, horizon: Horizon, risk: RiskAppetite): Recommendation[] {
  const scores: Record<string, number> = {};
  const rationales: Record<string, string> = {};
  const allStrats = Object.keys(STRATEGIES);
  allStrats.forEach(s => { scores[s] = 0; });

  // Market view scoring
  if (market === 'Strongly Bullish') {
    scores['Risk Reversal'] = (scores['Risk Reversal'] || 0) + 3;
    scores['Bull Call Spread'] = (scores['Bull Call Spread'] || 0) + 3;
    scores['Cash-Secured Put'] = (scores['Cash-Secured Put'] || 0) + 2;
    scores['The Wheel'] = (scores['The Wheel'] || 0) + 2;
  } else if (market === 'Bullish') {
    scores['Bull Call Spread'] = (scores['Bull Call Spread'] || 0) + 3;
    scores['Covered Call'] = (scores['Covered Call'] || 0) + 3;
    scores['Bull Put Spread'] = (scores['Bull Put Spread'] || 0) + 2;
    scores['Cash-Secured Put'] = (scores['Cash-Secured Put'] || 0) + 2;
  } else if (market === 'Neutral') {
    scores['Iron Condor'] = (scores['Iron Condor'] || 0) + 4;
    scores['Iron Butterfly'] = (scores['Iron Butterfly'] || 0) + 3;
    scores['Short Strangle'] = (scores['Short Strangle'] || 0) + 3;
    scores['Calendar Spread'] = (scores['Calendar Spread'] || 0) + 2;
    scores['Short Straddle'] = (scores['Short Straddle'] || 0) + 2;
  } else if (market === 'Bearish') {
    scores['Bear Put Spread'] = (scores['Bear Put Spread'] || 0) + 3;
    scores['Bear Call Spread'] = (scores['Bear Call Spread'] || 0) + 3;
    scores['Protective Put'] = (scores['Protective Put'] || 0) + 2;
  } else if (market === 'Strongly Bearish') {
    scores['Bear Put Spread'] = (scores['Bear Put Spread'] || 0) + 4;
    scores['Put Ratio Spread'] = (scores['Put Ratio Spread'] || 0) + 3;
    scores['Bear Call Spread'] = (scores['Bear Call Spread'] || 0) + 2;
  }

  // Volatility view scoring
  if (vol === 'Vol Spike Expected') {
    scores['Long Straddle'] = (scores['Long Straddle'] || 0) + 3;
    scores['Long Strangle'] = (scores['Long Strangle'] || 0) + 3;
    scores['Calendar Spread'] = (scores['Calendar Spread'] || 0) + 2;
  } else if (vol === 'Stable') {
    scores['Iron Condor'] = (scores['Iron Condor'] || 0) + 2;
    scores['Short Strangle'] = (scores['Short Strangle'] || 0) + 2;
    scores['Covered Call'] = (scores['Covered Call'] || 0) + 2;
    scores['Iron Butterfly'] = (scores['Iron Butterfly'] || 0) + 2;
  } else if (vol === 'Vol Crush Expected') {
    scores['Short Straddle'] = (scores['Short Straddle'] || 0) + 3;
    scores['Iron Condor'] = (scores['Iron Condor'] || 0) + 3;
    scores['Short Strangle'] = (scores['Short Strangle'] || 0) + 2;
  }

  // Time horizon scoring
  if (horizon === '< 2 weeks') {
    scores['Iron Condor'] = (scores['Iron Condor'] || 0) + 2;
    scores['Short Strangle'] = (scores['Short Strangle'] || 0) + 2;
    scores['Short Straddle'] = (scores['Short Straddle'] || 0) + 1;
  } else if (horizon === '6 months+') {
    scores['Calendar Spread'] = (scores['Calendar Spread'] || 0) + 3;
    scores['Diagonal Spread'] = (scores['Diagonal Spread'] || 0) + 3;
    scores['Bull Call Spread'] = (scores['Bull Call Spread'] || 0) + 1;
  }

  // Risk appetite filtering
  const results: Recommendation[] = [];
  for (const [name, score] of Object.entries(scores)) {
    if (score === 0) continue;
    const stratRisk = STRATEGIES[name]?.risk;
    if (!stratRisk) continue;

    // Conservative: filter out High risk
    if (risk === 'Conservative' && stratRisk === 'High') continue;
    // Aggressive: bonus for High risk
    let finalScore = score;
    if (risk === 'Aggressive' && stratRisk === 'High') finalScore += 2;
    if (risk === 'Conservative' && stratRisk === 'Low') finalScore += 1;

    const rationale = buildRationale(name, market, vol, horizon, risk);
    results.push({ name, score: finalScore, rationale });
  }

  results.sort((a, b) => b.score - a.score);
  return results.slice(0, 3);
}

function buildRationale(name: string, market: MarketView, vol: VolView, horizon: Horizon, risk: RiskAppetite): string {
  const templates: Record<string, string> = {
    'Iron Condor': `Iron Condor is ideal for your ${market.toLowerCase()} view with ${vol.toLowerCase()} conditions. You profit as long as the stock stays within your strike range. Time decay (theta) works in your favour every day. Best suited for range-bound markets with a ${horizon} outlook.`,
    'Bull Call Spread': `With a ${market.toLowerCase()} view, a Bull Call Spread gives you capped but defined upside. You pay less premium than a naked call while still profiting from a rise. Your ${risk.toLowerCase()} risk appetite aligns well with this defined-risk approach over a ${horizon} horizon.`,
    'Bear Put Spread': `A Bear Put Spread suits your ${market.toLowerCase()} stance perfectly. You profit from a moderate decline while capping risk — ideal for a ${risk.toLowerCase()} investor expecting a move down over ${horizon}.`,
    'Long Straddle': `With a vol spike expected, a Long Straddle lets you profit from a big move in either direction. Perfect for binary events like earnings. Your ${horizon} timeframe gives the trade time to work.`,
    'Short Straddle': `In a ${vol.toLowerCase()} environment, selling a Straddle maximises premium collected. You profit if the stock stays near the strike. Requires careful risk management over your ${horizon} window.`,
    'Covered Call': `A Covered Call is a classic income strategy for ${market.toLowerCase()} markets. Sell a call against existing shares to generate steady premium income. Low risk and suits a ${horizon} timeframe well.`,
    'Iron Butterfly': `An Iron Butterfly profits from low volatility and a pinpoint neutral market. You collect maximum premium near the ATM strike with defined risk — well-suited to your ${risk.toLowerCase()} risk appetite.`,
    'Calendar Spread': `Calendar Spreads thrive in stable or neutral markets and benefit from the time decay difference between near and far options. Your ${horizon} horizon is ideal for this strategy.`,
    'Cash-Secured Put': `A Cash-Secured Put lets you earn premium while waiting to buy stock at a lower price. With a ${market.toLowerCase()} view, you either collect premium or buy shares at your target price.`,
    'Risk Reversal': `A Risk Reversal provides leveraged upside for a ${market.toLowerCase()} investor. Often entered for zero or low cost, it gives strong upside exposure. Suitable for ${risk.toLowerCase()} investors who want directional leverage.`,
    'Put Ratio Spread': `In a ${market.toLowerCase()} market, a Put Ratio Spread profits from a moderate decline. Be cautious below the lower strike — this is a High-risk strategy best for experienced traders.`,
    'Bear Call Spread': `A Bear Call Spread collects premium in a ${market.toLowerCase()} market. You profit if the stock stays below your short strike. Defined risk suits your ${risk.toLowerCase()} appetite.`,
    'Bull Put Spread': `A Bull Put Spread earns premium in a ${market.toLowerCase()} market. You profit as long as the stock stays above your short put strike — great for income over ${horizon}.`,
    'Long Strangle': `A Long Strangle is cheaper than a straddle and profits from a large move either way. With ${vol.toLowerCase()}, you're positioned for the big breakout over ${horizon}.`,
    'Short Strangle': `In a ${vol.toLowerCase()} environment, selling OTM calls and puts gives you a wide profit zone. You benefit from time decay and vol crush. Manage risk carefully over ${horizon}.`,
    'Diagonal Spread': `A Diagonal Spread combines a directional view with time decay benefits. Sell a short-term option and buy a longer-dated one — great for your ${horizon} timeframe.`,
    'Protective Put': `A Protective Put gives you insurance against a downturn while keeping upside exposure. Perfect for your ${market.toLowerCase()} market view with downside protection.`,
    'The Wheel': `The Wheel strategy generates consistent income over time. Sell puts, get assigned, then sell calls — ideal for a ${risk.toLowerCase()} investor wanting income from quality stocks.`,
    'Butterfly Spread': `A Butterfly Spread profits from minimal movement near a specific strike. With a ${market.toLowerCase()} view, this lets you bet on a price target with defined and limited risk.`,
    'Collar': `A Collar limits both upside and downside on existing stock. Great for locking in gains while staying invested — fits a ${risk.toLowerCase()} risk profile perfectly.`,
  };
  return templates[name] || `${name} matches your ${market.toLowerCase()} market view with ${vol.toLowerCase()} volatility expectations over ${horizon}.`;
}

interface SelectOption<T extends string> {
  value: T;
  label: string;
}

function SelectGroup<T extends string>({
  label, options, value, onChange,
}: {
  label: string; options: SelectOption<T>[]; value: T | null; onChange: (v: T) => void;
}) {
  return (
    <div style={{ marginBottom: 28 }}>
      <div style={{ color: C.textMid, fontSize: 13, fontWeight: 600, marginBottom: 12, textTransform: 'uppercase', letterSpacing: '0.07em' }}>{label}</div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
        {options.map(opt => (
          <button
            key={opt.value}
            onClick={() => onChange(opt.value)}
            style={{
              padding: '10px 18px', borderRadius: 8, cursor: 'pointer', fontSize: 14,
              background: value === opt.value ? C.goldDim : C.surface,
              border: `1px solid ${value === opt.value ? C.gold : C.border}`,
              color: value === opt.value ? C.gold : C.textMid,
              fontWeight: value === opt.value ? 700 : 400,
              transition: 'all 0.15s ease',
            }}
          >
            {opt.label}
          </button>
        ))}
      </div>
    </div>
  );
}

export default function StrategyRecommender() {
  const { setStrat, goToBuilder } = useAppState();
  const [marketView, setMarketView] = useState<MarketView | null>(null);
  const [volView, setVolView] = useState<VolView | null>(null);
  const [horizon, setHorizon] = useState<Horizon | null>(null);
  const [riskAppetite, setRiskAppetite] = useState<RiskAppetite | null>(null);
  const [results, setResults] = useState<Recommendation[] | null>(null);

  const allSelected = marketView && volView && horizon && riskAppetite;

  function handleFind() {
    if (!allSelected) return;
    const recs = scoreStrategies(marketView!, volView!, horizon!, riskAppetite!);
    setResults(recs);
  }

  function handleBuild(name: string) {
    setStrat(name);
    goToBuilder();
  }

  return (
    <div style={{ background: C.bg, minHeight: '100vh', paddingTop: 60 }}>
      <div style={{ maxWidth: 900, margin: '0 auto', padding: '24px 20px' }}>
        <h1 style={{ color: C.text, fontSize: 22, fontWeight: 700, marginBottom: 8 }}>Strategy Recommender</h1>
        <p style={{ color: C.textMid, fontSize: 14, marginBottom: 32 }}>
          Tell us your market outlook and we'll match you with the best options strategies.
        </p>

        {!results ? (
          <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 16, padding: '32px 28px' }}>
            <SelectGroup<MarketView>
              label="Market View"
              options={[
                { value: 'Strongly Bearish', label: 'Strongly Bearish 🐻' },
                { value: 'Bearish', label: 'Bearish' },
                { value: 'Neutral', label: 'Neutral 🦀' },
                { value: 'Bullish', label: 'Bullish' },
                { value: 'Strongly Bullish', label: 'Strongly Bullish 🐂' },
              ]}
              value={marketView}
              onChange={setMarketView}
            />
            <SelectGroup<VolView>
              label="Volatility View"
              options={[
                { value: 'Vol Spike Expected', label: 'Vol Spike Expected 📈' },
                { value: 'Stable', label: 'Stable' },
                { value: 'Vol Crush Expected', label: 'Vol Crush Expected 📉' },
              ]}
              value={volView}
              onChange={setVolView}
            />
            <SelectGroup<Horizon>
              label="Time Horizon"
              options={[
                { value: '< 2 weeks', label: '< 2 weeks' },
                { value: '1 month', label: '1 month' },
                { value: '3 months', label: '3 months' },
                { value: '6 months+', label: '6 months+' },
              ]}
              value={horizon}
              onChange={setHorizon}
            />
            <SelectGroup<RiskAppetite>
              label="Risk Appetite"
              options={[
                { value: 'Conservative', label: 'Conservative 🛡️' },
                { value: 'Moderate', label: 'Moderate' },
                { value: 'Aggressive', label: 'Aggressive 🎯' },
              ]}
              value={riskAppetite}
              onChange={setRiskAppetite}
            />

            <button
              onClick={handleFind}
              disabled={!allSelected}
              style={{
                width: '100%', padding: '14px', borderRadius: 10, border: 'none',
                background: allSelected ? goldGrad : C.surfaceUp,
                color: allSelected ? '#06080f' : C.textDim,
                fontWeight: 700, fontSize: 16, cursor: allSelected ? 'pointer' : 'not-allowed',
                letterSpacing: '0.04em', transition: 'all 0.2s ease',
              }}
            >
              Find My Strategies →
            </button>
          </div>
        ) : (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <h2 style={{ color: C.text, fontSize: 18 }}>Top Recommendations for You</h2>
              <button
                onClick={() => setResults(null)}
                style={{ padding: '8px 16px', background: C.surface, border: `1px solid ${C.border}`, borderRadius: 8, color: C.textMid, fontSize: 13, cursor: 'pointer' }}
              >
                ← Start Over
              </button>
            </div>

            {results.length === 0 ? (
              <div style={{ background: C.surface, borderRadius: 12, padding: 32, textAlign: 'center', color: C.textMid }}>
                No strategies matched your criteria. Try different inputs.
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                {results.map((rec, idx) => {
                  const stratInfo = STRATEGIES[rec.name];
                  const riskColor = stratInfo ? RISK_COLORS[stratInfo.risk] : C.textMid;
                  return (
                    <div key={rec.name} style={{
                      background: C.surface, border: `1px solid ${idx === 0 ? C.borderGold : C.border}`,
                      borderRadius: 14, padding: '24px 28px',
                      boxShadow: idx === 0 ? `0 0 20px rgba(201,168,76,0.1)` : 'none',
                    }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                          <div style={{
                            fontFamily: C.mono, fontSize: 12, fontWeight: 700,
                            color: idx === 0 ? C.bg : C.textMid,
                            background: idx === 0 ? goldGrad : C.surfaceUp,
                            padding: '4px 10px', borderRadius: 6,
                          }}>#{idx + 1}</div>
                          <h3 style={{ color: C.gold, fontSize: 20, fontWeight: 700 }}>{rec.name}</h3>
                        </div>
                        <span style={{
                          padding: '4px 12px', borderRadius: 6, fontSize: 12, fontWeight: 700,
                          background: `${riskColor}22`, color: riskColor, border: `1px solid ${riskColor}44`,
                        }}>
                          {stratInfo?.risk || 'Med'} Risk
                        </span>
                      </div>

                      <p style={{ color: C.textMid, fontSize: 14, lineHeight: 1.7, marginBottom: 16 }}>
                        {rec.rationale}
                      </p>

                      {stratInfo && (
                        <div style={{ color: C.textDim, fontSize: 12, marginBottom: 16, fontStyle: 'italic' }}>
                          {stratInfo.view}
                        </div>
                      )}

                      <button
                        onClick={() => handleBuild(rec.name)}
                        style={{
                          padding: '10px 22px', background: goldGrad, border: 'none',
                          borderRadius: 8, color: '#06080f', fontWeight: 700, fontSize: 14,
                          cursor: 'pointer', letterSpacing: '0.04em',
                        }}
                      >
                        Build This Strategy →
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
