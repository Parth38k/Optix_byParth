// Market instruments and strategy definitions

export interface Ticker {
  sym: string;
  name: string;
  seed: number;
  sector: string;
  type: 'Stock' | 'ETF';
}

export const TICKERS: Ticker[] = [
  // Tech
  { sym: 'AAPL',  name: 'Apple Inc.',            seed: 182,  sector: 'Tech',       type: 'Stock' },
  { sym: 'MSFT',  name: 'Microsoft Corp.',        seed: 415,  sector: 'Tech',       type: 'Stock' },
  { sym: 'NVDA',  name: 'NVIDIA Corp.',           seed: 875,  sector: 'Tech',       type: 'Stock' },
  { sym: 'GOOGL', name: 'Alphabet Inc.',          seed: 175,  sector: 'Tech',       type: 'Stock' },
  { sym: 'META',  name: 'Meta Platforms',         seed: 505,  sector: 'Tech',       type: 'Stock' },
  { sym: 'TSLA',  name: 'Tesla Inc.',             seed: 250,  sector: 'Tech',       type: 'Stock' },
  { sym: 'AMZN',  name: 'Amazon.com Inc.',        seed: 185,  sector: 'Tech',       type: 'Stock' },
  // Finance
  { sym: 'JPM',   name: 'JPMorgan Chase',         seed: 198,  sector: 'Finance',    type: 'Stock' },
  { sym: 'GS',    name: 'Goldman Sachs',          seed: 465,  sector: 'Finance',    type: 'Stock' },
  { sym: 'BAC',   name: 'Bank of America',        seed: 35,   sector: 'Finance',    type: 'Stock' },
  // ETFs
  { sym: 'SPY',   name: 'SPDR S&P 500 ETF',       seed: 540,  sector: 'ETF',        type: 'ETF' },
  { sym: 'QQQ',   name: 'Invesco QQQ Trust',      seed: 448,  sector: 'ETF',        type: 'ETF' },
  { sym: 'IWM',   name: 'iShares Russell 2000',   seed: 200,  sector: 'ETF',        type: 'ETF' },
  { sym: 'VIX',   name: 'CBOE Volatility Index',  seed: 15,   sector: 'ETF',        type: 'ETF' },
  // Energy
  { sym: 'XOM',   name: 'Exxon Mobil Corp.',      seed: 110,  sector: 'Energy',     type: 'Stock' },
  { sym: 'CVX',   name: 'Chevron Corp.',          seed: 158,  sector: 'Energy',     type: 'Stock' },
  // Healthcare
  { sym: 'JNJ',   name: 'Johnson & Johnson',      seed: 152,  sector: 'Healthcare', type: 'Stock' },
  { sym: 'PFE',   name: 'Pfizer Inc.',            seed: 28,   sector: 'Healthcare', type: 'Stock' },
  // Consumer
  { sym: 'WMT',   name: 'Walmart Inc.',           seed: 168,  sector: 'Consumer',   type: 'Stock' },
  { sym: 'COST',  name: 'Costco Wholesale',       seed: 725,  sector: 'Consumer',   type: 'Stock' },
];

