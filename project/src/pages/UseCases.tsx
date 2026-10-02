// Use Cases — UI v2. Previous version: project/legacy/pages/UseCases.tsx
// Old per-card rainbow gradients replaced with one consistent accent.
import { Search, Globe, GraduationCap, AlertTriangle, FileText, Users, ArrowRight, Heart, Shield } from 'lucide-react';
import { PageHeader, Section, Card, IconTile, ButtonLink, CtaBand } from '../components/ui';

const useCases = [
  { icon: Search, title: 'Symptom Checker', description: 'Get preliminary insights about your symptoms and understand when to seek medical attention.', features: ['AI-powered symptom analysis', 'Risk assessment', 'Care recommendations', 'Emergency alerts'] },
  { icon: Globe, title: 'Medical Translation', description: 'Communicate medical information across language barriers with accurate translations.', features: ['2 language support', 'Medical terminology', 'Cultural context', 'Real-time translation'] },
  { icon: GraduationCap, title: 'Patient Education', description: 'Learn about medical conditions, treatments, and preventive care in simple terms.', features: ['Simplified explanations', 'Visual aids', 'Personalized content', 'Progress tracking'] },
  { icon: AlertTriangle, title: 'Emergency Triage', description: 'Quick assessment for urgent medical situations to guide immediate actions.', features: ['Rapid evaluation', 'Priority assessment', 'Emergency protocols', '24/7 availability'] },
  { icon: FileText, title: 'Research Assistance', description: 'Support healthcare research with literature review and data analysis capabilities.', features: ['Literature search', 'Data interpretation', 'Research summaries', 'Citation support'] },
  { icon: Users, title: 'Healthcare Support', description: 'Assist healthcare professionals with clinical decision support and patient management.', features: ['Clinical guidelines', 'Drug interactions', 'Diagnostic support', 'Treatment protocols'] },
];

const stats = [
  { icon: Heart, value: '2B+', label: 'People supported' },
  { icon: Globe, value: '2', label: 'Languages supported' },
  { icon: Shield, value: '24/7', label: 'Available support' },
];

const UseCases = () => (
  <div>
    <PageHeader
      eyebrow="Use cases"
      title="Where CURA-X helps"
      description="Discover how CURA's medical AI can support healthcare delivery, research, and patient education across diverse scenarios and languages."
    />

    <Section>
      <div className="grid md:grid-cols-2 gap-5">
        {useCases.map((u) => (
          <Card key={u.title} hover className="p-7">
            <div className="flex items-start gap-4">
              <IconTile icon={u.icon} />
              <div className="min-w-0">
                <h2 className="text-lg font-semibold text-slate-900 dark:text-white">{u.title}</h2>
                <p className="mt-1.5 text-sm text-slate-600 dark:text-slate-400 leading-relaxed">{u.description}</p>
              </div>
            </div>
            <ul className="mt-5 pt-5 border-t border-slate-100 dark:border-slate-800 grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-2">
              {u.features.map((f) => (
                <li key={f} className="flex items-center gap-2 text-sm text-slate-700 dark:text-slate-300">
                  <span className="w-1.5 h-1.5 rounded-full bg-violet-500 flex-shrink-0" />{f}
                </li>
              ))}
            </ul>
          </Card>
        ))}
      </div>
    </Section>

    <Section muted>
      <h2 className="text-center text-2xl sm:text-3xl font-semibold tracking-tight text-slate-900 dark:text-white">Empowering global healthcare</h2>
      <dl className="mt-10 grid sm:grid-cols-3 gap-5">
        {stats.map((s) => (
          <div key={s.label} className="rounded-2xl border border-slate-200 dark:border-slate-800 p-6 text-center">
            <div className="flex justify-center"><IconTile icon={s.icon} /></div>
            <dd className="mt-4 text-3xl font-semibold tracking-tight text-slate-900 dark:text-white">{s.value}</dd>
            <dt className="mt-1 text-sm text-slate-500 dark:text-slate-400">{s.label}</dt>
          </div>
        ))}
      </dl>
    </Section>

    <Section>
      <CtaBand title="Ready to transform healthcare?" description="Experience the power of CURA AI across these use cases. Start your journey towards smarter healthcare today.">
        {/* OLD: non-functional <button>Try CURA Now</button> / <button>Learn More</button> */}
        <ButtonLink to="/chatbot" className="h-11 px-5">Try CURA-X now <ArrowRight className="w-4 h-4" /></ButtonLink>
        <ButtonLink to="/features" variant="secondary" className="h-11 px-5">Learn more</ButtonLink>
      </CtaBand>
    </Section>
  </div>
);

export default UseCases;
