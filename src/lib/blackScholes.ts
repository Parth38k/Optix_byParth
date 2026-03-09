// Black-Scholes pricing engine for OPTIX

export type OptionType = 'call' | 'put';
export type Direction = 'buy' | 'sell';

export interface Leg {
  id: string;
  type: OptionType;
  direction: Direction;
  strike: number;
  expiry: string;
  qty: number;
  iv: number; // percentage, e.g. 30 means 30%
}

export interface Greeks {
  delta: number;
  gamma: number;
  theta: number;
  vega: number;
  rho: number;
}

export interface StrategyMeta {
  maxProfit: number | 'unlimited';
  maxLoss: number | 'unlimited';
  breakEvens: number[];
  margin: number;
  riskClass: 'Low' | 'Med' | 'High';
  warnings: string[];
}

export const R = 0.05;

// Cumulative distribution function for standard normal
export function normCDF(x: number): number {
  const a1 = 0.254829592, a2 = -0.284496736, a3 = 1.421413741;
  const a4 = -1.453152027, a5 = 1.061405429, p = 0.3275911;
  const sign = x < 0 ? -1 : 1;
  const t = 1 / (1 + p * Math.abs(x) / Math.SQRT2);
  const poly = t * (a1 + t * (a2 + t * (a3 + t * (a4 + t * a5))));
  const erf = 1 - poly * Math.exp(-(x * x) / 2);
  return 0.5 * (1 + sign * erf);
}

// Normal PDF
function normPDF(x: number): number {
  return Math.exp(-0.5 * x * x) / Math.sqrt(2 * Math.PI);
}

// Black-Scholes option price
// S: spot, K: strike, T: time to expiry in years, r: rate, sigma: IV as decimal, type: call/put
export function bsPrice(
  S: number,
  K: number,
  T: number,
  r: number,
  sigma: number,
  type: OptionType
): number {
  if (T <= 0) {
    if (type === 'call') return Math.max(0, S - K);
    return Math.max(0, K - S);
  }
  const sqrtT = Math.sqrt(T);
  const d1 = (Math.log(S / K) + (r + 0.5 * sigma * sigma) * T) / (sigma * sqrtT);
  const d2 = d1 - sigma * sqrtT;
  if (type === 'call') {
    return S * normCDF(d1) - K * Math.exp(-r * T) * normCDF(d2);
  }
  return K * Math.exp(-r * T) * normCDF(-d2) - S * normCDF(-d1);
}

// Black-Scholes Greeks
export function bsGreeks(
  S: number,
  K: number,
  T: number,
  r: number,
  sigma: number,
  type: OptionType
): Greeks {
  if (T <= 0) {
    return { delta: type === 'call' ? (S > K ? 1 : 0) : (S < K ? -1 : 0), gamma: 0, theta: 0, vega: 0, rho: 0 };
  }
  const sqrtT = Math.sqrt(T);
  const d1 = (Math.log(S / K) + (r + 0.5 * sigma * sigma) * T) / (sigma * sqrtT);
  const d2 = d1 - sigma * sqrtT;
  const pdf_d1 = normPDF(d1);
  const expRT = Math.exp(-r * T);

  const delta = type === 'call' ? normCDF(d1) : normCDF(d1) - 1;
  const gamma = pdf_d1 / (S * sigma * sqrtT);
  const theta_call = (-(S * pdf_d1 * sigma) / (2 * sqrtT) - r * K * expRT * normCDF(d2)) / 365;
  const theta_put = (-(S * pdf_d1 * sigma) / (2 * sqrtT) + r * K * expRT * normCDF(-d2)) / 365;
  const theta = type === 'call' ? theta_call : theta_put;
  const vega = S * pdf_d1 * sqrtT / 100; // per 1% IV change
  const rho_call = K * T * expRT * normCDF(d2) / 100;
  const rho_put = -K * T * expRT * normCDF(-d2) / 100;
  const rho = type === 'call' ? rho_call : rho_put;

  return { delta, gamma, theta, vega, rho };
}

// Days until expiry from ISO date string
export function daysToExpiry(expiry: string): number {
  const exp = new Date(expiry);
  const now = new Date();
  return Math.max(0, Math.round((exp.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)));
}

