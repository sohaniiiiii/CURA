// About — UI v2. Previous version: project/legacy/pages/About.tsx
import { Target, ArrowRight, Mail, Linkedin, Github, HeartPulse, Globe, ShieldCheck } from 'lucide-react';
import { PageHeader, Section, SectionHeading, Card, IconTile, ButtonLink, CtaBand } from '../components/ui';

const teamMembers = [
  { name: 'Afsin', social: { linkedin: '#', github: '#' } },
  { name: 'Sohani', social: { linkedin: '#', github: '#' } },
  { name: 'Usha Sri', social: { linkedin: '#', github: '#' } },
  { name: 'Divya', social: { linkedin: '#', github: '#' } },
  { name: 'Vishnu Priya', social: { linkedin: '#', github: '#' } },
];

const achievements = [
  { icon: Target, title: '95% Accuracy', description: 'Medical response accuracy validated by healthcare professionals' },
];

const values = [
  { icon: HeartPulse, title: 'Patient first', text: 'Clear, safe guidance that knows when to send you to a doctor.' },
  { icon: Globe, title: 'Accessible', text: 'Health information in the languages people actually speak.' },
  { icon: ShieldCheck, title: 'Transparent', text: 'Confidence, sources and reasoning shown with every answer.' },
];

const initials = (name: string) => name.split(' ').map(p => p[0]).join('').slice(0, 2).toUpperCase();

const socialBtn =
  'p-2 rounded-lg text-slate-500 hover:text-violet-700 hover:bg-violet-50 dark:text-slate-400 dark:hover:text-violet-300 dark:hover:bg-violet-500/10 transition-colors';

const About = () => (
  <div>
    <PageHeader
      eyebrow="About"
      title="About CURA-X"
      description="Democratizing healthcare AI to serve billions across languages and cultures, making quality medical assistance accessible to everyone, everywhere."
    />

    <Section>
      <div className="grid md:grid-cols-3 gap-5">
        {values.map(v => (
          <Card key={v.title}>
            <IconTile icon={v.icon} />
            <h2 className="mt-4 font-semibold text-slate-900 dark:text-white">{v.title}</h2>
            <p className="mt-1.5 text-sm text-slate-600 dark:text-slate-400 leading-relaxed">{v.text}</p>
          </Card>
        ))}
      </div>

      {achievements.map(a => (
        <div key={a.title} className="mt-5 rounded-2xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900 p-6 sm:p-8 flex flex-col sm:flex-row sm:items-center gap-5">
          <IconTile icon={a.icon} />
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-violet-600 dark:text-violet-400">Key achievement</p>
            <p className="mt-1 text-2xl font-semibold tracking-tight text-slate-900 dark:text-white">{a.title}</p>
            <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">{a.description}</p>
          </div>
        </div>
      ))}
    </Section>

    <Section muted>
      <SectionHeading eyebrow="Team" title="Meet our team" />
      <ul className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
        {teamMembers.map((m) => (
          <li key={m.name} className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-950/40 p-5 text-center">
            <span className="mx-auto w-14 h-14 rounded-full bg-violet-100 text-violet-700 dark:bg-violet-500/15 dark:text-violet-300 font-semibold flex items-center justify-center">
              {initials(m.name)}
            </span>
            <h3 className="mt-3 font-medium text-slate-900 dark:text-white">{m.name}</h3>
            <div className="mt-2 flex justify-center gap-1">
              <a href={m.social.linkedin} className={socialBtn} aria-label={`${m.name} on LinkedIn`}><Linkedin className="w-4 h-4" /></a>
              <a href={m.social.github} className={socialBtn} aria-label={`${m.name} on GitHub`}><Github className="w-4 h-4" /></a>
            </div>
          </li>
        ))}
      </ul>
    </Section>

    <Section>
      <CtaBand title="Join us in transforming healthcare" description="Be part of our mission to make quality healthcare accessible to everyone.">
        {/* OLD: non-functional <button>Get Involved</button> / <button>Contact Us</button> */}
        <ButtonLink to="/signup" className="h-11 px-5">Get involved <ArrowRight className="w-4 h-4" /></ButtonLink>
        <ButtonLink to="/contact" variant="secondary" className="h-11 px-5"><Mail className="w-4 h-4" /> Contact us</ButtonLink>
      </CtaBand>
    </Section>
  </div>
);

export default About;