export const STRATEGIES: Record<string, { risk: 'Low' | 'Med' | 'High'; view: string; legs: number }> = {
  'Covered Call':     { risk: 'Low',  view: 'Neutral to mildly bullish',                    legs: 1 },
  'Protective Put':   { risk: 'Low',  view: 'Bullish with downside protection',             legs: 1 },
  'Bull Call Spread': { risk: 'Med',  view: 'Moderately bullish',                           legs: 2 },
  'Bear Put Spread':  { risk: 'Med',  view: 'Moderately bearish',                           legs: 2 },
  'Bull Put Spread':  { risk: 'Med',  view: 'Bullish / neutral',                            legs: 2 },
  'Bear Call Spread': { risk: 'Med',  view: 'Bearish / neutral',                            legs: 2 },
  'Long Straddle':    { risk: 'Med',  view: 'Big move expected, direction unknown',          legs: 2 },
  'Short Straddle':   { risk: 'High', view: 'Low volatility, range-bound',                  legs: 2 },
  'Long Strangle':    { risk: 'Med',  view: 'Big move expected, cheaper than straddle',     legs: 2 },
  'Short Strangle':   { risk: 'High', view: 'Range-bound, sell premium',                    legs: 2 },
  'Iron Condor':      { risk: 'Med',  view: 'Neutral, range-bound',                         legs: 4 },
  'Iron Butterfly':   { risk: 'Med',  view: 'Neutral, low vol',                             legs: 4 },
  'Collar':           { risk: 'Low',  view: 'Hold stock, limit risk',                       legs: 2 },
  'Butterfly Spread': { risk: 'Low',  view: 'Pinpoint neutral',                             legs: 4 },
  'Calendar Spread':  { risk: 'Med',  view: 'Neutral short-term, directional longer',       legs: 2 },
  'Diagonal Spread':  { risk: 'Med',  view: 'Directional with time decay benefit',          legs: 2 },
  'The Wheel':        { risk: 'Med',  view: 'Income generation on stock you want to own',   legs: 1 },
  'Cash-Secured Put': { risk: 'Med',  view: 'Bullish, earn premium while waiting to buy',   legs: 1 },
  'Put Ratio Spread': { risk: 'High', view: 'Bearish with defined upside risk',             legs: 3 },
  'Risk Reversal':    { risk: 'High', view: 'Strongly bullish, leveraged',                  legs: 2 },
};

