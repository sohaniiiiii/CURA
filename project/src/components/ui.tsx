// ============================================================
// CURA-X shared UI primitives (light first, dark via `dark:`).
// Keeps every page visually consistent with the chat page.
// ============================================================
import React from 'react';
import { Link } from 'react-router-dom';
import { Activity, AlertCircle, CheckCircle2, LucideIcon } from 'lucide-react';

// ---------- Layout ----------
export const Container: React.FC<{ children: React.ReactNode; className?: string }> = ({ children, className = '' }) => (
  <div className={`max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 ${className}`}>{children}</div>
);

export const Section: React.FC<{ children: React.ReactNode; className?: string; muted?: boolean }> = ({ children, className = '', muted }) => (
  <section className={`py-16 sm:py-20 ${muted ? 'bg-white dark:bg-slate-900/50 border-y border-slate-200 dark:border-slate-800' : ''} ${className}`}>
    <Container>{children}</Container>
  </section>
);

export const Eyebrow: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <p className="text-xs font-semibold uppercase tracking-wider text-violet-600 dark:text-violet-400">{children}</p>
);

export const PageHeader: React.FC<{ eyebrow?: string; title: React.ReactNode; description?: React.ReactNode }> = ({ eyebrow, title, description }) => (
  <header className="pt-14 sm:pt-20 pb-4 text-center">
    <Container>
      {eyebrow && <Eyebrow>{eyebrow}</Eyebrow>}
      <h1 className="mt-3 text-3xl sm:text-4xl lg:text-[44px] font-semibold tracking-tight leading-tight text-slate-900 dark:text-white">{title}</h1>
      {description && <p className="mt-4 text-base sm:text-lg text-slate-600 dark:text-slate-400 max-w-2xl mx-auto leading-relaxed">{description}</p>}
    </Container>
  </header>
);

export const SectionHeading: React.FC<{ eyebrow?: string; title: string; description?: string; align?: 'center' | 'left' }> = ({
  eyebrow, title, description, align = 'center',
}) => (
  <div className={`mb-10 ${align === 'center' ? 'text-center max-w-2xl mx-auto' : ''}`}>
    {eyebrow && <Eyebrow>{eyebrow}</Eyebrow>}
    <h2 className="mt-2 text-2xl sm:text-3xl font-semibold tracking-tight text-slate-900 dark:text-white">{title}</h2>
    {description && <p className="mt-3 text-[15px] text-slate-600 dark:text-slate-400 leading-relaxed">{description}</p>}
  </div>
);

// ---------- Surfaces ----------
export const Card: React.FC<{ children: React.ReactNode; className?: string; hover?: boolean }> = ({ children, className = '', hover }) => (
  <div
    className={`rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900 ${
      hover ? 'transition hover:border-violet-300 hover:shadow-md dark:hover:border-violet-500/40' : ''
    } ${className}`}
  >
    {children}
  </div>
);

export const IconTile: React.FC<{ icon: LucideIcon; size?: 'sm' | 'md' }> = ({ icon: Icon, size = 'md' }) => (
  <span
    className={`inline-flex items-center justify-center rounded-xl bg-violet-50 text-violet-600 ring-1 ring-inset ring-violet-100 dark:bg-violet-500/10 dark:text-violet-400 dark:ring-violet-500/20 ${
      size === 'sm' ? 'w-9 h-9' : 'w-11 h-11'
    }`}
  >
    <Icon className={size === 'sm' ? 'w-4 h-4' : 'w-5 h-5'} aria-hidden />
  </span>
);

// ---------- Buttons ----------
type Variant = 'primary' | 'secondary' | 'ghost';
const btnBase =
  'inline-flex items-center justify-center gap-2 rounded-lg font-medium text-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed';
const btnSize = 'h-10 px-4';
const btnVariants: Record<Variant, string> = {
  primary: 'bg-violet-600 text-white hover:bg-violet-700 shadow-sm',
  secondary:
    'border border-slate-300 bg-white text-slate-800 hover:bg-slate-50 hover:border-slate-400 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:hover:bg-slate-800',
  ghost: 'text-slate-700 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800',
};
export const btn = (variant: Variant = 'primary', extra = '') => `${btnBase} ${btnSize} ${btnVariants[variant]} ${extra}`;

export const ButtonLink: React.FC<{ to: string; variant?: Variant; children: React.ReactNode; className?: string }> = ({
  to, variant = 'primary', children, className = '',
}) => (
  <Link to={to} className={btn(variant, className)}>
    {children}
  </Link>
);

// ---------- Forms ----------
export const inputClass = (hasError?: boolean, withIcon = true) =>
  `block w-full h-11 ${withIcon ? 'pl-10' : 'pl-3.5'} pr-3.5 rounded-lg border bg-white text-[15px] text-slate-900 placeholder-slate-400
   dark:bg-slate-950 dark:text-slate-100 dark:placeholder-slate-500 transition-colors
   focus:outline-none focus:ring-2 focus:ring-violet-500/30 focus:border-violet-500
   ${hasError ? 'border-red-400 dark:border-red-500/60' : 'border-slate-300 dark:border-slate-700 hover:border-slate-400 dark:hover:border-slate-600'}`;

