# OPTIX — Options Trading Platform

> A professional-grade, browser-based options trading simulator built for retail and semi-professional investors who want to learn, explore, and paper-trade options strategies without any financial risk.

---

## 🚀 Tech Stack

| Layer | Technology |
|---|---|
| Framework | React 18 + TypeScript |
| Build Tool | Vite 5 |
| Math Engine | Black-Scholes (custom implementation, no external libs) |
| State | React Context + localStorage persistence |
| Styling | Inline styles only — Royal Black + Gold design system |
| Fonts | IBM Plex Mono (numbers) + Inter (body text) |
| UI Libraries | **None** — pure React + SVG |

---

## ✨ Features

### 6 Full Screens

1. **Onboarding / Risk Gate** — 4-question suitability assessment that classifies users as Restricted / Standard / Advanced based on their experience and risk tolerance.

2. **Dashboard** — Auto-scrolling live ticker tape (20+ instruments), strategy library grid with all 20 strategies, market overview stats, and one-click navigation to the builder.

3. **Strategy Builder** — Multi-leg options builder with 5 tabs:
   - Build (drag-and-drop legs with all parameters)
   - Payoff (SVG payoff chart at expiry)
   - Greeks (aggregate Δ Γ Θ V ρ)
   - Scenarios (P&L at -20% to +20% price moves)
   - Review & Confirm (paper trade entry)

4. **Positions Dashboard** — Live mark-to-market P&L tracker using real-time Black-Scholes pricing, portfolio Greeks aggregation, DTE warnings, and position detail panel.

5. **Greeks Lab** — Interactive lab with 4 sliders (price, IV, DTE, rate), live premium + Greeks update, theta erosion chart, and IV sensitivity table.

6. **Strategy Recommender** — Input your market view, vol view, time horizon, and risk appetite to get your top 3 personalized strategy recommendations with educational rationale.

---

## 🧮 Black-Scholes Engine

All pricing is handled by `src/lib/blackScholes.ts`:

- `bsPrice(S, K, T, r, σ, type)` — European option price
- `bsGreeks(S, K, T, r, σ, type)` — All 5 Greeks: Δ, Γ, Θ, V, ρ
- `calcPayoff(legs, spot, spotAtExpiry)` — Multi-leg strategy payoff
- `calcAggGreeks(legs, spot)` — Portfolio Greeks aggregation
- `calcMeta(legs, spot)` — Max profit/loss, break-evens, margin, risk class
- `buildDefaultLegs(stratName, spot, expiry)` — 20+ strategy templates

---

## 📦 Instruments

20 real-world instruments across 6 sectors:
- **Tech**: AAPL, MSFT, NVDA, GOOGL, META, TSLA, AMZN
- **Finance**: JPM, GS, BAC
- **ETFs**: SPY, QQQ, IWM, VIX
- **Energy**: XOM, CVX
- **Healthcare**: JNJ, PFE
- **Consumer**: WMT, COST

Prices update every 3 seconds with ±0.5% noise and 50-point history for sparklines.

---

## 🏃 How to Run

```bash
npm install
npm run dev
```

Open [http://localhost:5173](http://localhost:5173) in your browser.

```bash
npm run build    # Production build
npm run preview  # Preview production build
```

---

## 🏗️ Architecture

```
src/
├── main.tsx                   # React root
├── App.tsx                    # Router + persistent TopNav
├── contexts/
│   └── AppState.tsx           # Global state (prices, positions, profile)
├── lib/
│   ├── blackScholes.ts        # Pricing engine + math
│   └── instruments.ts         # Tickers, strategies, explanations
├── components/
│   └── TickerCard.tsx         # Reusable ticker card with sparkline
└── screens/
    ├── OnboardingScreen.tsx   # Risk suitability gate
    ├── DashboardScreen.tsx    # Ticker tape + strategy library
    ├── StrategyBuilderScreen.tsx  # Multi-leg options builder
    ├── PositionsDashboard.tsx     # Live P&L positions tracker
    ├── GreeksLabScreen.tsx        # Interactive Greeks visualizer
    └── StrategyRecommender.tsx    # AI-style strategy recommender
```

---

## 💼 LinkedIn Description

> **OPTIX** is a full-stack React + TypeScript options trading simulator featuring a custom Black-Scholes pricing engine, real-time simulated market data, multi-leg strategy builder, live P&L tracking, and an interactive Greeks lab — all built with zero external UI libraries using a bespoke Royal Black + Gold design system. The platform covers 20+ trading strategies across 20 instruments and includes an intelligent strategy recommender powered by a scoring matrix.

---

## 📸 Screenshots

> *Screenshots coming soon — run `npm run dev` to see the platform in action.*

---

## ⚠️ Disclaimer

OPTIX is for **educational and paper trading purposes only**. No real money is involved. This is not financial advice.