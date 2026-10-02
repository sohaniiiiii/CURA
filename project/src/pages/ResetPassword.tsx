// Forgot password — step 2: choose a new password from the reset link.
import React, { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { Lock, Eye, EyeOff, Loader2, Check } from 'lucide-react';
import { userAPI } from '../services/api';
import { AuthShell, Field, Alert, btn } from '../components/ui';

const linkCls = 'font-medium text-violet-700 hover:text-violet-900 dark:text-violet-400 dark:hover:text-violet-300';

const ResetPassword = () => {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const email = params.get('email') || '';
  const token = params.get('token') || '';

  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [show, setShow] = useState(false);
  const [errors, setErrors] = useState<{ [k: string]: string }>({});
  const [isLoading, setIsLoading] = useState(false);
  const [done, setDone] = useState(false);

  const linkValid = !!email && !!token;
  const matches = confirm.length > 0 && password === confirm;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const errs: { [k: string]: string } = {};
    if (password.length < 6) errs.password = 'Password must be at least 6 characters';
    if (!confirm) errs.confirm = 'Please confirm your password';
    else if (password !== confirm) errs.confirm = 'Passwords do not match';
    if (Object.keys(errs).length) { setErrors(errs); return; }

    setIsLoading(true);
    setErrors({});
    try {
      await userAPI.resetPassword({ email, token, password });
      setDone(true);
      setTimeout(() => navigate('/login'), 2000);
    } catch (err: any) {
      setErrors({ general: err.message || 'Could not reset your password. Please try again.' });
    } finally {
      setIsLoading(false);
    }
  };

  const eye = (
    <button type="button" onClick={() => setShow(s => !s)} aria-label={show ? 'Hide passwords' : 'Show passwords'}
      className="p-1.5 rounded-md text-slate-400 hover:text-slate-700 dark:hover:text-slate-200">
      {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
    </button>
  );

  return (
    <AuthShell
      title={done ? 'Password updated' : 'Choose a new password'}
      subtitle={email ? `For ${email}` : 'Reset your CURA-X password'}
      footer={<>Remembered it? <Link to="/login" className={linkCls}>Sign in</Link></>}
    >
      {!linkValid ? (
        <div className="space-y-4">
          <Alert tone="error">This reset link is incomplete. Please request a new one.</Alert>
          <Link to="/forgot-password" className={btn('primary', 'w-full h-11')}>Request a new link</Link>
        </div>
      ) : done ? (
        <div className="space-y-4">
          <Alert tone="success">Your password has been reset. Redirecting you to sign in…</Alert>
          <Link to="/login" className={btn('primary', 'w-full h-11')}>Sign in now</Link>
        </div>
      ) : (
        <form onSubmit={handleSubmit} noValidate className="space-y-5">
          {errors.general && (
            <div className="space-y-2">
              <Alert tone="error">{errors.general}</Alert>
              {/invalid|expired/i.test(errors.general) && (
                <Link to="/forgot-password" className={`${linkCls} text-sm`}>Request a new reset link</Link>
              )}
            </div>
          )}
          <Field id="password" label="New password" icon={Lock} error={errors.password} hint="At least 6 characters" trailing={eye}>
            {(cls) => (
              <input id="password" type={show ? 'text' : 'password'} autoComplete="new-password" autoFocus value={password}
                onChange={(e) => { setPassword(e.target.value); setErrors({}); }}
                aria-invalid={!!errors.password} aria-describedby={errors.password ? 'password-error' : undefined}
                className={`${cls} pr-10`} placeholder="New password" />
            )}
          </Field>
          <div>
            <Field id="confirm" label="Confirm new password" icon={Lock} error={errors.confirm}>
              {(cls) => (
                <input id="confirm" type={show ? 'text' : 'password'} autoComplete="new-password" value={confirm}
                  onChange={(e) => { setConfirm(e.target.value); setErrors({}); }}
                  aria-invalid={!!errors.confirm} aria-describedby={errors.confirm ? 'confirm-error' : undefined}
                  className={cls} placeholder="Repeat new password" />
              )}
            </Field>
            {matches && !errors.confirm && (
              <p className="mt-1.5 flex items-center gap-1 text-xs text-emerald-600 dark:text-emerald-400"><Check className="w-3.5 h-3.5" /> Passwords match</p>
            )}
          </div>
          <button type="submit" disabled={isLoading} className={btn('primary', 'w-full h-11')}>
            {isLoading ? <><Loader2 className="w-4 h-4 animate-spin" /> Updating…</> : 'Reset password'}
          </button>
        </form>
      )}
    </AuthShell>
  );
};

export default ResetPassword;
