// Profile — UI v2. Previous version: project/legacy/pages/Profile.tsx
// Logic unchanged (useAuth().updateProfile, edit/cancel). Adds the Navbar so the page isn't a dead end.
import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Mail, Edit3, Save, X, MessageSquare, AtSign, User, Loader2 } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import Navbar from '../components/Navbar';
import { Container, Card, Alert, btn, inputClass } from '../components/ui';

const Profile = () => {
  const { user, updateProfile } = useAuth();
  const [isEditing, setIsEditing] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState<{ [key: string]: string }>({});
  const [success, setSuccess] = useState('');
  const [formData, setFormData] = useState({
    firstName: user?.firstName || '',
    lastName: user?.lastName || '',
    username: user?.username || '',
  });

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
    if (errors[name]) setErrors({ ...errors, [name]: '' });
  };

  const handleSave = async () => {
    setIsLoading(true);
    setErrors({});
    try {
      await updateProfile(formData);
      setSuccess('Profile updated successfully!');
      setIsEditing(false);
    } catch (error: any) {
      setErrors({ general: error.message || 'Failed to update profile. Please try again.' });
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancel = () => {
    setFormData({ firstName: user?.firstName || '', lastName: user?.lastName || '', username: user?.username || '' });
    setIsEditing(false);
    setErrors({});
    setSuccess('');
  };

  const initials = `${user?.firstName?.[0] ?? ''}${user?.lastName?.[0] ?? ''}`.toUpperCase() || 'U';

  const fields: { name: keyof typeof formData; label: string; icon: typeof User; display: string }[] = [
    { name: 'firstName', label: 'First name', icon: User, display: user?.firstName ?? '' },
    { name: 'lastName', label: 'Last name', icon: User, display: user?.lastName ?? '' },
    { name: 'username', label: 'Username', icon: AtSign, display: user?.username ? `@${user.username}` : '' },
  ];

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <main className="flex-1 py-10 sm:py-14">
        <Container className="max-w-3xl">
          {/* Identity header */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-5">
            <div className="flex items-center gap-4">
              <span className="w-16 h-16 rounded-full bg-violet-100 text-violet-700 dark:bg-violet-500/15 dark:text-violet-300 text-xl font-semibold flex items-center justify-center">
                {initials}
              </span>
              <div className="min-w-0">
                <h1 className="text-2xl font-semibold tracking-tight text-slate-900 dark:text-white truncate">{user?.firstName} {user?.lastName}</h1>
                <p className="text-sm text-slate-500 dark:text-slate-400 truncate">{user?.email}</p>
              </div>
            </div>
            <Link to="/chatbot" className={btn('secondary')}><MessageSquare className="w-4 h-4" /> Open chat</Link>
          </div>

          <Card className="mt-8 p-0 overflow-hidden">
            <div className="flex items-center justify-between gap-4 px-6 py-4 border-b border-slate-200 dark:border-slate-800">
              <div>
                <h2 className="font-semibold text-slate-900 dark:text-white">Account information</h2>
                <p className="text-sm text-slate-500 dark:text-slate-400">Manage your personal details</p>
              </div>
              {!isEditing && (
                <button onClick={() => { setIsEditing(true); setSuccess(''); }} className={btn('secondary')}>
                  <Edit3 className="h-4 w-4" /> Edit
                </button>
              )}
            </div>

            <div className="p-6">
              {success && <div className="mb-5"><Alert tone="success">{success}</Alert></div>}
              {errors.general && <div className="mb-5"><Alert tone="error">{errors.general}</Alert></div>}

              <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-5">
                {fields.map(f => (
                  <div key={f.name}>
                    <dt><label htmlFor={f.name} className="block text-sm font-medium text-slate-500 dark:text-slate-400 mb-1.5">{f.label}</label></dt>
                    <dd>
                      {isEditing ? (
                        <div className="relative">
                          <f.icon className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                          <input id={f.name} name={f.name} type="text" value={formData[f.name]} onChange={handleInputChange} className={inputClass(!!errors[f.name])} />
                        </div>
                      ) : (
                        <p className="text-[15px] text-slate-900 dark:text-white min-h-[22px]">{f.display || '—'}</p>
                      )}
                    </dd>
                  </div>
                ))}
                <div>
                  <dt className="text-sm font-medium text-slate-500 dark:text-slate-400 mb-1.5">Email</dt>
                  <dd className="flex items-center gap-2 text-[15px] text-slate-900 dark:text-white">
                    <Mail className="h-4 w-4 text-slate-400" /> <span className="truncate">{user?.email}</span>
                  </dd>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Email cannot be changed</p>
                </div>
              </dl>
            </div>

            {isEditing && (
              <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2 px-6 py-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-950/40">
                {/* OLD: grey "Cancel" button (bg-gray-500) */}
                <button onClick={handleCancel} className={btn('secondary')}><X className="h-4 w-4" /> Cancel</button>
                <button onClick={handleSave} disabled={isLoading} className={btn('primary')}>
                  {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                  {isLoading ? 'Saving…' : 'Save changes'}
                </button>
              </div>
            )}
          </Card>
        </Container>
      </main>
    </div>
  );
};

export default Profile;
