// CURA-X structured response — UI v2 (light/dark aware).
// Previous dark-only version preserved at: project/legacy/ResponseCard.v1-dark.tsx
import React, { useState } from 'react';
import {
  ShieldCheck,
  BookOpen,
  Lightbulb,
  AlertTriangle,
  ChevronDown,
  ExternalLink,
  Siren,
} from 'lucide-react';
import { ResponseMeta, EmergencyInfo, EvidenceSource } from '../../types/api';

// ---------- Lightweight formatter (no markdown lib needed) ----------
// Handles "- " / "* " bullets, "Label:" headings, **bold** and *italic*.
const renderInline = (text: string) => {
  const parts = text.split(/(\*\*[^*]+\*\*|\*[^*]+\*)/g);
  return parts.map((p, i) => {
    if (p.startsWith('**') && p.endsWith('**'))
      return <strong key={i} className="font-semibold text-slate-900 dark:text-white">{p.slice(2, -2)}</strong>;
    if (p.startsWith('*') && p.endsWith('*') && p.length > 2)
      return <em key={i} className="text-slate-500 dark:text-slate-400">{p.slice(1, -1)}</em>;
    return <React.Fragment key={i}>{p}</React.Fragment>;
  });
};

export const FormattedText: React.FC<{ text: string }> = ({ text }) => {
  // Model sometimes returns bullets inline ("Home remedies: - a - b"); split them onto lines.
  const normalized = text
    // Non-breaking / narrow spaces (common in model output) → normal spaces
    .replace(/[   ]/g, ' ')
    // OLD: /\s+-\s(?=[A-Z0-9*])/g — also allow accented capitals, ¿ ¡ (Spanish) and Devanagari (Hindi has no capitals)
    .replace(/\s+-\s(?=[\p{Lu}0-9*¿¡\p{Script=Devanagari}])/gu, '\n- ')
    // English + Spanish + Hindi section labels start a new line
    .replace(/\s+((?:Home remedies|OTC options|See a doctor if|Symptoms|Types|Treatment|Causes|Remedios caseros|Opciones de venta libre|Consulte a un médico si|Consulta a un médico si|Síntomas|Tipos|Tratamiento|Causas|घरेलू उपचार|बिना पर्ची की दवाएँ|डॉक्टर से मिलें यदि|लक्षण|कारण):)/gu, '\n$1');

  const blocks: React.ReactNode[] = [];
  let list: string[] = [];
  const flush = () => {
    if (list.length) {
      blocks.push(
        <ul key={`ul-${blocks.length}`} className="my-2 space-y-1.5">
          {list.map((li, i) => (
            <li key={i} className="flex gap-2.5">
              <span className="mt-[9px] h-1.5 w-1.5 rounded-full bg-violet-500 dark:bg-violet-400 flex-shrink-0" aria-hidden />
              <span className="text-[15px]">{renderInline(li)}</span>
            </li>
          ))}
        </ul>
      );
      list = [];
    }
  };

  normalized.split('\n').map(l => l.trim()).filter(Boolean).forEach((line, idx) => {
    const bullet = line.match(/^[-*•]\s+(.*)/);
    // A bullet that is only a label ("- **Home remedies:**") is really a section heading
    const labelOnly = bullet && bullet[1].trim().match(/^\*{0,2}([^*:]{1,40}):\*{0,2}$/u);
    if (labelOnly) {
      flush();
      blocks.push(
        <p key={idx} className="mt-4 first:mt-0 text-[15px]">
          <span className="font-semibold text-slate-900 dark:text-white">{labelOnly[1].trim()}:</span>
        </p>
      );
      return;
    }
    if (bullet) { list.push(bullet[1]); return; }
    flush();
    // OLD: /^([A-Za-z][A-Za-z\s]{1,30}):\s*(.*)$/ — missed accented labels like "médico"
    // \p{M} = combining marks (Devanagari vowel signs like ू ें are marks, not letters)
    const heading = line.match(/^(\p{L}[\p{L}\p{M}\s]{1,34}):\s*(.*)$/u);
    if (heading && !heading[1].includes('*')) {
      blocks.push(
        <p key={idx} className="mt-4 first:mt-0 text-[15px]">
          <span className="font-semibold text-slate-900 dark:text-white">{heading[1]}:</span>{' '}
          {heading[2] && renderInline(heading[2])}
        </p>
      );
    } else {
      blocks.push(<p key={idx} className="mt-2.5 first:mt-0 text-[15px]">{renderInline(line)}</p>);
    }
  });
  flush();
  return <div className="leading-relaxed text-slate-700 dark:text-slate-200">{blocks}</div>;
};

