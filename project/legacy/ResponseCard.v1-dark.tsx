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
    if (p.startsWith('**') && p.endsWith('**')) return <strong key={i} className="text-white">{p.slice(2, -2)}</strong>;
    if (p.startsWith('*') && p.endsWith('*') && p.length > 2) return <em key={i} className="text-gray-400">{p.slice(1, -1)}</em>;
    return <React.Fragment key={i}>{p}</React.Fragment>;
  });
};

export const FormattedText: React.FC<{ text: string }> = ({ text }) => {
  // Model sometimes returns bullets inline ("Home remedies: - a - b"); split them onto lines.
  const normalized = text
    .replace(/\s+-\s(?=[A-Z0-9*])/g, '\n- ')
    .replace(/\s+((?:Home remedies|OTC options|See a doctor if|Symptoms|Types|Treatment|Causes):)/g, '\n$1');

  const blocks: React.ReactNode[] = [];
  let list: string[] = [];
  const flush = () => {
    if (list.length) {
      blocks.push(
        <ul key={`ul-${blocks.length}`} className="space-y-1 my-2 ml-1">
          {list.map((li, i) => (
            <li key={i} className="flex gap-2">
              <span className="mt-2 h-1.5 w-1.5 rounded-full bg-violet-400 flex-shrink-0" />
              <span>{renderInline(li)}</span>
            </li>
          ))}
        </ul>
      );
      list = [];
    }
  };

  normalized.split('\n').map(l => l.trim()).filter(Boolean).forEach((line, idx) => {
    const bullet = line.match(/^[-*•]\s+(.*)/);
    if (bullet) { list.push(bullet[1]); return; }
    flush();
    const heading = line.match(/^([A-Za-z][A-Za-z\s]{1,30}):\s*(.*)$/);
    if (heading && !heading[1].includes('*')) {
      blocks.push(
        <p key={idx} className="mt-3 first:mt-0">
          <span className="font-semibold text-violet-300">{heading[1]}:</span>{' '}
          {heading[2] && renderInline(heading[2])}
        </p>
      );
    } else {
      blocks.push(<p key={idx} className="mt-2 first:mt-0">{renderInline(line)}</p>);
    }
  });
  flush();
  return <div className="leading-relaxed text-[15px]">{blocks}</div>;
};

// ---------- Confidence badge ----------
export const ConfidenceBadge: React.FC<{ value: number; isMock?: boolean }> = ({ value, isMock }) => {
  const pct = Math.round(value * 100);
  const tone =
    pct >= 85 ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30'
    : pct >= 65 ? 'bg-amber-500/15 text-amber-300 border-amber-500/30'
    : 'bg-red-500/15 text-red-300 border-red-500/30';
  const label = pct >= 85 ? 'High' : pct >= 65 ? 'Moderate' : 'Low';
  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-xs font-medium ${tone}`}
      title={isMock ? 'Preview value — real confidence scoring arrives in a later phase' : 'Model confidence'}
    >
      <ShieldCheck className="w-3.5 h-3.5" />
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
      className={`mb-3 rounded-xl border p-3 flex gap-3 ${
        critical ? 'bg-red-600/15 border-red-500/50 text-red-200' : 'bg-amber-500/10 border-amber-500/40 text-amber-200'
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
    <div className="rounded-lg border border-slate-600/60 bg-slate-800/40">
      <button
        onClick={() => setOpen(o => !o)}
        aria-expanded={open}
        className="w-full flex items-center justify-between px-3 py-2 text-sm text-gray-300 hover:text-white transition-colors"
      >
        <span className="flex items-center gap-2">
          {icon}
          {title}
          {count !== undefined && <span className="text-xs text-gray-500">({count})</span>}
        </span>
        <ChevronDown className={`w-4 h-4 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && <div className="px-3 pb-3 text-sm text-gray-300">{children}</div>}
    </div>
  );
};

const SourcesList: React.FC<{ sources: EvidenceSource[] }> = ({ sources }) => (
  <ol className="space-y-2">
    {sources.map((s, i) => (
      <li key={i} className="flex gap-2">
        <span className="text-violet-400 font-mono text-xs mt-0.5">[{i + 1}]</span>
        <div>
          {s.url ? (
            <a href={s.url} target="_blank" rel="noreferrer" className="text-violet-300 hover:underline inline-flex items-center gap-1">
              {s.title} <ExternalLink className="w-3 h-3" />
            </a>
          ) : (
            <span className="text-violet-300">{s.title}</span>
          )}
          <p className="text-xs text-gray-500">{s.publisher}</p>
          {s.snippet && <p className="text-xs text-gray-400 mt-0.5">“{s.snippet}”</p>}
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
      <div className="mt-4 space-y-2">
        <div className="flex flex-wrap items-center gap-2">
          <ConfidenceBadge value={meta.confidence} isMock={meta.isMock} />
          {meta.isMock && (
            <span className="text-[11px] px-2 py-0.5 rounded-full bg-slate-600/50 text-gray-400" title="Sources, confidence and explanation are sample data until the RAG/XAI pipeline is connected">
              Preview data
            </span>
          )}
        </div>
        <Collapsible icon={<BookOpen className="w-4 h-4 text-violet-400" />} title="Evidence & sources" count={meta.sources.length}>
          <SourcesList sources={meta.sources} />
        </Collapsible>
        <Collapsible icon={<Lightbulb className="w-4 h-4 text-amber-400" />} title="Why this answer?">
          <ul className="list-disc ml-5 space-y-1">
            {meta.explanation.map((e, i) => <li key={i}>{e}</li>)}
          </ul>
        </Collapsible>
      </div>
    )}
  </div>
);
