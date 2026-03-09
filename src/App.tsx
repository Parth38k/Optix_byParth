import React from 'react';
import { AppStateProvider, useAppState } from '@/contexts/AppState';
import OnboardingScreen from '@/screens/OnboardingScreen';
import DashboardScreen from '@/screens/DashboardScreen';
import { ContextAwareBuilder } from '@/screens/StrategyBuilderScreen';
import PositionsDashboard from '@/screens/PositionsDashboard';
import GreeksLabScreen from '@/screens/GreeksLabScreen';
import StrategyRecommender from '@/screens/StrategyRecommender';

const C = {
  bg:         '#06080f',
  surface:    '#0c1018',
  border:     '#1c2333',
  borderGold: 'rgba(180,145,60,0.35)',
  gold:       '#c9a84c',
  text:       '#e8eaf0',
  textMid:    '#8a95a8',
  green:      '#34d399',
  orange:     '#fb923c',
  red:        '#f87171',
  mono:       "'IBM Plex Mono', monospace",
};
const goldGrad = 'linear-gradient(135deg,#c9a84c,#e2c97e,#b8960a)';

function TopNav() {
  const { screen, setScreen, userProfile } = useAppState();

  const tierColor = userProfile
    ? userProfile.tier === 'Advanced' ? C.green : userProfile.tier === 'Standard' ? C.orange : C.red
    : C.textMid;

  const navLinks: { key: typeof screen; label: string }[] = [
    { key: 'dashboard', label: 'Dashboard' },
    { key: 'positions', label: 'Positions' },
    { key: 'greeks-lab', label: 'Greeks Lab' },
    { key: 'recommender', label: 'Recommender' },
  ];

  return (
    <div style={{
      position: 'fixed', top: 0, left: 0, right: 0, zIndex: 100,
      background: 'rgba(6,8,15,0.92)',
      backdropFilter: 'blur(12px)',
      borderBottom: `1px solid ${C.borderGold}`,
      height: 56,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: '0 24px',
    }}>
      {/* Logo */}
      <button
        onClick={() => setScreen('dashboard')}
        style={{ display: 'flex', alignItems: 'center', gap: 10, background: 'transparent', border: 'none', cursor: 'pointer' }}
      >
        <span style={{ fontSize: 22 }}>⬡</span>
        <span style={{ fontSize: 18, fontWeight: 800, background: goldGrad, WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', letterSpacing: '0.1em' }}>
          OPTIX
        </span>
      </button>

      {/* Nav Links */}
      <div style={{ display: 'flex', gap: 4 }}>
        {navLinks.map(link => {
          const active = screen === link.key;
          return (
            <button
              key={link.key}
              onClick={() => setScreen(link.key)}
              style={{
                background: 'transparent',
                border: 'none',
                padding: '8px 14px',
                borderRadius: 8,
                cursor: 'pointer',
                color: active ? C.gold : C.textMid,
                fontWeight: active ? 600 : 400,
                fontSize: 14,
                position: 'relative',
                transition: 'color 0.15s',
              }}
            >
              {link.label}
              {active && (
                <div style={{
                  position: 'absolute', bottom: 0, left: '50%', transform: 'translateX(-50%)',
                  width: '60%', height: 2, background: goldGrad, borderRadius: 1,
                }} />
              )}
            </button>
          );
        })}
      </div>

      {/* Right side */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <span style={{ fontSize: 11, color: C.textMid, letterSpacing: '0.06em' }}>PAPER TRADING</span>
        {userProfile && (
          <span style={{
            padding: '4px 12px', borderRadius: 12, fontSize: 12, fontWeight: 700,
            background: `${tierColor}22`, color: tierColor, border: `1px solid ${tierColor}44`,
          }}>
            {userProfile.tier}
          </span>
        )}
      </div>
    </div>
  );
}

function AppRouter() {
  const { screen, userProfile, goToDashboard } = useAppState();

  if (!userProfile && screen !== 'onboarding') {
    return <OnboardingScreen />;
  }

  if (screen === 'onboarding') {
    return <OnboardingScreen />;
  }

  return (
    <>
      <TopNav />
      {(() => {
        switch (screen) {
          case 'dashboard':   return <DashboardScreen />;
          case 'builder':     return <ContextAwareBuilder onBack={goToDashboard} />;
          case 'positions':   return <PositionsDashboard />;
          case 'greeks-lab':  return <GreeksLabScreen />;
          case 'recommender': return <StrategyRecommender />;
          default:            return <DashboardScreen />;
        }
      })()}
    </>
  );
}

export default function App() {
  return (
    <AppStateProvider>
      <AppRouter />
    </AppStateProvider>
  );
}