// ---------- Confidence badge ----------
export const ConfidenceBadge: React.FC<{ value: number; isMock?: boolean }> = ({ value, isMock }) => {
  const pct = Math.round(value * 100);
  const tone =
    pct >= 85
      ? 'bg-emerald-50 text-emerald-700 ring-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-300 dark:ring-emerald-500/30'
      : pct >= 65
        ? 'bg-amber-50 text-amber-700 ring-amber-200 dark:bg-amber-500/10 dark:text-amber-300 dark:ring-amber-500/30'
        : 'bg-red-50 text-red-700 ring-red-200 dark:bg-red-500/10 dark:text-red-300 dark:ring-red-500/30';
  const label = pct >= 85 ? 'High' : pct >= 65 ? 'Moderate' : 'Low';
  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full ring-1 ring-inset text-xs font-medium ${tone}`}
      title={isMock ? 'Preview value — real confidence scoring arrives in a later phase' : 'Model confidence'}
    >
      <ShieldCheck className="w-3.5 h-3.5" aria-hidden />
      {label} confidence · {pct}%
    </span>
  );
};

// ---------- Emergency alert ----------
export const EmergencyAlert: React.FC<{ info: EmergencyInfo }> = ({ info }) => {
  const critical = info.level === 'critical';
  return (
    <div
      role="alert"
      className={`mb-4 rounded-xl border p-3.5 flex gap-3 ${
        critical
          ? 'bg-red-50 border-red-200 text-red-800 dark:bg-red-500/10 dark:border-red-500/40 dark:text-red-200'
          : 'bg-amber-50 border-amber-200 text-amber-800 dark:bg-amber-500/10 dark:border-amber-500/40 dark:text-amber-200'
      }`}
    >
      {critical ? <Siren className="w-5 h-5 flex-shrink-0 mt-0.5" /> : <AlertTriangle className="w-5 h-5 flex-shrink-0 mt-0.5" />}
      <div className="text-sm">
        <p className="font-semibold">{critical ? 'Possible emergency' : 'Attention'}</p>
        <p className="mt-0.5">{info.message}</p>
        <p className="mt-1 font-medium">{info.action}</p>
      </div>
    </div>
  );
};

// ---------- Collapsible section ----------
const Collapsible: React.FC<{
  icon: React.ReactNode;
  title: string;
  count?: number;
  children: React.ReactNode;
}> = ({ icon, title, count, children }) => {
  const [open, setOpen] = useState(false);
  return (
    <div className="rounded-lg border border-slate-200 bg-slate-50/70 dark:border-slate-800 dark:bg-slate-800/40">
      <button
        onClick={() => setOpen(o => !o)}
        aria-expanded={open}
        className="w-full flex items-center justify-between gap-2 px-3 py-2.5 rounded-lg text-sm font-medium text-slate-700 hover:text-slate-900 hover:bg-slate-100 dark:text-slate-300 dark:hover:text-white dark:hover:bg-slate-800 transition-colors"
      >
        <span className="flex items-center gap-2">
          {icon}
          {title}
          {count !== undefined && <span className="text-xs font-normal text-slate-400 dark:text-slate-500">{count}</span>}
        </span>
        <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform duration-200 ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && (
        <div className="px-3 pb-3 pt-1 text-sm text-slate-600 dark:text-slate-300 border-t border-slate-200 dark:border-slate-800">
          {children}
        </div>
      )}
    </div>
  );
};

const SourcesList: React.FC<{ sources: EvidenceSource[] }> = ({ sources }) => (
  <ol className="space-y-3 mt-2">
    {sources.map((s, i) => (
      <li key={i} className="flex gap-2.5">
        <span className="flex-shrink-0 w-5 h-5 rounded bg-violet-100 text-violet-700 dark:bg-violet-500/15 dark:text-violet-300 text-[11px] font-semibold flex items-center justify-center mt-0.5">
          {i + 1}
        </span>
        <div className="min-w-0">
          {s.url ? (
            <a
              href={s.url}
              target="_blank"
              rel="noreferrer"
              className="font-medium text-violet-700 hover:text-violet-900 dark:text-violet-300 dark:hover:text-violet-200 hover:underline inline-flex items-center gap-1"
            >
              {s.title} <ExternalLink className="w-3 h-3 flex-shrink-0" />
            </a>
          ) : (
            <span className="font-medium text-slate-800 dark:text-slate-200">{s.title}</span>
          )}
          <p className="text-xs text-slate-500 dark:text-slate-400">{s.publisher}</p>
          {/* OLD: rendered as a quotation (“…”) — these are descriptions, not verbatim quotes */}
          {s.snippet && <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">{s.snippet}</p>}
        </div>
      </li>
    ))}
  </ol>
);

// ---------- Full structured bot response ----------
export const ResponseCard: React.FC<{ content: string; meta?: ResponseMeta }> = ({ content, meta }) => (
  <div>
    {meta?.emergency && <EmergencyAlert info={meta.emergency} />}
    <FormattedText text={content} />
    {meta && (
      <div className="mt-5 pt-4 border-t border-slate-100 dark:border-slate-800 space-y-2.5">
        <div className="flex flex-wrap items-center gap-2">
          <ConfidenceBadge value={meta.confidence} isMock={meta.isMock} />
          {meta.isMock && (
            <span
              className="text-[11px] px-2 py-0.5 rounded-full bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400"
              title="Sources, confidence and explanation are sample data until the RAG/XAI pipeline is connected"
            >
              Preview data
            </span>
          )}
        </div>
        <div className="grid gap-2">
          <Collapsible icon={<BookOpen className="w-4 h-4 text-violet-500 dark:text-violet-400" />} title="Evidence & sources" count={meta.sources.length}>
            <SourcesList sources={meta.sources} />
          </Collapsible>
          <Collapsible icon={<Lightbulb className="w-4 h-4 text-amber-500 dark:text-amber-400" />} title="Why this answer?">
            <ul className="mt-2 space-y-1.5">
              {meta.explanation.map((e, i) => (
                <li key={i} className="flex gap-2">
                  <span className="mt-2 h-1 w-1 rounded-full bg-slate-400 flex-shrink-0" aria-hidden />
                  <span>{e}</span>
                </li>
              ))}
            </ul>
          </Collapsible>
        </div>
      </div>
    )}
  </div>
);
