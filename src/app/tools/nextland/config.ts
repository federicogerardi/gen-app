import type { NextLandStepState } from './types';

export const TONES = ['professional', 'casual', 'formal', 'technical'] as const;

export const TONE_HINTS: Record<(typeof TONES)[number], string> = {
  professional: 'Chiaro e autorevole.',
  casual: 'Diretto e vicino.',
  formal: 'Istituzionale e rigoroso.',
  technical: 'Preciso e tecnico.',
};

export const STEP_STATUS_BADGE_CLASS: Record<NextLandStepState['status'], string> = {
  idle: 'border-slate-400 bg-slate-200 text-slate-950',
  running: 'border-amber-400 bg-amber-200 text-amber-950',
  done: 'border-emerald-400 bg-emerald-200 text-emerald-950',
  error: 'border-rose-400 bg-rose-200 text-rose-950',
};

export const STEP_STATUS_LABEL: Record<NextLandStepState['status'], string> = {
  idle: 'In attesa',
  running: 'In corso',
  done: 'Completato',
  error: 'Errore',
};

export const initialSteps: NextLandStepState[] = [
  { key: 'landing', title: 'Step 1 - Landing Page', status: 'idle', content: '', artifactId: null, error: null },
  { key: 'thank_you', title: 'Step 2 - Thank-you Page', status: 'idle', content: '', artifactId: null, error: null },
];