export const Field: React.FC<{
  id: string;
  label: string;
  error?: string;
  hint?: string;
  icon?: LucideIcon;
  trailing?: React.ReactNode;
  children: (cls: string) => React.ReactNode;
}> = ({ id, label, error, hint, icon: Icon, trailing, children }) => (
  <div>
    <label htmlFor={id} className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">{label}</label>
    <div className="relative">
      {Icon && (
        <span className="pointer-events-none absolute inset-y-0 left-0 pl-3.5 flex items-center">
          <Icon className="h-4 w-4 text-slate-400" aria-hidden />
        </span>
      )}
      {children(inputClass(!!error, !!Icon))}
      {trailing && <span className="absolute inset-y-0 right-0 pr-2 flex items-center">{trailing}</span>}
    </div>
    {error ? (
      <p id={`${id}-error`} className="mt-1.5 text-xs text-red-600 dark:text-red-400">{error}</p>
    ) : hint ? (
      <p className="mt-1.5 text-xs text-slate-500 dark:text-slate-400">{hint}</p>
    ) : null}
  </div>
);

export const Alert: React.FC<{ tone: 'success' | 'error'; children: React.ReactNode }> = ({ tone, children }) => (
  <div
    role={tone === 'error' ? 'alert' : 'status'}
    className={`flex items-start gap-2.5 rounded-lg border px-3.5 py-3 text-sm ${
      tone === 'success'
        ? 'border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-200'
        : 'border-red-200 bg-red-50 text-red-800 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-200'
    }`}
  >
    {tone === 'success' ? <CheckCircle2 className="w-4 h-4 mt-0.5 flex-shrink-0" /> : <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />}
    <span>{children}</span>
  </div>
);

// ---------- Brand ----------
export const Logo: React.FC<{ to?: string }> = ({ to = '/' }) => (
  <Link to={to} className="inline-flex items-center gap-2.5 rounded-lg" aria-label="CURA-X home">
    <span className="bg-violet-600 p-1.5 rounded-lg">
      <Activity className="h-4 w-4 text-white" />
    </span>
    <span className="text-[17px] font-semibold tracking-tight text-slate-900 dark:text-white">CURA-X</span>
  </Link>
);

// ---------- Auth page shell (Login / Signup) ----------
export const AuthShell: React.FC<{ title: string; subtitle: string; children: React.ReactNode; footer: React.ReactNode }> = ({
  title, subtitle, children, footer,
}) => (
  <div className="min-h-[100dvh] flex flex-col bg-slate-50 dark:bg-slate-950">
    <div className="flex-1 flex items-center justify-center px-4 py-10 sm:py-16">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <Logo />
          <h1 className="mt-6 text-2xl font-semibold tracking-tight text-slate-900 dark:text-white">{title}</h1>
          <p className="mt-1.5 text-sm text-slate-600 dark:text-slate-400">{subtitle}</p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-6 sm:p-8 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          {children}
        </div>
        <p className="mt-6 text-center text-sm text-slate-600 dark:text-slate-400">{footer}</p>
      </div>
    </div>
    <p className="pb-6 text-center text-xs text-slate-400 dark:text-slate-500 px-4">
      CURA-X provides general health information and is not a substitute for professional medical advice.
    </p>
  </div>
);

export const GoogleIcon = () => (
  <svg className="w-4 h-4" viewBox="0 0 24 24" aria-hidden>
    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
  </svg>
);

export const Divider: React.FC<{ label: string }> = ({ label }) => (
  <div className="relative my-6">
    <div className="absolute inset-0 flex items-center" aria-hidden>
      <div className="w-full border-t border-slate-200 dark:border-slate-800" />
    </div>
    <div className="relative flex justify-center">
      <span className="px-3 bg-white dark:bg-slate-900 text-xs text-slate-500 dark:text-slate-400">{label}</span>
    </div>
  </div>
);

// ---------- Closing CTA band ----------
export const CtaBand: React.FC<{ title: string; description: string; children: React.ReactNode }> = ({ title, description, children }) => (
  <div className="rounded-2xl border border-violet-200 bg-violet-50 px-6 py-10 sm:px-12 sm:py-12 text-center dark:border-violet-500/20 dark:bg-violet-500/[0.07]">
    <h2 className="text-2xl sm:text-3xl font-semibold tracking-tight text-slate-900 dark:text-white">{title}</h2>
    <p className="mt-3 text-[15px] text-slate-600 dark:text-slate-400 max-w-xl mx-auto">{description}</p>
    <div className="mt-7 flex flex-col sm:flex-row gap-3 justify-center">{children}</div>
  </div>
);
