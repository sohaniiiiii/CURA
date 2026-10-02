// Contact — UI v2. Previous version: project/legacy/pages/Contact.tsx
import React, { useState } from 'react';
import { Mail, MapPin, Phone, Send, Linkedin, Github, Twitter, MessageSquare, Clock, ChevronDown, ArrowRight } from 'lucide-react';
import { PageHeader, Section, SectionHeading, Card, IconTile, Field, Alert, btn, ButtonLink, CtaBand } from '../components/ui';

const contactInfo = [
  { icon: Mail, title: 'Email us', details: ['support@apollo-health.ai', 'partnerships@apollo-health.ai'], description: 'We typically respond within 24 hours' },
  { icon: MapPin, title: 'Visit us', details: ['123 Healthcare Innovation Blvd', 'San Francisco, CA 94105'], description: 'Our headquarters in the heart of Silicon Valley' },
  { icon: Phone, title: 'Call us', details: ['+1 (555) 123-4567', '+1 (800) APOLLO-1'], description: 'Available Monday - Friday, 9AM - 6PM PST' },
];

const socialLinks = [
  { icon: Linkedin, name: 'LinkedIn', url: '#' },
  { icon: Github, name: 'GitHub', url: '#' },
  { icon: Twitter, name: 'Twitter', url: '#' },
  { icon: MessageSquare, name: 'Discord', url: '#' },
];

const hours = [
  ['Monday – Friday', '9AM – 6PM PST'],
  ['Saturday', '10AM – 4PM PST'],
  ['Sunday', 'Closed'],
];

const faqItems = [
  { question: "How accurate are CURA's medical responses?", answer: 'CURA maintains 95%+ accuracy in medical responses, validated by healthcare professionals. However, it should supplement, not replace, professional medical advice.' },
  { question: 'Which languages does Cura support?', answer: 'Cura currently supports English and Spanish with plans to expand to more languages.' },
  { question: 'Is my health data secure?', answer: 'Yes, Cura uses enterprise-grade encryption and is HIPAA-compliant. Your data is encrypted in transit and at rest, and never shared without consent.' },
  { question: 'Can healthcare institutions integrate Cura?', answer: 'Absolutely! We offer enterprise solutions with custom integrations, API access, and specialized training for healthcare organizations.' },
];

