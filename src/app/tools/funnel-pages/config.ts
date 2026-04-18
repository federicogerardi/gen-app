import type { FunnelStepState } from './types';

export const TONES = ['professional', 'casual', 'formal', 'technical'] as const;

export const TONE_HINTS: Record<(typeof TONES)[number], string> = {
  professional: 'Chiaro e autorevole.',
  casual: 'Diretto e vicino.',
  formal: 'Istituzionale e rigoroso.',
  technical: 'Preciso e tecnico.',
};

export const STEP_STATUS_BADGE_CLASS: Record<FunnelStepState['status'], string> = {
  idle: 'border-slate-400 bg-slate-200 text-slate-950',
  running: 'border-amber-400 bg-amber-200 text-amber-950',
  done: 'border-emerald-400 bg-emerald-200 text-emerald-950',
  error: 'border-rose-400 bg-rose-200 text-rose-950',
};

export const STEP_STATUS_LABEL: Record<FunnelStepState['status'], string> = {
  idle: 'In attesa',
  running: 'In corso',
  done: 'Completato',
  error: 'Errore',
};

export const initialSteps: FunnelStepState[] = [
  { key: 'optin', title: 'Step 1 - Optin Page', status: 'idle', content: '', artifactId: null, error: null },
  { key: 'quiz', title: 'Step 2 - Domande Quiz', status: 'idle', content: '', artifactId: null, error: null },
  { key: 'vsl', title: 'Step 3 - Script VSL', status: 'idle', content: '', artifactId: null, error: null },
];
