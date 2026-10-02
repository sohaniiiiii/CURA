import { Link } from 'react-router-dom';
import { Logo } from './ui';

const links = [
  { name: 'Use Cases', to: '/use-cases' },
  { name: 'Features', to: '/features' },
  { name: 'About', to: '/about' },
  { name: 'Contact', to: '/contact' },
  { name: 'Try CURA-X', to: '/chatbot' },
];

const Footer = () => (
  <footer className="border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950">
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6">
        <div>
          <Logo />
          <p className="mt-2 text-sm text-slate-500 dark:text-slate-400 max-w-sm">Trustworthy, multilingual medical AI assistance.</p>
        </div>
        <nav aria-label="Footer" className="flex flex-wrap gap-x-6 gap-y-2">
          {links.map(l => (
            <Link key={l.to} to={l.to} className="text-sm text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white">
              {l.name}
            </Link>
          ))}
        </nav>
      </div>
      <div className="mt-8 pt-6 border-t border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row sm:justify-between gap-2 text-xs text-slate-400 dark:text-slate-500">
        <p>© {new Date().getFullYear()} CURA-X. Academic project.</p>
        <p>Not a substitute for professional medical advice, diagnosis or treatment.</p>
      </div>
    </div>
  </footer>
);

export default Footer;