const Contact = () => {
  const [formData, setFormData] = useState({ name: '', email: '', subject: '', message: '' });
  const [sent, setSent] = useState(false);
  const [openFaq, setOpenFaq] = useState<number | null>(0);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // No backend endpoint yet — same as before, just log. Now also confirms to the user.
    console.log('Contact form submitted:', formData);
    setSent(true);
    setFormData({ name: '', email: '', subject: '', message: '' });
  };

  return (
    <div>
      <PageHeader
        eyebrow="Contact"
        title="Get in touch"
        description="Have questions about Cura? Want to partner with us? We'd love to hear from you."
      />

      <Section>
        <div className="grid lg:grid-cols-3 gap-6">
          {/* Form */}
          <Card className="lg:col-span-2 p-6 sm:p-8">
            <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Send us a message</h2>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Fields marked * are required.</p>
            {sent && <div className="mt-5"><Alert tone="success">Thanks — your message has been recorded. We'll get back to you soon.</Alert></div>}
            <form onSubmit={handleSubmit} className="mt-6 space-y-5">
              <div className="grid sm:grid-cols-2 gap-5">
                <Field id="name" label="Full name *">
                  {(cls) => <input id="name" name="name" type="text" required autoComplete="name" value={formData.name} onChange={handleInputChange} className={cls} placeholder="Your full name" />}
                </Field>
                <Field id="email" label="Email address *">
                  {(cls) => <input id="email" name="email" type="email" required autoComplete="email" value={formData.email} onChange={handleInputChange} className={cls} placeholder="you@example.com" />}
                </Field>
              </div>
              <Field id="subject" label="Subject *">
                {(cls) => (
                  <select id="subject" name="subject" required value={formData.subject} onChange={handleInputChange} className={cls}>
                    <option value="">Select a subject</option>
                    <option value="general">General Inquiry</option>
                    <option value="support">Technical Support</option>
                    <option value="partnership">Partnership Opportunity</option>
                    <option value="enterprise">Enterprise Solutions</option>
                    <option value="feedback">Feedback & Suggestions</option>
                    <option value="media">Media & Press</option>
                  </select>
                )}
              </Field>
              <Field id="message" label="Message *">
                {(cls) => (
                  <textarea id="message" name="message" required rows={6} value={formData.message} onChange={handleInputChange}
                    className={`${cls} h-auto py-3 resize-y min-h-[140px]`} placeholder="Tell us how we can help you…" />
                )}
              </Field>
              <button type="submit" className={btn('primary', 'h-11 w-full sm:w-auto px-6')}>
                <Send className="w-4 h-4" /> Send message
              </button>
            </form>
          </Card>

          {/* Info */}
          <div className="space-y-4">
            {contactInfo.map((info) => (
              <Card key={info.title} className="p-5">
                <div className="flex items-center gap-3">
                  <IconTile icon={info.icon} size="sm" />
                  <h3 className="font-semibold text-slate-900 dark:text-white">{info.title}</h3>
                </div>
                <div className="mt-3 space-y-0.5 text-sm text-slate-700 dark:text-slate-300">
                  {info.details.map((d) => <p key={d}>{d}</p>)}
                </div>
                <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">{info.description}</p>
              </Card>
            ))}

            <Card className="p-5">
              <h3 className="font-semibold text-slate-900 dark:text-white flex items-center gap-2"><Clock className="w-4 h-4 text-slate-400" /> Office hours</h3>
              <dl className="mt-3 space-y-2 text-sm">
                {hours.map(([d, h]) => (
                  <div key={d} className="flex justify-between gap-4">
                    <dt className="text-slate-600 dark:text-slate-400">{d}</dt>
                    <dd className="text-slate-900 dark:text-slate-200 font-medium">{h}</dd>
                  </div>
                ))}
              </dl>
              <div className="mt-5 pt-4 border-t border-slate-100 dark:border-slate-800 flex gap-1">
                {socialLinks.map((s) => (
                  <a key={s.name} href={s.url} aria-label={s.name} title={s.name}
                    className="p-2 rounded-lg text-slate-500 hover:text-violet-700 hover:bg-violet-50 dark:text-slate-400 dark:hover:text-violet-300 dark:hover:bg-violet-500/10 transition-colors">
                    <s.icon className="w-4 h-4" />
                  </a>
                ))}
              </div>
            </Card>
          </div>
        </div>
      </Section>

      {/* FAQ accordion */}
      <Section muted>
        <SectionHeading eyebrow="FAQ" title="Frequently asked questions" />
        <div className="max-w-3xl mx-auto divide-y divide-slate-200 dark:divide-slate-800 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
          {faqItems.map((faq, i) => {
            const open = openFaq === i;
            return (
              <div key={faq.question}>
                <button
                  onClick={() => setOpenFaq(open ? null : i)}
                  aria-expanded={open}
                  className="w-full flex items-center justify-between gap-4 px-5 sm:px-6 py-4 text-left hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors first:rounded-t-2xl"
                >
                  <span className="font-medium text-slate-900 dark:text-white">{faq.question}</span>
                  <ChevronDown className={`w-4 h-4 flex-shrink-0 text-slate-400 transition-transform ${open ? 'rotate-180' : ''}`} />
                </button>
                {open && <p className="px-5 sm:px-6 pb-5 -mt-1 text-sm text-slate-600 dark:text-slate-400 leading-relaxed">{faq.answer}</p>}
              </div>
            );
          })}
        </div>
      </Section>

      <Section>
        <CtaBand title="Ready to transform healthcare together?" description="Whether you're a healthcare professional, researcher, or innovator, let's explore how Cura can advance your mission.">
          {/* OLD: non-functional <button>Schedule a Demo</button> */}
          <ButtonLink to="/chatbot" className="h-11 px-5">Try the live demo <ArrowRight className="w-4 h-4" /></ButtonLink>
        </CtaBand>
      </Section>
    </div>
  );
};

export default Contact;
