import React, { useState } from 'react';
import { useAppState, UserProfile } from '@/contexts/AppState';

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

interface Question {
  key: keyof Pick<UserProfile, 'experience' | 'objective' | 'lossTolerance' | 'understanding'>;
  label: string;
  subtitle: string;
  options: string[];
}

const QUESTIONS: Question[] = [
  {
    key: 'experience',
    label: 'Options Trading Experience',
    subtitle: 'How long have you been trading options?',
    options: ['Never', 'Less than 1 year', '1-3 years', '3+ years'],
  },
  {
    key: 'objective',
    label: 'Investment Objective',
    subtitle: 'What is your primary investment goal?',
    options: ['Capital preservation', 'Income generation', 'Growth', 'Speculation'],
  },
  {
    key: 'lossTolerance',
    label: 'Loss Tolerance',
    subtitle: 'What percentage of your investment are you willing to lose?',
    options: ['Up to 10%', 'Up to 25%', 'Up to 50%', 'More than 50%'],
  },
  {
    key: 'understanding',
    label: 'Risk Understanding',
    subtitle: 'Do you understand that options can expire completely worthless?',
    options: ['No', 'Somewhat', 'Yes', 'Yes, and I understand Greeks'],
  },
];

function calcTier(score: number): UserProfile['tier'] {
  if (score <= 4) return 'Restricted';
  if (score <= 8) return 'Standard';
  return 'Advanced';
}

