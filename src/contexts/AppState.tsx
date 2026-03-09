import React, { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react';
import { TICKERS } from '@/lib/instruments';
import type { Leg, StrategyMeta } from '@/lib/blackScholes';

export interface UserProfile {
  experience: 'Never' | 'Less than 1 year' | '1-3 years' | '3+ years';
  objective: 'Capital preservation' | 'Income generation' | 'Growth' | 'Speculation';
  lossTolerance: 'Up to 10%' | 'Up to 25%' | 'Up to 50%' | 'More than 50%';
  understanding: 'No' | 'Somewhat' | 'Yes' | 'Yes, and I understand Greeks';
  suitabilityScore: number;
  tier: 'Restricted' | 'Standard' | 'Advanced';
  completedAt: string;
}

export interface Position {
  id: string;
  ticker: string;
  strategy: string;
  legs: Leg[];
  entryDate: string;
  entrySpot: number;
  entryCost: number;
  meta: StrategyMeta;
  status: 'Active' | 'Expired' | 'Closed';
  notes?: string;
}

type Screen = 'onboarding' | 'dashboard' | 'builder' | 'positions' | 'greeks-lab' | 'recommender' | 'intelligence';

interface AppStateContextType {
  screen: Screen;
  setScreen: (s: Screen) => void;
  userProfile: UserProfile | null;
  setUserProfile: (p: UserProfile) => void;
  ticker: string;
  setTicker: (t: string) => void;
  strat: string;
  setStrat: (s: string) => void;
  prices: Record<string, number>;
  prevPrices: Record<string, number>;
  history: Record<string, number[]>;
  lastUpdate: string;
  positions: Position[];
  addPosition: (p: Omit<Position, 'id' | 'status'>) => void;
  updatePositionNotes: (id: string, notes: string) => void;
  closePosition: (id: string) => void;
  goToBuilder: () => void;
  goToDashboard: () => void;
  goToPositions: () => void;
  goToGreeksLab: () => void;
  goToRecommender: () => void;
  goToIntelligence: () => void;
  priceSource: 'live' | 'simulated';
  polygonApiKey: string;
  setPolygonApiKey: (key: string) => void;
}

const AppStateContext = createContext<AppStateContextType | null>(null);

const YAHOO_PROXY = 'https://api.allorigins.win/raw?url=';
const BATCH_SIZE = 8;
const BATCH_DELAY_MS = 300;

async function fetchYahooPrice(sym: string): Promise<number | null> {
  try {
    const encoded = encodeURIComponent(
      `https://query1.finance.yahoo.com/v8/finance/chart/${sym}?interval=1d&range=1d`
    );
    const res = await fetch(`${YAHOO_PROXY}${encoded}`, { signal: AbortSignal.timeout(8000) });
    if (!res.ok) return null;
    const data = await res.json();
    const price = data?.chart?.result?.[0]?.meta?.regularMarketPrice;
    return typeof price === 'number' ? price : null;
  } catch {
    return null;
  }
}

async function fetchPolygonPrice(sym: string, apiKey: string): Promise<number | null> {
  if (!apiKey) return null;
  try {
    const res = await fetch(
      `https://api.polygon.io/v2/last/trade/${sym}?apikey=${apiKey}`,
      { signal: AbortSignal.timeout(8000) }
    );
    if (!res.ok) return null;
    const data = await res.json();
    const price = data?.results?.p;
    return typeof price === 'number' ? price : null;
  } catch {
    return null;
  }
}

function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

export function AppStateProvider({ children }: { children: React.ReactNode }) {
  const [screen, setScreen] = useState<Screen>('onboarding');
  const [userProfile, setUserProfileState] = useState<UserProfile | null>(null);
  const [ticker, setTicker] = useState<string>('SPY');
  const [strat, setStrat] = useState<string>('Bull Call Spread');
  const [prices, setPrices] = useState<Record<string, number>>({});
  const [prevPrices, setPrevPrices] = useState<Record<string, number>>({});
  const [history, setHistory] = useState<Record<string, number[]>>({});
  const [lastUpdate, setLastUpdate] = useState<string>('');
  const [positions, setPositions] = useState<Position[]>([]);
  const [priceSource, setPriceSource] = useState<'live' | 'simulated'>('simulated');
  const [polygonApiKey, setPolygonApiKeyState] = useState<string>(() => {
    try { return localStorage.getItem('optix_polygon_key') || ''; } catch { return ''; }
  });

  // Initialize prices from seed values
  useEffect(() => {
    const init: Record<string, number> = {};
    const initHistory: Record<string, number[]> = {};
    TICKERS.forEach(t => {
      init[t.sym] = t.seed;
      initHistory[t.sym] = Array(50).fill(t.seed);
    });
    setPrices(init);
    setPrevPrices(init);
    setHistory(initHistory);
  }, []);

  // Load from localStorage on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem('optix_profile');
      if (stored) {
        const profile: UserProfile = JSON.parse(stored);
        setUserProfileState(profile);
        setScreen('dashboard');
      }
      const storedPositions = localStorage.getItem('optix_positions');
      if (storedPositions) {
        setPositions(JSON.parse(storedPositions));
      }
    } catch {
      // ignore parse errors
    }
  }, []);

  // Live price fetching
  const pricesRef = useRef(prices);
  pricesRef.current = prices;
  const polygonKeyRef = useRef(polygonApiKey);
  polygonKeyRef.current = polygonApiKey;

  const fetchAllPrices = useCallback(async () => {
    const syms = TICKERS.map(t => t.sym);
    const batches: string[][] = [];
    for (let i = 0; i < syms.length; i += BATCH_SIZE) {
      batches.push(syms.slice(i, i + BATCH_SIZE));
    }

    const fetched: Record<string, number> = {};
    let anyLive = false;

    for (let b = 0; b < batches.length; b++) {
      if (b > 0) await sleep(BATCH_DELAY_MS);
      const batch = batches[b];
      await Promise.all(batch.map(async sym => {
        let price = await fetchYahooPrice(sym);
        if (price === null && polygonKeyRef.current) {
          price = await fetchPolygonPrice(sym, polygonKeyRef.current);
        }
        if (price !== null && price > 0) {
          fetched[sym] = price;
          anyLive = true;
        }
      }));
    }

    if (anyLive) {
      setPrevPrices({ ...pricesRef.current });
      setPrices(prev => {
        const next = { ...prev };
        Object.keys(fetched).forEach(sym => { next[sym] = fetched[sym]; });
        return next;
      });
      setHistory(prev => {
        const next: Record<string, number[]> = { ...prev };
        Object.keys(fetched).forEach(sym => {
          const arr = [...(prev[sym] || []), fetched[sym]];
          if (arr.length > 50) arr.shift();
          next[sym] = arr;
        });
        return next;
      });
      setLastUpdate(new Date().toLocaleTimeString());
      setPriceSource('live');
    } else {
      setPriceSource('simulated');
    }
  }, []);

  // Fetch real prices every 60 seconds
  useEffect(() => {
    fetchAllPrices();
    const interval = setInterval(fetchAllPrices, 60_000);
    return () => clearInterval(interval);
  }, [fetchAllPrices]);

  // Apply tiny noise every 5 seconds between real fetches
  useEffect(() => {
    const interval = setInterval(() => {
      setPrices(prev => {
        const next: Record<string, number> = {};
        Object.keys(prev).forEach(sym => {
          const noise = 1 + (Math.random() - 0.5) * 0.001; // ±0.05%
          next[sym] = Math.max(0.01, parseFloat((prev[sym] * noise).toFixed(2)));
        });
        return next;
      });
      setHistory(prev => {
        const next: Record<string, number[]> = {};
        Object.keys(pricesRef.current).forEach(sym => {
          const arr = [...(prev[sym] || []), pricesRef.current[sym]];
          if (arr.length > 50) arr.shift();
          next[sym] = arr;
        });
        return next;
      });
      if (!lastUpdate) setLastUpdate(new Date().toLocaleTimeString());
    }, 5_000);
    return () => clearInterval(interval);
  }, [lastUpdate]);

  const setPolygonApiKey = useCallback((key: string) => {
    setPolygonApiKeyState(key);
    try { localStorage.setItem('optix_polygon_key', key); } catch { /* ignore */ }
  }, []);

  const setUserProfile = useCallback((p: UserProfile) => {
    setUserProfileState(p);
    localStorage.setItem('optix_profile', JSON.stringify(p));
  }, []);

  const addPosition = useCallback((p: Omit<Position, 'id' | 'status'>) => {
    const newPos: Position = {
      ...p,
      id: `pos_${Date.now()}`,
      status: 'Active',
    };
    setPositions(prev => {
      const updated = [...prev, newPos];
      localStorage.setItem('optix_positions', JSON.stringify(updated));
      return updated;
    });
  }, []);

  const updatePositionNotes = useCallback((id: string, notes: string) => {
    setPositions(prev => {
      const updated = prev.map(p => (p.id === id ? { ...p, notes } : p));
      localStorage.setItem('optix_positions', JSON.stringify(updated));
      return updated;
    });
  }, []);

  const closePosition = useCallback((id: string) => {
    setPositions(prev => {
      const updated = prev.map(p => (p.id === id ? { ...p, status: 'Closed' as const } : p));
      localStorage.setItem('optix_positions', JSON.stringify(updated));
      return updated;
    });
  }, []);

  const goToBuilder = useCallback(() => setScreen('builder'), []);
  const goToDashboard = useCallback(() => setScreen('dashboard'), []);
  const goToPositions = useCallback(() => setScreen('positions'), []);
  const goToGreeksLab = useCallback(() => setScreen('greeks-lab'), []);
  const goToRecommender = useCallback(() => setScreen('recommender'), []);
  const goToIntelligence = useCallback(() => setScreen('intelligence'), []);

  return (
    <AppStateContext.Provider
      value={{
        screen, setScreen,
        userProfile, setUserProfile,
        ticker, setTicker,
        strat, setStrat,
        prices, prevPrices, history, lastUpdate,
        positions, addPosition, updatePositionNotes, closePosition,
        goToBuilder, goToDashboard, goToPositions, goToGreeksLab, goToRecommender, goToIntelligence,
        priceSource, polygonApiKey, setPolygonApiKey,
      }}
    >
      {children}
    </AppStateContext.Provider>
  );
}

export function useAppState(): AppStateContextType {
  const ctx = useContext(AppStateContext);
  if (!ctx) throw new Error('useAppState must be used within AppStateProvider');
  return ctx;
}
