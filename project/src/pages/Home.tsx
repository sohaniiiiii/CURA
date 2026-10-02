// Home — UI v2. Previous version: project/legacy/pages/Home.tsx
import { ArrowRight, Brain, Globe, Shield, Database, Image, Users, ShieldCheck, BookOpen, Lightbulb, MessageSquare, Search, CheckCircle2 } from 'lucide-react';
import { Section, SectionHeading, Card, IconTile, ButtonLink, CtaBand, Container } from '../components/ui';

const features = [
  { icon: Brain, title: 'Persistent Memory', description: 'CURA remembers your medical history and previous conversations for personalized care.' },
  { icon: Users, title: 'Personalized Medical Responses', description: 'Get tailored health advice based on your unique profile and medical history.' },
  { icon: Database, title: 'Health Data Integration', description: 'Seamlessly integrate with your existing health records and wearable devices.' },
  { icon: Globe, title: 'Multilingual Support', description: 'Communicate in 2 languages: English and Spanish.' },
  { icon: Image, title: 'Medical Image Generation', description: 'Generate visual aids and medical diagrams to better understand your health.' },
  { icon: Shield, title: 'Secure & Private', description: 'Your health data is encrypted and protected with enterprise-grade security.' },
];

// The CURA-X answer pipeline (target design)
const steps = [
  { icon: MessageSquare, title: 'Ask', text: 'Describe symptoms or ask a health question in plain language.' },
  { icon: Search, title: 'Retrieve', text: 'Relevant medical knowledge is gathered to ground the answer.' },
  { icon: ShieldCheck, title: 'Verify', text: 'The answer is scored for confidence and checked for safety.' },
  { icon: Lightbulb, title: 'Explain', text: 'You get the answer with sources and why it was given.' },
];

// Static product preview — mirrors the real chat response card
const HeroPreview = () => (
  <div className="relative">
    <div className="rounded-2xl border border-slate-200 bg-white shadow-xl shadow-slate-200/60 dark:border-slate-800 dark:bg-slate-900 dark:shadow-none overflow-hidden">
      <div className="flex items-center gap-1.5 px-4 h-10 border-b border-slate-100 dark:border-slate-800">
        <span className="w-2.5 h-2.5 rounded-full bg-slate-200 dark:bg-slate-700" />
        <span className="w-2.5 h-2.5 rounded-full bg-slate-200 dark:bg-slate-700" />
        <span className="w-2.5 h-2.5 rounded-full bg-slate-200 dark:bg-slate-700" />
        <span className="ml-3 text-xs text-slate-400">CURA-X chat</span>
      </div>
      <div className="p-5 space-y-4" aria-hidden>
        <div className="flex justify-end">
          <p className="rounded-2xl rounded-br-md bg-violet-600 text-white text-sm px-3.5 py-2 max-w-[80%]">I have a sore throat and mild fever. What can I do at home?</p>
        </div>
        <div className="rounded-2xl rounded-tl-md border border-slate-200 dark:border-slate-800 p-4 text-sm text-slate-700 dark:text-slate-300">
          <p className="font-semibold text-slate-900 dark:text-white">Home remedies:</p>
          <ul className="mt-1.5 space-y-1">
            {['Warm salt-water gargle 3–4× a day', 'Rest and plenty of fluids', 'Honey-lemon tea to soothe the throat'].map(t => (
              <li key={t} className="flex gap-2"><span className="mt-[7px] w-1.5 h-1.5 rounded-full bg-violet-500 flex-shrink-0" />{t}</li>
            ))}
          </ul>
          <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 flex flex-wrap gap-2">
            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 text-emerald-700 ring-1 ring-inset ring-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-300 dark:ring-emerald-500/30 px-2 py-0.5 text-xs font-medium">
              <ShieldCheck className="w-3 h-3" /> High confidence · 91%
            </span>
            <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300 px-2 py-0.5 text-xs"><BookOpen className="w-3 h-3" /> 2 sources</span>
            <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300 px-2 py-0.5 text-xs"><Lightbulb className="w-3 h-3" /> Why this answer?</span>
          </div>
        </div>
      </div>
    </div>
  </div>
);

