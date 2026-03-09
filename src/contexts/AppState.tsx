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

type Screen = 'onboarding' | 'dashboard' | 'builder' | 'positions' | 'greeks-lab' | 'recommender';

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
}

const AppStateContext = createContext<AppStateContextType | null>(null);

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

  // Live price simulation — updates every 3 seconds
  const pricesRef = useRef(prices);
  pricesRef.current = prices;

  useEffect(() => {
    const interval = setInterval(() => {
      setPrevPrices({ ...pricesRef.current });
      setPrices(prev => {
        const next: Record<string, number> = {};
        Object.keys(prev).forEach(sym => {
          const noise = 1 + (Math.random() - 0.5) * 0.01; // ±0.5%
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
      setLastUpdate(new Date().toLocaleTimeString());
    }, 3000);
    return () => clearInterval(interval);
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

  return (
    <AppStateContext.Provider
      value={{
        screen, setScreen,
        userProfile, setUserProfile,
        ticker, setTicker,
        strat, setStrat,
        prices, prevPrices, history, lastUpdate,
        positions, addPosition, updatePositionNotes, closePosition,
        goToBuilder, goToDashboard, goToPositions, goToGreeksLab, goToRecommender,
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
