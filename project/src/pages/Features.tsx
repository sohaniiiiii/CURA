// Features — UI v2. Previous version: project/legacy/pages/Features.tsx
import { Globe, Shield, Database, Zap, MessageSquare, Clock, ArrowRight, Check, Quote } from 'lucide-react';
import { PageHeader, Section, SectionHeading, Card, IconTile, ButtonLink, CtaBand } from '../components/ui';

const coreFeatures = [
  {
    icon: MessageSquare,
    title: 'Real-time Multilingual Chat',
    description: 'Seamless communication in 2 languages with instant translation and context preservation.',
    details: ['Live language switching', 'Context-aware translations', 'Cultural sensitivity', 'Medical terminology accuracy'],
  },
  {
    icon: Clock,
    title: 'Memory Across Sessions',
    description: 'Cura remembers your medical history and previous conversations for personalized care.',
    details: ['Persistent conversation history', 'Medical timeline tracking', 'Preference learning', 'Secure data encryption'],
  },
];

const additionalFeatures = [
  { icon: Shield, title: 'Enterprise Security', description: 'Bank-level encryption and HIPAA compliance ensure your health data stays protected.' },
  { icon: Database, title: 'Health Data Integration', description: 'Connect with EHRs, wearables, and health apps for comprehensive health insights.' },
  { icon: Zap, title: 'Lightning Fast Responses', description: 'Optimized inference engine delivers accurate medical insights in milliseconds.' },
  { icon: Globe, title: 'Global Accessibility', description: 'Designed to work reliably across different regions and healthcare systems.' },
];

const benefits = [
  'Reduce diagnostic errors by up to 40%',
  'Save healthcare providers 2+ hours daily',
  'Improve patient satisfaction scores',
  'Support 2B+ people in their native language',
  'Available 24/7 without downtime',
  'Continuous learning and improvement',
];

const Features = () => (
  <div>
    <PageHeader
      eyebrow="Features"
      title="Powerful features for modern healthcare"
      description="CURA combines cutting-edge AI technology with healthcare expertise to deliver a comprehensive medical assistant that scales globally."
    />

    {/* Core features */}
    <Section>
      <div className="grid lg:grid-cols-2 gap-6">
        {coreFeatures.map((f) => (
          <Card key={f.title} className="p-7 sm:p-8">
            <IconTile icon={f.icon} />
            <h2 className="mt-5 text-xl font-semibold text-slate-900 dark:text-white">{f.title}</h2>
            <p className="mt-2 text-[15px] text-slate-600 dark:text-slate-400 leading-relaxed">{f.description}</p>
            <ul className="mt-6 grid sm:grid-cols-2 gap-x-4 gap-y-2.5">
              {f.details.map((d) => (
                <li key={d} className="flex items-start gap-2 text-sm text-slate-700 dark:text-slate-300">
                  <Check className="w-4 h-4 mt-0.5 text-violet-600 dark:text-violet-400 flex-shrink-0" />{d}
                </li>
              ))}
            </ul>
          </Card>
        ))}
      </div>
    </Section>

    {/* Additional features */}
    <Section muted>
      <SectionHeading eyebrow="Platform" title="Built for healthcare excellence" />
      <div className="grid sm:grid-cols-2 gap-5">
        {additionalFeatures.map((f) => (
          <Card key={f.title} hover className="flex gap-4">
            <IconTile icon={f.icon} />
            <div>
              <h3 className="font-semibold text-slate-900 dark:text-white">{f.title}</h3>
              <p className="mt-1 text-sm text-slate-600 dark:text-slate-400 leading-relaxed">{f.description}</p>
            </div>
          </Card>
        ))}
      </div>
    </Section>

    {/* Benefits */}
    <Section>
      <div className="grid lg:grid-cols-2 gap-10 items-center">
        <SectionHeading
          align="left"
          eyebrow="Outcomes"
          title="Proven results in healthcare"
          description="CURA has been designed based on extensive research and real-world healthcare needs, delivering measurable improvements in patient outcomes and provider efficiency."
        />
        <ul className="grid sm:grid-cols-2 gap-3">
          {benefits.map((b) => (
            <li key={b} className="flex items-start gap-3 rounded-xl border border-slate-200 bg-white p-4 text-sm text-slate-700 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300">
              <span className="w-5 h-5 rounded-full bg-emerald-100 dark:bg-emerald-500/15 flex items-center justify-center flex-shrink-0">
                <Check className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
              </span>
              {b}
            </li>
          ))}
        </ul>
      </div>
    </Section>

    {/* Testimonial */}
    <Section className="pt-0">
      <figure className="max-w-3xl mx-auto text-center">
        <Quote className="w-8 h-8 mx-auto text-violet-300 dark:text-violet-500/60" aria-hidden />
        <blockquote className="mt-4 text-xl sm:text-2xl font-medium leading-relaxed text-slate-800 dark:text-slate-200">
          “CURA has revolutionized how we deliver healthcare services. The multilingual support and accurate medical insights have helped us
          serve our diverse patient population better than ever.”
        </blockquote>
      </figure>
    </Section>

    <Section className="pt-0">
      <CtaBand title="Experience CURA's full potential" description="Join healthcare professionals worldwide who trust CURA for intelligent medical assistance.">
        {/* OLD: non-functional <button>Start Free Trial</button> / <button>View Demo</button> */}
        <ButtonLink to="/signup" className="h-11 px-5">Get started <ArrowRight className="w-4 h-4" /></ButtonLink>
        <ButtonLink to="/chatbot" variant="secondary" className="h-11 px-5">View demo</ButtonLink>
      </CtaBand>
    </Section>
  </div>
);

export default Features;
