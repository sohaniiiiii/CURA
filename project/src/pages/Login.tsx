// Login — UI v2. Previous version: project/legacy/pages/Login.tsx
// Logic unchanged (validation, useAuth().login, redirect, mock Google button).
import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Mail, Lock, Eye, EyeOff, Loader2 } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { AuthShell, Field, Alert, Divider, GoogleIcon, btn } from '../components/ui';

const Login = () => {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState<{ [key: string]: string }>({});
  const [success, setSuccess] = useState('');
  const [formData, setFormData] = useState({ email: '', password: '', rememberMe: false });

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type, checked } = e.target;
    setFormData({ ...formData, [name]: type === 'checkbox' ? checked : value });
    if (errors[name]) setErrors({ ...errors, [name]: '' });
  };

  const validateForm = () => {
    const newErrors: { [key: string]: string } = {};
    if (!formData.email) newErrors.email = 'Email is required';
    else if (!/\S+@\S+\.\S+/.test(formData.email)) newErrors.email = 'Please enter a valid email address';
    if (!formData.password) newErrors.password = 'Password is required';
    else if (formData.password.length < 6) newErrors.password = 'Password must be at least 6 characters';
    return newErrors;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const newErrors = validateForm();
    if (Object.keys(newErrors).length > 0) { setErrors(newErrors); return; }

    setIsLoading(true);
    setErrors({});
    try {
      await login(formData.email, formData.password);
      setSuccess('Login successful! Redirecting...');
      setTimeout(() => navigate('/'), 1000);
    } catch (error: any) {
      console.error('Login error:', error);
      setErrors({ general: error.message || 'Login failed. Please check your credentials and try again.' });
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    // Unchanged placeholder: real Google OAuth is not integrated yet.
    setSuccess('Google login successful! Redirecting...');
    setTimeout(() => navigate('/'), 1000);
  };

  return (
    <AuthShell
      title="Welcome back"
      subtitle="Sign in to continue to CURA-X"
      footer={<>Don't have an account? <Link to="/signup" className="font-medium text-violet-700 hover:text-violet-900 dark:text-violet-400 dark:hover:text-violet-300">Sign up</Link></>}
    >
      <div className="space-y-3 empty:hidden">
        {success && <Alert tone="success">{success}</Alert>}
        {errors.general && <Alert tone="error">{errors.general}</Alert>}
      </div>

      <form className={`space-y-5 ${success || errors.general ? 'mt-5' : ''}`} onSubmit={handleSubmit} noValidate>
        <Field id="email" label="Email address" icon={Mail} error={errors.email}>
          {(cls) => (
            <input id="email" name="email" type="email" autoComplete="email" required value={formData.email} onChange={handleInputChange}
              aria-invalid={!!errors.email} aria-describedby={errors.email ? 'email-error' : undefined} className={cls} placeholder="you@example.com" />
          )}
        </Field>

        <Field
          id="password"
          label="Password"
          icon={Lock}
          error={errors.password}
          trailing={
            <button type="button" onClick={() => setShowPassword(!showPassword)} aria-label={showPassword ? 'Hide password' : 'Show password'}
              className="p-1.5 rounded-md text-slate-400 hover:text-slate-700 dark:hover:text-slate-200">
              {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          }
        >
          {(cls) => (
            <input id="password" name="password" type={showPassword ? 'text' : 'password'} autoComplete="current-password" required value={formData.password}
              onChange={handleInputChange} aria-invalid={!!errors.password} aria-describedby={errors.password ? 'password-error' : undefined}
              className={`${cls} pr-10`} placeholder="Enter your password" />
          )}
        </Field>

        <div className="flex items-center justify-between">
          <label htmlFor="remember-me" className="flex items-center gap-2 text-sm text-slate-700 dark:text-slate-300 cursor-pointer">
            <input id="remember-me" name="rememberMe" type="checkbox" checked={formData.rememberMe} onChange={handleInputChange}
              className="h-4 w-4 rounded accent-violet-600" />
            Remember me
          </label>
          {/* OLD: <a href="#">Forgot password?</a> (dead link) */}
          <Link to="/forgot-password" className="text-sm font-medium text-violet-700 hover:text-violet-900 dark:text-violet-400 dark:hover:text-violet-300">Forgot password?</Link>
        </div>

        <button type="submit" disabled={isLoading} className={btn('primary', 'w-full h-11')}>
          {isLoading ? <><Loader2 className="w-4 h-4 animate-spin" /> Signing in…</> : 'Sign in'}
        </button>
      </form>

      <Divider label="Or continue with" />
      <button type="button" onClick={handleGoogleLogin} className={btn('secondary', 'w-full h-11')}>
        <GoogleIcon /> Sign in with Google
      </button>
    </AuthShell>
  );
};

export default Login;