// Calculate total payoff of strategy at a given spot price at expiry
export function calcPayoff(legs: Leg[], spot: number, spotAtExpiry: number): number {
  return legs.reduce((total, leg) => {
    const intrinsic =
      leg.type === 'call'
        ? Math.max(0, spotAtExpiry - leg.strike)
        : Math.max(0, leg.strike - spotAtExpiry);
    const premium = bsPrice(spot, leg.strike, daysToExpiry(leg.expiry) / 365, R, leg.iv / 100, leg.type);
    const legPayoff = leg.direction === 'buy'
      ? (intrinsic - premium) * leg.qty * 100
      : (premium - intrinsic) * leg.qty * 100;
    return total + legPayoff;
  }, 0);
}

// Calculate aggregate Greeks for a strategy
export function calcAggGreeks(legs: Leg[], spot: number): Greeks {
  const agg: Greeks = { delta: 0, gamma: 0, theta: 0, vega: 0, rho: 0 };
  for (const leg of legs) {
    const T = daysToExpiry(leg.expiry) / 365;
    const g = bsGreeks(spot, leg.strike, T, R, leg.iv / 100, leg.type);
    const mult = leg.direction === 'buy' ? 1 : -1;
    agg.delta += mult * g.delta * leg.qty * 100;
    agg.gamma += mult * g.gamma * leg.qty * 100;
    agg.theta += mult * g.theta * leg.qty * 100;
    agg.vega += mult * g.vega * leg.qty * 100;
    agg.rho += mult * g.rho * leg.qty * 100;
  }
  return agg;
}

// Calculate strategy metadata (max profit, max loss, break-evens, margin, risk class)
export function calcMeta(legs: Leg[], spot: number): StrategyMeta {
  const warnings: string[] = [];
  let margin = 0;

  // Check for naked short positions
  const hasNakedShort = legs.some(l => l.direction === 'sell');
  const isSpread = legs.length >= 2;

  // Scan payoff across price range to estimate max/min
  const lo = spot * 0.3;
  const hi = spot * 1.7;
  const steps = 200;
  let maxPayoff = -Infinity;
  let minPayoff = Infinity;

  for (let i = 0; i <= steps; i++) {
    const s = lo + (hi - lo) * (i / steps);
    const p = calcPayoff(legs, spot, s);
    if (p > maxPayoff) maxPayoff = p;
    if (p < minPayoff) minPayoff = p;
  }

  // Find break-evens (sign changes in payoff)
  const breakEvens: number[] = [];
  let prevPayoff = calcPayoff(legs, spot, lo);
  for (let i = 1; i <= steps; i++) {
    const s = lo + (hi - lo) * (i / steps);
    const p = calcPayoff(legs, spot, s);
    if (prevPayoff * p < 0) {
      // Linear interpolation for exact break-even
      const prevS = lo + (hi - lo) * ((i - 1) / steps);
      const be = prevS + (s - prevS) * (-prevPayoff / (p - prevPayoff));
      breakEvens.push(Math.round(be * 100) / 100);
    }
    prevPayoff = p;
  }

  // Determine if max profit/loss is "unlimited"
  const payoffAtHighEnd = calcPayoff(legs, spot, hi);
  const payoffAtLowEnd = calcPayoff(legs, spot, lo);

  let maxProfit: number | 'unlimited' = maxPayoff;
  let maxLoss: number | 'unlimited' = minPayoff;

  // Check unlimited profit: if payoff keeps increasing at the high end
  if (payoffAtHighEnd > maxPayoff * 0.95 && legs.some(l => l.type === 'call' && l.direction === 'buy')) {
    maxProfit = 'unlimited';
  }
  // Check unlimited loss: if payoff keeps decreasing at the high end
  if (payoffAtHighEnd < minPayoff * 0.95 && legs.some(l => l.type === 'call' && l.direction === 'sell')) {
    maxLoss = 'unlimited';
  }

  // Margin calculation for short positions
  if (hasNakedShort && !isSpread) {
    margin = spot * 0.2 * legs.filter(l => l.direction === 'sell').reduce((s, l) => s + l.qty, 0) * 100;
    warnings.push('Contains short options — requires margin');
  }

  // Risk class
  let riskClass: 'Low' | 'Med' | 'High' = 'Med';
  if (maxLoss === 'unlimited') {
    riskClass = 'High';
    warnings.push('Unlimited loss potential — advanced strategy');
  } else if (typeof maxLoss === 'number' && maxLoss > -spot * 5) {
    riskClass = 'Low';
  }

  if (legs.some(l => l.direction === 'sell' && l.type === 'call') && !isSpread) {
    warnings.push('Naked call: unlimited loss risk');
    riskClass = 'High';
  }

  return {
    maxProfit,
    maxLoss,
    breakEvens,
    margin,
    riskClass,
    warnings,
  };
}