export const STRATEGY_EXPLANATIONS: Record<string, { simple: string; when: string; pros: string; cons: string }> = {
  'Covered Call': {
    simple: 'Own the stock, sell a call above current price to earn premium income.',
    when: 'You own shares and expect the stock to stay flat or rise slightly.',
    pros: 'Generates income, reduces cost basis.',
    cons: 'Caps your upside if stock surges.',
  },
  'Protective Put': {
    simple: 'Buy a put below current price to insure against a large drop.',
    when: 'You own shares but fear a short-term pullback.',
    pros: 'Limits downside to the strike minus premium paid.',
    cons: 'Premium cost reduces overall returns.',
  },
  'Bull Call Spread': {
    simple: 'Buy a lower-strike call, sell a higher-strike call. Profit between the two strikes.',
    when: 'You expect a moderate rise in price.',
    pros: 'Lower cost than buying a call outright; defined risk.',
    cons: 'Capped profit; loses if stock stays flat or falls.',
  },
  'Bear Put Spread': {
    simple: 'Buy a higher-strike put, sell a lower-strike put. Profit on a moderate decline.',
    when: 'You expect the stock to fall moderately.',
    pros: 'Defined risk and reward; cheaper than buying a put outright.',
    cons: 'Profit is capped at the spread width.',
  },
  'Bull Put Spread': {
    simple: 'Sell a put and buy a lower-strike put. Collect premium if stock stays above short strike.',
    when: 'Neutral to bullish; you want to sell premium with limited risk.',
    pros: 'Defined risk; credit received upfront.',
    cons: 'Limited profit; full loss if stock collapses.',
  },
  'Bear Call Spread': {
    simple: 'Sell a lower-strike call, buy a higher-strike call. Collect premium in range-bound or falling market.',
    when: 'You expect the stock to stay flat or fall.',
    pros: 'Defined risk; credit received upfront.',
    cons: 'Limited profit; full loss if stock surges past long strike.',
  },
  'Long Straddle': {
    simple: 'Buy a call and put at the same strike. Profit from a big move in either direction.',
    when: 'Earnings, FDA approval, or other binary events are expected.',
    pros: 'Unlimited profit potential in either direction.',
    cons: 'Expensive; needs a very large move to be profitable.',
  },
  'Short Straddle': {
    simple: 'Sell a call and put at the same strike. Profit if the stock barely moves.',
    when: 'You expect low volatility and a quiet market.',
    pros: 'Maximum premium collected; profits from time decay.',
    cons: 'Unlimited risk if stock makes a big move.',
  },
  'Long Strangle': {
    simple: 'Buy an OTM call and OTM put. Cheaper than straddle, needs even bigger move.',
    when: 'Expecting a large move but want to pay less premium than a straddle.',
    pros: 'Lower cost than straddle; profits from big moves.',
    cons: 'Needs a larger move than straddle to break even.',
  },
  'Short Strangle': {
    simple: 'Sell an OTM call and OTM put. Profit in a range-bound market.',
    when: 'You expect low volatility and the stock to stay in a range.',
    pros: 'Wider profit zone than short straddle.',
    cons: 'Unlimited risk beyond the short strikes.',
  },
  'Iron Condor': {
    simple: 'Sell OTM call + put spreads. Profit if stock stays in a range.',
    when: 'Range-bound market; great for earning theta in flat periods.',
    pros: 'Defined risk; profits from time decay and low vol.',
    cons: 'Limited profit; loses if stock breaks out of the range.',
  },
  'Iron Butterfly': {
    simple: 'Sell ATM call + put, buy OTM call + put. Profit near current price.',
    when: 'Stock is range-bound and you expect minimal movement.',
    pros: 'Higher premium than iron condor; profits from low vol.',
    cons: 'Narrower profit zone; needs stock to stay near center strike.',
  },
  'Collar': {
    simple: 'Own stock + buy put + sell call. Limits both upside and downside.',
    when: 'You want to protect gains on a stock position at low or no cost.',
    pros: 'Downside protection; often zero-cost if structured correctly.',
    cons: 'Caps upside; may miss large rallies.',
  },
  'Butterfly Spread': {
    simple: 'Buy low strike + buy high strike calls, sell 2 ATM calls. Max profit at middle strike.',
    when: 'You expect the stock to pin near a specific price at expiry.',
    pros: 'Defined risk; good reward/risk ratio near center strike.',
    cons: 'Very narrow profit zone; needs precise price prediction.',
  },
  'Calendar Spread': {
    simple: 'Sell near-term option, buy longer-dated option at the same strike.',
    when: 'Stock is neutral short-term but may move later; also good for IV crush after events.',
    pros: 'Benefits from time decay difference; relatively cheap.',
    cons: 'Complex to manage; sensitive to IV changes.',
  },
  'Diagonal Spread': {
    simple: 'Sell near-term OTM option, buy longer-dated ATM option at different strikes.',
    when: 'Directional bias with a time decay advantage.',
    pros: 'More directional than calendar; benefits from time decay.',
    cons: 'Complex; requires adjustment as near-term option expires.',
  },
  'The Wheel': {
    simple: 'Sell CSP → get assigned → sell covered call → repeat for income.',
    when: 'You want to own a stock at a lower price and generate income while waiting.',
    pros: 'Consistent income; can acquire stock at discount.',
    cons: 'Ties up capital; full downside risk on stock ownership.',
  },
  'Cash-Secured Put': {
    simple: 'Sell a put while holding enough cash to buy the shares if assigned.',
    when: 'Bullish on a stock; want to buy at a lower price or earn premium.',
    pros: 'Earn premium while waiting; effective lower entry price.',
    cons: 'Miss large rallies; full downside if stock crashes.',
  },
  'Put Ratio Spread': {
    simple: 'Buy 1 ATM put, sell 2 lower-strike puts. Bearish with a twist below lower strike.',
    when: 'Moderately bearish; want to profit from moderate decline.',
    pros: 'Can be entered for a credit; profits in moderate bear move.',
    cons: 'Large losses if stock crashes far below lower strike.',
  },
  'Risk Reversal': {
    simple: 'Sell OTM put, buy OTM call. Bullish position, often for zero or low cost.',
    when: 'Strongly bullish; want leveraged exposure with minimal premium.',
    pros: 'Low cost or credit; leveraged upside.',
    cons: 'Full downside risk below the short put strike.',
  },
};

// Sector colour mapping
export const SECTOR_COLORS: Record<string, string> = {
  Tech: '#60a5fa',
  Finance: '#34d399',
  ETF: '#c9a84c',
  Energy: '#fb923c',
  Healthcare: '#a78bfa',
  Consumer: '#f472b6',
};
