import React, { useState, useEffect, useCallback } from 'react';
import { useAppState } from '@/contexts/AppState';
import { TICKERS, SECTOR_COLORS } from '@/lib/instruments';
import { GLOSSARY } from '@/lib/glossary';
import InfoTooltip from '@/components/InfoTooltip';

const C = {
  bg: '#06080f', surface: '#0c1018', surfaceUp: '#111827',
  border: '#1c2333', borderGold: 'rgba(180,145,60,0.35)',
  gold: '#c9a84c', goldLight: '#e2c97e', goldDim: 'rgba(201,168,76,0.12)',
  text: '#e8eaf0', textMid: '#8a95a8', textDim: '#3d4a5c',
  green: '#34d399', red: '#f87171', orange: '#fb923c', blue: '#60a5fa',
  mono: "'IBM Plex Mono', monospace",
};
const goldGrad = 'linear-gradient(135deg,#c9a84c,#e2c97e,#b8960a)';

const YAHOO_PROXY = 'https://api.allorigins.win/raw?url=';

interface AssetData {
  label: string;
  sym: string;
  price: number | null;
  change: number | null;
  changePct: number | null;
  tooltip?: string;
}

interface NewsItem {
  title: string;
  link: string;
  pubDate: string;
  description: string;
}

function shimmer(w: number | string, h: number) {
  return (
    <div style={{
      width: w, height: h, borderRadius: 6,
      background: 'linear-gradient(90deg,#111827 25%,#1c2333 50%,#111827 75%)',
      backgroundSize: '200% 100%',
      animation: 'shimmer 1.5s infinite',
    }} />
  );
}

function toET(d: Date): string {
  try {
    return d.toLocaleString('en-US', { timeZone: 'America/New_York', hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true });
  } catch {
    return d.toLocaleTimeString();
  }
}

function relativeTime(dateStr: string): string {
  try {
    const d = new Date(dateStr);
    const diff = (Date.now() - d.getTime()) / 1000;
    if (diff < 60) return 'just now';
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
    return `${Math.floor(diff / 86400)}d ago`;
  } catch {
    return dateStr;
  }
}

async function fetchYahooAsset(sym: string): Promise<{ price: number; change: number; changePct: number } | null> {
  try {
    const encoded = encodeURIComponent(
      `https://query1.finance.yahoo.com/v8/finance/chart/${sym}?interval=1d&range=1d`
    );
    const res = await fetch(`${YAHOO_PROXY}${encoded}`, { signal: AbortSignal.timeout(10000) });
    if (!res.ok) return null;
    const data = await res.json();
    const meta = data?.chart?.result?.[0]?.meta;
    if (!meta) return null;
    const price: number = meta.regularMarketPrice;
    const prevClose: number = meta.chartPreviousClose || meta.previousClose || price;
    const change = price - prevClose;
    const changePct = prevClose !== 0 ? (change / prevClose) * 100 : 0;
    return { price, change, changePct };
  } catch {
    return null;
  }
}

const CROSS_ASSET_DEFS = [
  { sym: '^GSPC',    label: 'S&P 500',        tooltip: undefined },
  { sym: '^NDX',     label: 'Nasdaq 100',      tooltip: undefined },
  { sym: '^RUT',     label: 'Russell 2000',    tooltip: undefined },
  { sym: '^TNX',     label: '10Y Yield %',     tooltip: GLOSSARY['10Y Yield'] },
  { sym: 'DX-Y.NYB', label: 'DXY Dollar',      tooltip: GLOSSARY['DXY'] },
  { sym: 'CL=F',     label: 'WTI Oil',         tooltip: GLOSSARY['WTI'] },
  { sym: 'GC=F',     label: 'Gold',            tooltip: undefined },
  { sym: 'BTC-USD',  label: 'Bitcoin',         tooltip: undefined },
];

const FUTURES_DEFS = [
  { sym: 'ES=F',  label: 'S&P Futures (ES)',      tooltip: GLOSSARY['ES Futures'] },
  { sym: 'NQ=F',  label: 'Nasdaq Futures (NQ)',   tooltip: undefined },
  { sym: 'RTY=F', label: 'Russell Futures (RTY)', tooltip: undefined },
];