// Build default legs for common strategies
export function buildDefaultLegs(stratName: string, spot: number, expiry: string): Leg[] {
  const atm = Math.round(spot);
  const otm1 = Math.round(spot * 1.05);
  const otm2 = Math.round(spot * 1.10);
  const itm1 = Math.round(spot * 0.95);
  const itm2 = Math.round(spot * 0.90);

  const leg = (
    id: string,
    type: OptionType,
    direction: Direction,
    strike: number,
    iv = 30
  ): Leg => ({ id, type, direction, strike, expiry, qty: 1, iv });

  // Far expiry for calendar/diagonal
  const farDate = new Date(expiry);
  farDate.setMonth(farDate.getMonth() + 2);
  const farExpiry = farDate.toISOString().split('T')[0];

  switch (stratName) {
    case 'Covered Call':
      return [leg('1', 'call', 'sell', otm1)];

    case 'Protective Put':
      return [leg('1', 'put', 'buy', itm1)];

    case 'Bull Call Spread':
      return [leg('1', 'call', 'buy', atm), leg('2', 'call', 'sell', otm1)];

    case 'Bear Put Spread':
      return [leg('1', 'put', 'buy', atm), leg('2', 'put', 'sell', itm1)];

    case 'Bull Put Spread':
      return [leg('1', 'put', 'sell', atm), leg('2', 'put', 'buy', itm1)];

    case 'Bear Call Spread':
      return [leg('1', 'call', 'sell', atm), leg('2', 'call', 'buy', otm1)];

    case 'Long Straddle':
      return [leg('1', 'call', 'buy', atm), leg('2', 'put', 'buy', atm)];

    case 'Short Straddle':
      return [leg('1', 'call', 'sell', atm), leg('2', 'put', 'sell', atm)];

    case 'Long Strangle':
      return [leg('1', 'call', 'buy', otm1), leg('2', 'put', 'buy', itm1)];

    case 'Short Strangle':
      return [leg('1', 'call', 'sell', otm1), leg('2', 'put', 'sell', itm1)];

    case 'Iron Condor':
      return [
        leg('1', 'put', 'buy', itm2),
        leg('2', 'put', 'sell', itm1),
        leg('3', 'call', 'sell', otm1),
        leg('4', 'call', 'buy', otm2),
      ];

    case 'Iron Butterfly':
      return [
        leg('1', 'put', 'buy', itm1),
        leg('2', 'put', 'sell', atm),
        leg('3', 'call', 'sell', atm),
        leg('4', 'call', 'buy', otm1),
      ];

    case 'Collar':
      return [leg('1', 'put', 'buy', itm1), leg('2', 'call', 'sell', otm1)];

    case 'Butterfly Spread':
      return [
        leg('1', 'call', 'buy', itm1),
        leg('2', 'call', 'sell', atm),
        leg('3', 'call', 'buy', otm1),
      ];

    case 'Calendar Spread':
      return [
        { ...leg('1', 'call', 'sell', atm), expiry },
        { ...leg('2', 'call', 'buy', atm), expiry: farExpiry },
      ];

    case 'Diagonal Spread':
      return [
        { ...leg('1', 'call', 'sell', otm1), expiry },
        { ...leg('2', 'call', 'buy', atm), expiry: farExpiry },
      ];

    case 'The Wheel':
      return [leg('1', 'put', 'sell', atm)];

    case 'Cash-Secured Put':
      return [leg('1', 'put', 'sell', itm1)];

    case 'Put Ratio Spread':
      return [
        leg('1', 'put', 'buy', atm),
        leg('2', 'put', 'sell', itm1),
        leg('3', 'put', 'sell', itm2),
      ];

    case 'Risk Reversal':
      return [leg('1', 'put', 'sell', itm1), leg('2', 'call', 'buy', otm1)];

    default:
      return [leg('1', 'call', 'buy', atm)];
  }
}