const Home = () => (
  <div>
    {/* Hero */}
    <section className="pt-14 pb-16 sm:pt-20 sm:pb-24">
      <Container>
        <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">
          <div>
            <span className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-medium text-slate-600 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" /> AI health assistant
            </span>
            <h1 className="mt-5 text-4xl sm:text-5xl font-semibold tracking-tight leading-[1.1] text-slate-900 dark:text-white">
              Smarter healthcare, <span className="text-violet-600 dark:text-violet-400">powered by CURA-X</span>
            </h1>
            <p className="mt-5 text-lg text-slate-600 dark:text-slate-400 leading-relaxed max-w-xl">
              Cura is a lightweight multilingual medical LLM designed to bring healthcare AI to 2B+ people in 2 languages.
            </p>
            <div className="mt-8 flex flex-col sm:flex-row gap-3">
              <ButtonLink to="/chatbot" className="h-11 px-5">Try the assistant <ArrowRight className="w-4 h-4" /></ButtonLink>
              <ButtonLink to="/features" variant="secondary" className="h-11 px-5">Explore features</ButtonLink>
            </div>
            <ul className="mt-8 flex flex-wrap gap-x-6 gap-y-2 text-sm text-slate-500 dark:text-slate-400">
              {['Confidence on every answer', 'Cited sources', 'Plain-language explanations'].map(t => (
                <li key={t} className="flex items-center gap-1.5"><CheckCircle2 className="w-4 h-4 text-emerald-500" />{t}</li>
              ))}
            </ul>
          </div>
          <HeroPreview />
        </div>
      </Container>
    </section>

    {/* How it works */}
    <Section muted>
      <SectionHeading eyebrow="How it works" title="Answers you can understand and check" description="Every response follows the same transparent path, from your question to an explained answer." />
      <ol className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {steps.map((s, i) => (
          <li key={s.title} className="relative rounded-2xl border border-slate-200 dark:border-slate-800 p-5 bg-slate-50/60 dark:bg-slate-950/40">
            <div className="flex items-center gap-3">
              <IconTile icon={s.icon} size="sm" />
              <span className="text-xs font-medium text-slate-400">Step {i + 1}</span>
            </div>
            <h3 className="mt-4 font-semibold text-slate-900 dark:text-white">{s.title}</h3>
            <p className="mt-1.5 text-sm text-slate-600 dark:text-slate-400 leading-relaxed">{s.text}</p>
          </li>
        ))}
      </ol>
    </Section>

    {/* Features */}
    <Section>
      <SectionHeading eyebrow="Capabilities" title="Powerful features for better healthcare" description="Cura combines cutting-edge AI with medical expertise to provide personalized healthcare assistance." />
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
        {features.map((f) => (
          <Card key={f.title} hover>
            <IconTile icon={f.icon} />
            <h3 className="mt-4 text-base font-semibold text-slate-900 dark:text-white">{f.title}</h3>
            <p className="mt-1.5 text-sm text-slate-600 dark:text-slate-400 leading-relaxed">{f.description}</p>
          </Card>
        ))}
      </div>
    </Section>

    {/* CTA */}
    <Section className="pt-0">
      <CtaBand title="Ready to experience smarter healthcare?" description="Join thousands of users who trust Cura for their healthcare needs. Start your conversation today.">
        <ButtonLink to="/chatbot" className="h-11 px-5">Try CURA-X now <ArrowRight className="w-4 h-4" /></ButtonLink>
        <ButtonLink to="/use-cases" variant="secondary" className="h-11 px-5">See use cases</ButtonLink>
      </CtaBand>
    </Section>
  </div>
);

export default Home;
