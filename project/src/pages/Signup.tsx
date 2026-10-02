// Signup — UI v2. Previous version: project/legacy/pages/Signup.tsx
// Logic unchanged (validation rules, useAuth().register, redirect, mock Google button).
import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Mail, Lock, Eye, EyeOff, User, AtSign, Loader2 } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { AuthShell, Field, Alert, Divider, GoogleIcon, btn } from '../components/ui';

const linkCls = 'font-medium text-violet-700 hover:text-violet-900 dark:text-violet-400 dark:hover:text-violet-300';

const Signup = () => {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState<{ [key: string]: string }>({});
  const [success, setSuccess] = useState('');
  const [formData, setFormData] = useState({
    firstName: '', lastName: '', username: '', email: '', password: '', confirmPassword: '', terms: false,
  });

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type, checked } = e.target;
    setFormData({ ...formData, [name]: type === 'checkbox' ? checked : value });
    if (errors[name]) setErrors({ ...errors, [name]: '' });
  };

  const validateForm = () => {
    const e: { [key: string]: string } = {};
    if (!formData.firstName.trim()) e.firstName = 'First name is required';
    else if (formData.firstName.trim().length < 2) e.firstName = 'First name must be at least 2 characters';
    if (!formData.lastName.trim()) e.lastName = 'Last name is required';
    else if (formData.lastName.trim().length < 2) e.lastName = 'Last name must be at least 2 characters';
    if (!formData.username.trim()) e.username = 'Username is required';
    else if (formData.username.trim().length < 3) e.username = 'Username must be at least 3 characters';
    if (!formData.email) e.email = 'Email is required';
    else if (!/\S+@\S+\.\S+/.test(formData.email)) e.email = 'Please enter a valid email address';
    if (!formData.password) e.password = 'Password is required';
    else if (formData.password.length < 6) e.password = 'Password must be at least 6 characters';
    if (!formData.confirmPassword) e.confirmPassword = 'Please confirm your password';
    else if (formData.password !== formData.confirmPassword) e.confirmPassword = 'Passwords do not match';
    if (!formData.terms) e.terms = 'You must agree to the terms and conditions';
    return e;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const newErrors = validateForm();
    if (Object.keys(newErrors).length > 0) { setErrors(newErrors); return; }

    setIsLoading(true);
    setErrors({});
    try {
      await register({
        username: formData.username,
        email: formData.email,
        password: formData.password,
        firstName: formData.firstName,
        lastName: formData.lastName,
      });
      setSuccess('Account created successfully! Redirecting...');
      setTimeout(() => navigate('/'), 1000);
    } catch (error: any) {
      console.error('Registration error:', error);
      setErrors({ general: error.message || 'Signup failed. Please try again.' });
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleSignup = async () => {
    // Unchanged placeholder: real Google OAuth is not integrated yet.
    setSuccess('Google signup successful! Redirecting...');
    setTimeout(() => navigate('/'), 1000);
  };

  const eye = (shown: boolean, toggle: () => void, label: string) => (
    <button type="button" onClick={toggle} aria-label={shown ? `Hide ${label}` : `Show ${label}`}
      className="p-1.5 rounded-md text-slate-400 hover:text-slate-700 dark:hover:text-slate-200">
      {shown ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
    </button>
  );

  const aria = (name: string) => ({ 'aria-invalid': !!errors[name], 'aria-describedby': errors[name] ? `${name}-error` : undefined });

  return (
    <AuthShell
      title="Create your account"
      subtitle="Join CURA-X for trustworthy health guidance"
      footer={<>Already have an account? <Link to="/login" className={linkCls}>Sign in</Link></>}
    >
      <div className="space-y-3 empty:hidden">
        {success && <Alert tone="success">{success}</Alert>}
        {errors.general && <Alert tone="error">{errors.general}</Alert>}
      </div>

      <form className={`space-y-5 ${success || errors.general ? 'mt-5' : ''}`} onSubmit={handleSubmit} noValidate>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          <Field id="firstName" label="First name" icon={User} error={errors.firstName}>
            {(cls) => <input id="firstName" name="firstName" type="text" autoComplete="given-name" value={formData.firstName} onChange={handleInputChange} {...aria('firstName')} className={cls} placeholder="First name" />}
          </Field>
          <Field id="lastName" label="Last name" icon={User} error={errors.lastName}>
            {(cls) => <input id="lastName" name="lastName" type="text" autoComplete="family-name" value={formData.lastName} onChange={handleInputChange} {...aria('lastName')} className={cls} placeholder="Last name" />}
          </Field>
        </div>

        <Field id="username" label="Username" icon={AtSign} error={errors.username}>
          {(cls) => <input id="username" name="username" type="text" autoComplete="username" value={formData.username} onChange={handleInputChange} {...aria('username')} className={cls} placeholder="Choose a username" />}
        </Field>

        <Field id="email" label="Email address" icon={Mail} error={errors.email}>
          {(cls) => <input id="email" name="email" type="email" autoComplete="email" value={formData.email} onChange={handleInputChange} {...aria('email')} className={cls} placeholder="you@example.com" />}
        </Field>

        <Field id="password" label="Password" icon={Lock} error={errors.password} hint="At least 6 characters"
          trailing={eye(showPassword, () => setShowPassword(!showPassword), 'password')}>
          {(cls) => <input id="password" name="password" type={showPassword ? 'text' : 'password'} autoComplete="new-password" value={formData.password} onChange={handleInputChange} {...aria('password')} className={`${cls} pr-10`} placeholder="Create a password" />}
        </Field>

        <Field id="confirmPassword" label="Confirm password" icon={Lock} error={errors.confirmPassword}
          trailing={eye(showConfirmPassword, () => setShowConfirmPassword(!showConfirmPassword), 'confirm password')}>
          {(cls) => <input id="confirmPassword" name="confirmPassword" type={showConfirmPassword ? 'text' : 'password'} autoComplete="new-password" value={formData.confirmPassword} onChange={handleInputChange} {...aria('confirmPassword')} className={`${cls} pr-10`} placeholder="Repeat your password" />}
        </Field>

        <div>
          <label htmlFor="terms" className="flex items-start gap-2.5 text-sm text-slate-700 dark:text-slate-300 cursor-pointer">
            <input id="terms" name="terms" type="checkbox" checked={formData.terms} onChange={handleInputChange} {...aria('terms')}
              className="mt-0.5 h-4 w-4 rounded accent-violet-600" />
            <span>I agree to the <a href="#" className={linkCls}>Terms of Service</a> and <a href="#" className={linkCls}>Privacy Policy</a></span>
          </label>
          {/* OLD: error <p> sat inside the flex row next to the checkbox label */}
          {errors.terms && <p id="terms-error" className="mt-1.5 text-xs text-red-600 dark:text-red-400">{errors.terms}</p>}
        </div>

        <button type="submit" disabled={isLoading} className={btn('primary', 'w-full h-11')}>
          {isLoading ? <><Loader2 className="w-4 h-4 animate-spin" /> Creating account…</> : 'Create account'}
        </button>
      </form>

      <Divider label="Or continue with" />
      <button type="button" onClick={handleGoogleSignup} className={btn('secondary', 'w-full h-11')}>
        <GoogleIcon /> Sign up with Google
      </button>
    </AuthShell>
  );
};

export default Signup;