function interpretAsset(label: string, changePct: number | null): string {
  if (changePct === null) return 'Data unavailable';
  const up = changePct > 0;
  if (label.includes('S&P') || label.includes('Nasdaq') || label.includes('Russell')) {
    return up ? 'Risk-on — equities advancing' : 'Equities under pressure';
  }
  if (label.includes('10Y')) {
    return up ? 'Yields rising — watch equities' : 'Yields falling — bond demand up';
  }
  if (label.includes('DXY')) {
    return up ? 'Dollar strengthening — pressure on commodities/EM' : 'Dollar weakening — commodity tailwind';
  }
  if (label.includes('WTI')) {
    return up ? 'Oil rising — energy sector benefit' : 'Oil falling — potential demand concern';
  }
  if (label.includes('Gold')) {
    return up ? 'Gold up — risk-off / inflation hedge' : 'Gold down — risk appetite returning';
  }
  if (label.includes('Bitcoin')) {
    return up ? 'Crypto advancing — risk appetite elevated' : 'Crypto retreating — risk caution';
  }
  if (label.includes('Futures')) {
    return up ? 'Pre-market pointing higher' : 'Pre-market pointing lower';
  }
  return up ? 'Advancing' : 'Declining';
}

function AssetCard({ asset, loading }: { asset: AssetData; loading: boolean }) {
  const up = asset.changePct !== null && asset.changePct >= 0;
  const chgColor = asset.changePct === null ? C.textMid : up ? C.green : C.red;

  return (
    <div style={{
      background: C.surface, border: `1px solid ${C.border}`, borderRadius: 10,
      padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: 6,
    }}>
      <div style={{ fontSize: 11, color: C.textMid, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 4 }}>
        {asset.label}
        {asset.tooltip && <InfoTooltip text={asset.tooltip} />}
      </div>
      {loading ? (
        <>{shimmer('80%', 22)}{shimmer('60%', 14)}</>
      ) : asset.price === null ? (
        <div style={{ fontSize: 12, color: C.orange }}>⚠️ Unavailable</div>
      ) : (
        <>
          <div style={{ fontSize: 20, fontWeight: 700, fontFamily: C.mono, color: C.text }}>
            {asset.label === '10Y Yield %' ? asset.price.toFixed(3) : asset.price.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
          <div style={{ fontSize: 12, fontFamily: C.mono, color: chgColor }}>
            {asset.change !== null && (
              <>{asset.change >= 0 ? '+' : ''}{asset.change.toFixed(2)}{' '}
              ({asset.changePct !== null ? (asset.changePct >= 0 ? '+' : '') + asset.changePct.toFixed(2) + '%' : ''})</>
            )}
          </div>
        </>
      )}
    </div>
  );
}

export default function IntelligenceScreen() {
  const { prices } = useAppState();
  const [crossAssets, setCrossAssets] = useState<AssetData[]>([]);
  const [futures, setFutures] = useState<AssetData[]>([]);
  const [loadingAssets, setLoadingAssets] = useState(true);
  const [loadingFutures, setLoadingFutures] = useState(true);
  const [news, setNews] = useState<NewsItem[]>([]);
  const [loadingNews, setLoadingNews] = useState(true);
  const [newsError, setNewsError] = useState(false);
  const [fetchedAt, setFetchedAt] = useState('');

  const fetchCrossAssets = useCallback(async () => {
    setLoadingAssets(true);
    const results = await Promise.all(
      CROSS_ASSET_DEFS.map(async (d) => {
        const r = await fetchYahooAsset(d.sym);
        return {
          label: d.label, sym: d.sym,
          price: r?.price ?? null,
          change: r?.change ?? null,
          changePct: r?.changePct ?? null,
          tooltip: d.tooltip,
        };
      })
    );
    setCrossAssets(results);
    setLoadingAssets(false);
  }, []);

  const fetchFutures = useCallback(async () => {
    setLoadingFutures(true);
    const results = await Promise.all(
      FUTURES_DEFS.map(async (d) => {
        const r = await fetchYahooAsset(d.sym);
        return {
          label: d.label, sym: d.sym,
          price: r?.price ?? null,
          change: r?.change ?? null,
          changePct: r?.changePct ?? null,
          tooltip: d.tooltip,
        };
      })
    );
    setFutures(results);
    setLoadingFutures(false);
  }, []);

  const fetchNews = useCallback(async () => {
    setLoadingNews(true);
    setNewsError(false);
    try {
      const rssUrl = 'https://feeds.finance.yahoo.com/rss/2.0/headline?s=SPY,QQQ,AAPL,MSFT,NVDA,TSLA,META&region=US&lang=en-US';
      const encoded = encodeURIComponent(rssUrl);
      const res = await fetch(`${YAHOO_PROXY}${encoded}`, { signal: AbortSignal.timeout(12000) });
      if (!res.ok) throw new Error('Failed');
      const text = await res.text();
      const parser = new DOMParser();
      const xml = parser.parseFromString(text, 'text/xml');
      const items = Array.from(xml.querySelectorAll('item')).slice(0, 10);
      const parsed: NewsItem[] = items.map(item => ({
        title: item.querySelector('title')?.textContent || '',
        link: item.querySelector('link')?.textContent || '#',
        pubDate: item.querySelector('pubDate')?.textContent || '',
        description: item.querySelector('description')?.textContent || '',
      }));
      setNews(parsed);
    } catch {
      setNewsError(true);
    }
    setLoadingNews(false);
  }, []);

  const refreshAll = useCallback(() => {
    setFetchedAt(toET(new Date()));
    fetchCrossAssets();
    fetchFutures();
    fetchNews();
  }, [fetchCrossAssets, fetchFutures, fetchNews]);

  useEffect(() => {
    refreshAll();
    const interval = setInterval(refreshAll, 5 * 60_000);
    return () => clearInterval(interval);
  }, [refreshAll]);

  // Top movers from watchlist
  const gainers = TICKERS
    .map(t => ({ ...t, cur: prices[t.sym] || t.seed, pct: ((prices[t.sym] || t.seed) - t.seed) / t.seed * 100 }))
    .sort((a, b) => b.pct - a.pct)
    .slice(0, 5);

  const losers = TICKERS
    .map(t => ({ ...t, cur: prices[t.sym] || t.seed, pct: ((prices[t.sym] || t.seed) - t.seed) / t.seed * 100 }))
    .sort((a, b) => a.pct - b.pct)
    .slice(0, 5);

  const allAssets = [...crossAssets, ...futures];

  return (
    <div style={{ background: C.bg, minHeight: '100vh', paddingTop: 60, paddingBottom: 40 }}>
      <style>{`
        @keyframes shimmer { 0%{background-position:200% 0} 100%{background-position:-200% 0} }
      `}</style>

      <div style={{ maxWidth: 1200, margin: '0 auto', padding: '24px 20px' }}>

        {/* ── Header ── */}
        <div style={{ marginBottom: 24 }}>
          <h1 style={{
            fontSize: 22, fontWeight: 800, margin: 0,
            background: goldGrad, WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
          }}>⚡ MARKET INTELLIGENCE</h1>
          <div style={{ fontSize: 12, color: C.textMid, marginTop: 4 }}>
            US-focused market brief · 15-min delayed · Data fetched: {fetchedAt || '—'}
          </div>
          <div style={{ display: 'flex', gap: 10, marginTop: 12, flexWrap: 'wrap', alignItems: 'center' }}>
            <span style={{
              background: 'rgba(52,211,153,0.1)', border: '1px solid rgba(52,211,153,0.3)',
              color: C.green, fontSize: 11, fontWeight: 700, padding: '4px 10px', borderRadius: 20,
            }}>↻ Auto-refresh 5 min</span>
            <button
              onClick={refreshAll}
              style={{
                background: C.goldDim, border: `1px solid ${C.borderGold}`,
                color: C.gold, fontSize: 12, fontWeight: 600, padding: '5px 14px',
                borderRadius: 8, cursor: 'pointer',
              }}
            >⟳ Refresh</button>
            <span style={{
              background: 'rgba(96,165,250,0.1)', border: '1px solid rgba(96,165,250,0.3)',
              color: C.blue, fontSize: 11, fontWeight: 700, padding: '4px 10px', borderRadius: 20,
            }}>LIVE DATA</span>
          </div>
        </div>

        {/* ── Section 1: Cross-Asset Snapshot ── */}
        <section style={{ marginBottom: 32 }}>
          <h2 style={{ fontSize: 14, fontWeight: 700, color: C.gold, marginBottom: 12, letterSpacing: '0.08em' }}>
            CROSS-ASSET SNAPSHOT
          </h2>
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(170px, 1fr))',
            gap: 12,
          }}>
            {(loadingAssets ? CROSS_ASSET_DEFS.map(d => ({ label: d.label, sym: d.sym, price: null, change: null, changePct: null, tooltip: d.tooltip })) : crossAssets)
              .map(a => <AssetCard key={a.sym} asset={a} loading={loadingAssets} />)}
          </div>
        </section>

        {/* ── Section 2: Futures Snapshot ── */}
        <section style={{ marginBottom: 32 }}>
          <h2 style={{ fontSize: 14, fontWeight: 700, color: C.gold, marginBottom: 12, letterSpacing: '0.08em' }}>
            FUTURES SNAPSHOT
          </h2>
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
            gap: 12,
          }}>
            {(loadingFutures ? FUTURES_DEFS.map(d => ({ label: d.label, sym: d.sym, price: null, change: null, changePct: null, tooltip: d.tooltip })) : futures)
              .map(a => <AssetCard key={a.sym} asset={a} loading={loadingFutures} />)}
          </div>
        </section>

        {/* ── Section 3: Market Brief Table ── */}
        <section style={{ marginBottom: 32 }}>
          <h2 style={{ fontSize: 14, fontWeight: 700, color: C.gold, marginBottom: 12, letterSpacing: '0.08em' }}>
            MARKET BRIEF
          </h2>
          <div style={{ overflowX: 'auto' }}>
            <table style={{
              width: '100%', borderCollapse: 'collapse',
              background: C.surface, borderRadius: 10, overflow: 'hidden',
              fontSize: 12, color: C.text,
            }}>
              <thead>
                <tr style={{ background: C.surfaceUp }}>
                  {['Section', 'Item', 'Value', 'Change', 'Interpretation', 'Source'].map(h => (
                    <th key={h} style={{ padding: '10px 14px', textAlign: 'left', color: C.gold, fontWeight: 700, fontSize: 11, letterSpacing: '0.06em', borderBottom: `1px solid ${C.border}` }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {allAssets.map((a, i) => {
                  const up = a.changePct !== null && a.changePct >= 0;
                  const chgColor = a.changePct === null ? C.textMid : up ? C.green : C.red;
                  const section = i < CROSS_ASSET_DEFS.length ? 'Cross-Asset' : 'Futures';
                  return (
                    <tr key={a.sym} style={{ borderBottom: `1px solid ${C.border}` }}>
                      <td style={{ padding: '9px 14px', color: C.textMid }}>{section}</td>
                      <td style={{ padding: '9px 14px', fontWeight: 600 }}>{a.label}</td>
                      <td style={{ padding: '9px 14px', fontFamily: C.mono }}>
                        {a.price !== null ? a.price.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '—'}
                      </td>
                      <td style={{ padding: '9px 14px', fontFamily: C.mono, color: chgColor }}>
                        {a.changePct !== null ? `${up ? '+' : ''}${a.changePct.toFixed(2)}%` : '—'}
                      </td>
                      <td style={{ padding: '9px 14px', color: C.textMid }}>{interpretAsset(a.label, a.changePct)}</td>
                      <td style={{ padding: '9px 14px', color: C.textDim }}>Yahoo Finance (15-min delay)</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>

        {/* ── Section 4: Top Movers ── */}
        <section style={{ marginBottom: 32 }}>
          <h2 style={{ fontSize: 14, fontWeight: 700, color: C.gold, marginBottom: 12, letterSpacing: '0.08em' }}>
            TOP MOVERS FROM WATCHLIST
          </h2>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            {/* Gainers */}
            <div>
              <div style={{ fontSize: 12, color: C.green, fontWeight: 700, marginBottom: 8 }}>▲ Top 5 Gainers</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {gainers.map(t => (
                  <div key={t.sym} style={{
                    background: C.surface, border: `1px solid ${C.border}`,
                    borderRadius: 8, padding: '8px 12px',
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8,
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{
                        background: 'rgba(52,211,153,0.1)', border: '1px solid rgba(52,211,153,0.3)',
                        color: C.green, fontSize: 11, fontWeight: 700, padding: '2px 7px', borderRadius: 5,
                      }}>{t.sym}</span>
                      <span style={{ fontSize: 12, color: C.textMid }}>{t.name}</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{ fontSize: 12, fontFamily: C.mono, color: C.text }}>${t.cur.toFixed(2)}</span>
                      <span style={{ fontSize: 11, fontFamily: C.mono, color: C.green, fontWeight: 700 }}>
                        +{t.pct.toFixed(2)}%
                      </span>
                      <span style={{
                        fontSize: 10, padding: '1px 6px', borderRadius: 4,
                        background: `${SECTOR_COLORS[t.sector] || C.gold}22`,
                        color: SECTOR_COLORS[t.sector] || C.gold,
                        border: `1px solid ${SECTOR_COLORS[t.sector] || C.gold}44`,
                      }}>{t.sector}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            {/* Losers */}
            <div>
              <div style={{ fontSize: 12, color: C.red, fontWeight: 700, marginBottom: 8 }}>▼ Top 5 Losers</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {losers.map(t => (
                  <div key={t.sym} style={{
                    background: C.surface, border: `1px solid ${C.border}`,
                    borderRadius: 8, padding: '8px 12px',
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8,
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{
                        background: 'rgba(248,113,113,0.1)', border: '1px solid rgba(248,113,113,0.3)',
                        color: C.red, fontSize: 11, fontWeight: 700, padding: '2px 7px', borderRadius: 5,
                      }}>{t.sym}</span>
                      <span style={{ fontSize: 12, color: C.textMid }}>{t.name}</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{ fontSize: 12, fontFamily: C.mono, color: C.text }}>${t.cur.toFixed(2)}</span>
                      <span style={{ fontSize: 11, fontFamily: C.mono, color: C.red, fontWeight: 700 }}>
                        {t.pct.toFixed(2)}%
                      </span>
                      <span style={{
                        fontSize: 10, padding: '1px 6px', borderRadius: 4,
                        background: `${SECTOR_COLORS[t.sector] || C.gold}22`,
                        color: SECTOR_COLORS[t.sector] || C.gold,
                        border: `1px solid ${SECTOR_COLORS[t.sector] || C.gold}44`,
                      }}>{t.sector}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* ── Section 5: News Feed ── */}
        <section>
          <h2 style={{ fontSize: 14, fontWeight: 700, color: C.gold, marginBottom: 12, letterSpacing: '0.08em' }}>
            NEWS FEED
          </h2>
          {loadingNews ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {Array(5).fill(0).map((_, i) => (
                <div key={i} style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 8, padding: 14 }}>
                  {shimmer('70%', 16)}
                  <div style={{ marginTop: 8 }}>{shimmer('40%', 12)}</div>
                </div>
              ))}
            </div>
          ) : newsError ? (
            <div style={{
              background: 'rgba(251,146,60,0.08)', border: '1px solid rgba(251,146,60,0.3)',
              borderRadius: 10, padding: '14px 18px', color: C.orange, fontSize: 13,
            }}>
              ⚠️ News feed unavailable — check connection.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {news.map((item, i) => (
                <div key={i} style={{
                  background: C.surface, border: `1px solid ${C.border}`,
                  borderRadius: 8, padding: '12px 16px',
                }}>
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8, justifyContent: 'space-between' }}>
                    <a
                      href={item.link}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{ color: C.text, fontWeight: 600, fontSize: 13, textDecoration: 'none', lineHeight: 1.4 }}
                    >
                      {item.title}
                    </a>
                    <InfoTooltip text="This news may affect US equity markets." position="left" />
                  </div>
                  <div style={{ display: 'flex', gap: 10, marginTop: 6, alignItems: 'center' }}>
                    <span style={{
                      fontSize: 10, padding: '1px 7px', borderRadius: 4,
                      background: 'rgba(201,168,76,0.1)', color: C.gold,
                      border: '1px solid rgba(201,168,76,0.3)', fontWeight: 600,
                    }}>Yahoo Finance</span>
                    <span style={{ fontSize: 11, color: C.textDim }}>{relativeTime(item.pubDate)}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

      </div>
    </div>
  );
}
