import { useState } from 'react';
import { ArrowRight, KeyRound, LogIn, ShieldOff } from 'lucide-react';

interface FlowStep {
  id: string;
  label: string;
  actor: 'Client' | 'Gateway';
  action: string;
  detail: string;
  tokenState: {
    accessToken: string | null;
    refreshToken: string | null;
    familyRevoked: boolean;
  };
}

const FLOW_STEPS: FlowStep[] = [
  {
    id: 'login',
    label: 'Login',
    actor: 'Client',
    action: 'POST /auth/login',
    detail:
      'Credentials are validated. The gateway returns a short-lived access token and a refresh token bound to a token family.',
    tokenState: {
      accessToken: 'jwt_access_v1 [15 min]',
      refreshToken: 'refresh_v1 / family_A',
      familyRevoked: false,
    },
  },
  {
    id: 'rotate',
    label: 'Rotate',
    actor: 'Client',
    action: 'POST /auth/refresh',
    detail:
      'The refresh token is one-use. On refresh, the gateway issues a new pair and immediately marks the old refresh token as spent.',
    tokenState: {
      accessToken: 'jwt_access_v2 [15 min]',
      refreshToken: 'refresh_v2 / family_A',
      familyRevoked: false,
    },
  },
  {
    id: 'reuse',
    label: 'Reuse detected',
    actor: 'Gateway',
    action: 'POST /auth/refresh (spent)',
    detail:
      'A replayed refresh token is treated as reuse. The gateway revokes the entire token family and emits an audit event.',
    tokenState: {
      accessToken: null,
      refreshToken: null,
      familyRevoked: true,
    },
  },
  {
    id: 'logout',
    label: 'Forced login',
    actor: 'Gateway',
    action: '401 Unauthorized',
    detail:
      'The user must authenticate again because the refresh-token family is no longer valid for any session.',
    tokenState: {
      accessToken: null,
      refreshToken: null,
      familyRevoked: true,
    },
  },
];

export function AuthFlowVisualizer() {
  const [activeStep, setActiveStep] = useState(0);
  const step = FLOW_STEPS[activeStep];

  return (
    <div className="auth-flow-viz">
      <div className="auth-flow-viz__steps" aria-label="Authentication flow steps">
        {FLOW_STEPS.map((item, index) => (
          <button
            key={item.id}
            type="button"
            className={`flow-step-btn${index === activeStep ? ' flow-step-btn--active' : ''}${
              index < activeStep ? ' flow-step-btn--done' : ''
            }`}
            onClick={() => setActiveStep(index)}
          >
            <span className="flow-step-btn__dot" aria-hidden />
            <span className="flow-step-btn__label">{item.label}</span>
          </button>
        ))}
      </div>

      <div className={`auth-flow-viz__panel${step.id === 'reuse' ? ' auth-flow-viz__panel--danger' : ''}`}>
        <div className="auth-flow-viz__actors">
          <div className={`actor${step.actor === 'Client' ? ' actor--active' : ''}`}>
            <LogIn size={20} aria-hidden />
            <span>Client</span>
          </div>

          <div className="actor-arrow">
            <code className="actor-arrow__action">{step.action}</code>
            <ArrowRight size={17} className={step.id === 'reuse' ? 'text-rose' : undefined} aria-hidden />
          </div>

          <div className={`actor${step.actor === 'Gateway' ? ' actor--active' : ''}`}>
            {step.tokenState.familyRevoked ? (
              <ShieldOff size={20} className="text-rose" aria-hidden />
            ) : (
              <KeyRound size={20} aria-hidden />
            )}
            <span>Gateway</span>
          </div>
        </div>

        <div className="auth-flow-viz__tokens">
          <div className={`token-display${step.tokenState.familyRevoked ? ' token-display--revoked' : ''}`}>
            <div className="token-display__row">
              <span className="token-display__label">Access token</span>
              <code
                className={`token-display__value${
                  step.tokenState.accessToken ? '' : ' token-display__value--null'
                }`}
              >
                {step.tokenState.accessToken ?? 'revoked'}
              </code>
            </div>
            <div className="token-display__row">
              <span className="token-display__label">Refresh token</span>
              <code
                className={`token-display__value${
                  step.tokenState.refreshToken ? '' : ' token-display__value--null'
                }`}
              >
                {step.tokenState.refreshToken ?? 'family revoked'}
              </code>
            </div>
            {step.tokenState.familyRevoked ? (
              <div className="token-display__alert">Entire token family revoked. Audit event emitted.</div>
            ) : null}
          </div>
        </div>

        <p className="auth-flow-viz__detail">{step.detail}</p>
      </div>

      <div className="auth-flow-viz__nav">
        <button
          type="button"
          className="btn btn--ghost btn--sm"
          onClick={() => setActiveStep((value) => Math.max(0, value - 1))}
          disabled={activeStep === 0}
        >
          Previous
        </button>
        <span className="auth-flow-viz__counter">
          {activeStep + 1} / {FLOW_STEPS.length}
        </span>
        <button
          type="button"
          className="btn btn--primary btn--sm"
          onClick={() => setActiveStep((value) => Math.min(FLOW_STEPS.length - 1, value + 1))}
          disabled={activeStep === FLOW_STEPS.length - 1}
        >
          Next
        </button>
      </div>
    </div>
  );
}
