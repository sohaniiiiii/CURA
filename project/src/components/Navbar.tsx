// CURA-X top navigation — UI v2. Previous version: project/legacy/pages/Navbar.tsx
import { useState, useEffect, useRef } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Moon, Sun, Menu, X, User, LogOut, ChevronDown, MessageSquare } from 'lucide-react';
import { useTheme } from '../contexts/ThemeContext';
import { useAuth } from '../contexts/AuthContext';
import { Logo, btn } from './ui';

const iconBtn =
  'p-2 rounded-lg text-slate-500 hover:text-slate-900 hover:bg-slate-100 dark:text-slate-400 dark:hover:text-white dark:hover:bg-slate-800 transition-colors';

const Navbar = () => {
  const { isDark, toggleTheme } = useTheme();
  const { user, isAuthenticated, logout } = useAuth();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const userMenuRef = useRef<HTMLDivElement>(null);
  const location = useLocation();

  // Close user menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (userMenuRef.current && !userMenuRef.current.contains(event.target as Node)) {
        setShowUserMenu(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Close menus on route change
  useEffect(() => {
    setIsMobileMenuOpen(false);
    setShowUserMenu(false);
  }, [location.pathname]);

  // "Try Cura" is now a dedicated button on the right instead of a plain link.
  const navLinks = [
    { name: 'Home', path: '/' },
    { name: 'Use Cases', path: '/use-cases' },
    { name: 'Features', path: '/features' },
    { name: 'About', path: '/about' },
    { name: 'Contact', path: '/contact' },
  ];

  const isActive = (path: string) => location.pathname === path;
  const initials = `${user?.firstName?.[0] ?? ''}${user?.lastName?.[0] ?? ''}`.toUpperCase() || 'U';

  return (
    <nav className="sticky top-0 z-50 bg-white/90 dark:bg-slate-950/90 backdrop-blur border-b border-slate-200 dark:border-slate-800">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 gap-4">
          <Logo />

          {/* Desktop links */}
          <div className="hidden md:flex items-center gap-1">
            {navLinks.map((link) => (
              <Link
                key={link.name}
                to={link.path}
                aria-current={isActive(link.path) ? 'page' : undefined}
                className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                  isActive(link.path)
                    ? 'text-violet-700 bg-violet-50 dark:text-violet-300 dark:bg-violet-500/10'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100 dark:text-slate-400 dark:hover:text-white dark:hover:bg-slate-800'
                }`}
              >
                {link.name}
              </Link>
            ))}
          </div>

          {/* Right side */}
          <div className="hidden md:flex items-center gap-2">
            <button onClick={toggleTheme} className={iconBtn} aria-label={isDark ? 'Switch to light theme' : 'Switch to dark theme'}>
              {isDark ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
            </button>

            {isAuthenticated ? (
              <>
                <Link to="/chatbot" className={btn('primary')}>
                  <MessageSquare className="w-4 h-4" /> Open chat
                </Link>
                <div className="relative" ref={userMenuRef}>
                  <button
                    onClick={() => setShowUserMenu(!showUserMenu)}
                    aria-expanded={showUserMenu}
                    aria-haspopup="menu"
                    className="flex items-center gap-1.5 pl-1 pr-2 py-1 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                  >
                    <span className="w-8 h-8 rounded-full bg-violet-100 text-violet-700 dark:bg-violet-500/20 dark:text-violet-300 text-xs font-semibold flex items-center justify-center">
                      {initials}
                    </span>
                    <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform ${showUserMenu ? 'rotate-180' : ''}`} />
                  </button>

                  {showUserMenu && (
                    <div role="menu" className="absolute right-0 mt-2 w-60 rounded-xl border border-slate-200 bg-white shadow-lg dark:border-slate-800 dark:bg-slate-900 py-1.5 z-50">
                      <div className="px-4 py-2.5 border-b border-slate-100 dark:border-slate-800">
                        <p className="text-sm font-medium text-slate-900 dark:text-white truncate">{user?.firstName} {user?.lastName}</p>
                        <p className="text-xs text-slate-500 dark:text-slate-400 truncate">{user?.email}</p>
                      </div>
                      <Link role="menuitem" to="/profile" className="flex items-center gap-2.5 px-4 py-2 text-sm text-slate-700 hover:bg-slate-50 dark:text-slate-300 dark:hover:bg-slate-800">
                        <User className="h-4 w-4 text-slate-400" /> Profile
                      </Link>
                      <button
                        role="menuitem"
                        onClick={() => { logout(); setShowUserMenu(false); }}
                        className="w-full flex items-center gap-2.5 px-4 py-2 text-sm text-slate-700 hover:bg-slate-50 dark:text-slate-300 dark:hover:bg-slate-800"
                      >
                        <LogOut className="h-4 w-4 text-slate-400" /> Log out
                      </button>
                    </div>
                  )}
                </div>
              </>
            ) : (
              <>
                <Link to="/login" className={btn('ghost')}>Log in</Link>
                <Link to="/signup" className={btn('primary')}>Get started</Link>
              </>
            )}
          </div>

          {/* Mobile controls */}
          <div className="flex md:hidden items-center gap-1">
            <button onClick={toggleTheme} className={iconBtn} aria-label={isDark ? 'Switch to light theme' : 'Switch to dark theme'}>
              {isDark ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
            </button>
            <button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className={iconBtn}
              aria-expanded={isMobileMenuOpen}
              aria-label={isMobileMenuOpen ? 'Close menu' : 'Open menu'}
            >
              {isMobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile menu */}
      {isMobileMenuOpen && (
        <div className="md:hidden border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950">
          <div className="px-4 py-3 space-y-1">
            {navLinks.map((link) => (
              <Link
                key={link.name}
                to={link.path}
                aria-current={isActive(link.path) ? 'page' : undefined}
                className={`block px-3 py-2.5 rounded-lg text-[15px] font-medium ${
                  isActive(link.path)
                    ? 'text-violet-700 bg-violet-50 dark:text-violet-300 dark:bg-violet-500/10'
                    : 'text-slate-700 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800'
                }`}
              >
                {link.name}
              </Link>
            ))}
          </div>
          <div className="px-4 pb-4 pt-2 border-t border-slate-200 dark:border-slate-800 space-y-2">
            {isAuthenticated ? (
              <>
                <div className="flex items-center gap-3 px-1 py-2">
                  <span className="w-9 h-9 rounded-full bg-violet-100 text-violet-700 dark:bg-violet-500/20 dark:text-violet-300 text-xs font-semibold flex items-center justify-center">{initials}</span>
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-slate-900 dark:text-white truncate">{user?.firstName} {user?.lastName}</p>
                    <p className="text-xs text-slate-500 dark:text-slate-400 truncate">{user?.email}</p>
                  </div>
                </div>
                <Link to="/chatbot" className={btn('primary', 'w-full')}><MessageSquare className="w-4 h-4" /> Open chat</Link>
                <div className="grid grid-cols-2 gap-2">
                  <Link to="/profile" className={btn('secondary')}><User className="w-4 h-4" /> Profile</Link>
                  <button onClick={() => { logout(); setIsMobileMenuOpen(false); }} className={btn('secondary')}>
                    <LogOut className="w-4 h-4" /> Log out
                  </button>
                </div>
              </>
            ) : (
              <div className="grid grid-cols-2 gap-2">
                <Link to="/login" className={btn('secondary')}>Log in</Link>
                <Link to="/signup" className={btn('primary')}>Get started</Link>
              </div>
            )}
          </div>
        </div>
      )}
    </nav>
  );
};

export default Navbar;