export default function OnboardingScreen() {
  const { setUserProfile, goToDashboard } = useAppState();
  const [step, setStep] = useState(0); // 0-3 = questions, 4 = results
  const [answers, setAnswers] = useState<Partial<Record<keyof UserProfile, string>>>({});
  const [hoveredOpt, setHoveredOpt] = useState<string | null>(null);

  const q = QUESTIONS[step];
  const totalQ = QUESTIONS.length;

  function handleSelect(option: string) {
    const newAnswers = { ...answers, [q.key]: option };
    setAnswers(newAnswers);
    if (step < totalQ - 1) {
      setTimeout(() => setStep(s => s + 1), 300);
    } else {
      setTimeout(() => setStep(totalQ), 300);
    }
  }

  function calcScore(): number {
    return QUESTIONS.reduce((sum, q) => {
      const idx = q.options.indexOf(answers[q.key] as string);
      return sum + (idx >= 0 ? idx : 0);
    }, 0);
  }

  function handleEnter() {
    const score = calcScore();
    const profile: UserProfile = {
      experience: answers.experience as UserProfile['experience'],
      objective: answers.objective as UserProfile['objective'],
      lossTolerance: answers.lossTolerance as UserProfile['lossTolerance'],
      understanding: answers.understanding as UserProfile['understanding'],
      suitabilityScore: score,
      tier: calcTier(score),
      completedAt: new Date().toISOString(),
    };
    setUserProfile(profile);
    goToDashboard();
  }

  const score = step === totalQ ? calcScore() : 0;
  const tier = calcTier(score);
  const tierColor = tier === 'Advanced' ? C.green : tier === 'Standard' ? C.orange : C.red;

  return (
    <div style={{
      minHeight: '100vh',
      background: C.bg,
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '24px 16px',
    }}>
      {/* Logo */}
      <div style={{ marginBottom: 40, textAlign: 'center' }}>
        <div style={{ fontSize: 36, marginBottom: 8 }}>⬡</div>
        <div style={{ fontSize: 28, fontWeight: 800, background: goldGrad, WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', letterSpacing: '0.12em' }}>
          OPTIX
        </div>
        <div style={{ color: C.textMid, fontSize: 13, marginTop: 4 }}>Options Trading Platform</div>
      </div>

      {step < totalQ ? (
        <div style={{ width: '100%', maxWidth: 520 }}>
          {/* Progress Bar */}
          <div style={{ marginBottom: 32 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
              <span style={{ color: C.textMid, fontSize: 13 }}>Risk Assessment</span>
              <span style={{ color: C.gold, fontFamily: C.mono, fontSize: 13 }}>{step + 1} / {totalQ}</span>
            </div>
            <div style={{ height: 3, background: C.border, borderRadius: 2, overflow: 'hidden' }}>
              <div style={{
                height: '100%',
                width: `${((step + 1) / totalQ) * 100}%`,
                background: goldGrad,
                borderRadius: 2,
                transition: 'width 0.4s ease',
              }} />
            </div>
          </div>

          {/* Question Card */}
          <div style={{
            background: C.surface,
            border: `1px solid ${C.borderGold}`,
            borderRadius: 16,
            padding: '32px 28px',
          }}>
            <div style={{ color: C.gold, fontSize: 11, fontWeight: 600, letterSpacing: '0.1em', marginBottom: 8, textTransform: 'uppercase' }}>
              Question {step + 1}
            </div>
            <h2 style={{ color: C.text, fontSize: 22, fontWeight: 700, marginBottom: 6 }}>{q.label}</h2>
            <p style={{ color: C.textMid, fontSize: 14, marginBottom: 28 }}>{q.subtitle}</p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {q.options.map(opt => {
                const selected = answers[q.key] === opt;
                const hovered = hoveredOpt === opt;
                return (
                  <button
                    key={opt}
                    onClick={() => handleSelect(opt)}
                    onMouseEnter={() => setHoveredOpt(opt)}
                    onMouseLeave={() => setHoveredOpt(null)}
                    style={{
                      background: selected ? C.goldDim : hovered ? 'rgba(255,255,255,0.04)' : 'transparent',
                      border: `1px solid ${selected ? C.gold : hovered ? C.borderGold : C.border}`,
                      borderRadius: 10,
                      padding: '14px 18px',
                      color: selected ? C.gold : C.text,
                      fontSize: 15,
                      fontWeight: selected ? 600 : 400,
                      cursor: 'pointer',
                      textAlign: 'left',
                      transition: 'all 0.15s ease',
                    }}
                  >
                    {opt}
                  </button>
                );
              })}
            </div>

            {step > 0 && (
              <button
                onClick={() => setStep(s => s - 1)}
                style={{
                  marginTop: 20,
                  background: 'transparent',
                  border: 'none',
                  color: C.textMid,
                  fontSize: 13,
                  cursor: 'pointer',
                  padding: '6px 0',
                }}
              >
                ← Back
              </button>
            )}
          </div>
        </div>
      ) : (
        /* Results Screen */
        <div style={{ width: '100%', maxWidth: 520 }}>
          <div style={{
            background: C.surface,
            border: `1px solid ${C.borderGold}`,
            borderRadius: 16,
            padding: '36px 28px',
            textAlign: 'center',
          }}>
            <div style={{ fontSize: 48, marginBottom: 16 }}>
              {tier === 'Advanced' ? '🏆' : tier === 'Standard' ? '📊' : '⚠️'}
            </div>
            <div style={{
              display: 'inline-block',
              padding: '8px 24px',
              borderRadius: 24,
              background: `${tierColor}22`,
              border: `1px solid ${tierColor}`,
              color: tierColor,
              fontWeight: 700,
              fontSize: 18,
              letterSpacing: '0.06em',
              marginBottom: 20,
            }}>
              {tier}
            </div>

            <div style={{ fontFamily: C.mono, color: C.textMid, fontSize: 14, marginBottom: 24 }}>
              Score: <span style={{ color: C.gold, fontWeight: 600 }}>{score}</span> / 12
            </div>

            <div style={{
              background: C.surfaceUp,
              border: `1px solid ${C.border}`,
              borderRadius: 10,
              padding: '16px 20px',
              marginBottom: 24,
              textAlign: 'left',
            }}>
              {tier === 'Restricted' && (
                <>
                  <div style={{ color: C.red, fontWeight: 600, marginBottom: 8 }}>⚠ Restricted Access</div>
                  <p style={{ color: C.textMid, fontSize: 13, lineHeight: 1.6 }}>
                    Based on your profile, you have view-only access. Selling strategies and advanced options are disabled for your protection. You may retake the assessment after gaining more experience.
                  </p>
                </>
              )}
              {tier === 'Standard' && (
                <>
                  <div style={{ color: C.orange, fontWeight: 600, marginBottom: 8 }}>📊 Standard Access</div>
                  <p style={{ color: C.textMid, fontSize: 13, lineHeight: 1.6 }}>
                    You have access to most strategies including spreads, straddles, and covered calls. Naked short strategies are restricted.
                  </p>
                </>
              )}
              {tier === 'Advanced' && (
                <>
                  <div style={{ color: C.green, fontWeight: 600, marginBottom: 8 }}>✓ Full Access</div>
                  <p style={{ color: C.textMid, fontSize: 13, lineHeight: 1.6 }}>
                    You have access to all strategies including naked options, ratio spreads, and complex multi-leg strategies.
                  </p>
                </>
              )}
            </div>

            <div style={{ color: C.textDim, fontSize: 11, marginBottom: 24, lineHeight: 1.5 }}>
              <strong style={{ color: C.textMid }}>Risk Disclaimer:</strong> Options trading involves substantial risk of loss. Paper trading on OPTIX is for educational purposes only and does not constitute financial advice. Past simulated performance does not guarantee future results.
            </div>

            <button
              onClick={handleEnter}
              style={{
                width: '100%',
                padding: '14px 24px',
                background: goldGrad,
                border: 'none',
                borderRadius: 10,
                color: '#06080f',
                fontWeight: 700,
                fontSize: 16,
                cursor: 'pointer',
                letterSpacing: '0.04em',
              }}
            >
              Enter OPTIX →
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
