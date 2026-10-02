// Forgot password — step 1: request a reset link.
import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Mail, Loader2, ArrowLeft, Terminal } from 'lucide-react';
import { userAPI } from '../services/api';
import { AuthShell, Field, Alert, btn } from '../components/ui';

const linkCls = 'font-medium text-violet-700 hover:text-violet-900 dark:text-violet-400 dark:hover:text-violet-300';

const ForgotPassword = () => {
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) { setError('Email is required'); return; }
    if (!/\S+@\S+\.\S+/.test(email)) { setError('Please enter a valid email address'); return; }
    setIsLoading(true);
    setError('');
    try {
      await userAPI.forgotPassword(email.trim());
      setSent(true);
    } catch (err: any) {
      setError(err.message || 'Something went wrong. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AuthShell
      title={sent ? 'Check for your reset link' : 'Forgot your password?'}
      subtitle={sent ? 'Follow the link to choose a new password' : "Enter your email and we'll create a reset link"}
      footer={<Link to="/login" className={`${linkCls} inline-flex items-center gap-1`}><ArrowLeft className="w-3.5 h-3.5" /> Back to sign in</Link>}
    >
      {sent ? (
        <div className="space-y-4">
          <Alert tone="success">If an account exists for <strong>{email.trim()}</strong>, a password reset link has been created. It's valid for 30 minutes and can be used once.</Alert>
          {/* No email service yet — explain where the link is in local development */}
          <div className="flex gap-3 rounded-lg border border-slate-200 bg-slate-50 p-3.5 text-sm text-slate-600 dark:border-slate-800 dark:bg-slate-950/50 dark:text-slate-400">
            <Terminal className="w-4 h-4 mt-0.5 flex-shrink-0 text-slate-400" />
            <p>Email sending isn't set up yet. In development, the link is printed in the <strong className="text-slate-800 dark:text-slate-200">Node server terminal</strong> — open it in this browser.</p>
          </div>
          <button type="button" onClick={() => setSent(false)} className={btn('secondary', 'w-full h-11')}>Use a different email</button>
        </div>
      ) : (
        <form onSubmit={handleSubmit} noValidate className="space-y-5">
          {error && <Alert tone="error">{error}</Alert>}
          <Field id="email" label="Email address" icon={Mail}>
            {(cls) => (
              <input id="email" name="email" type="email" autoComplete="email" autoFocus value={email}
                onChange={(e) => { setEmail(e.target.value); setError(''); }} className={cls} placeholder="you@example.com" />
            )}
          </Field>
          <button type="submit" disabled={isLoading} className={btn('primary', 'w-full h-11')}>
            {isLoading ? <><Loader2 className="w-4 h-4 animate-spin" /> Creating link…</> : 'Send reset link'}
          </button>
        </form>
      )}
    </AuthShell>
  );
};

export default ForgotPassword;
