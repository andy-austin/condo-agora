'use client';

import { FileText, Vote, BarChart3, Users, Check } from "lucide-react";
import { useTranslations } from "next-intl";
import { useScrollReveal } from "@/hooks/useScrollReveal";

const featureKeys = ['proposals', 'voting', 'transparency', 'roles'] as const;
const featureIcons = {
  proposals: FileText,
  voting: Vote,
  transparency: BarChart3,
  roles: Users,
};

const featureAccents = {
  proposals: 'from-primary/10 to-orange-100/50',
  voting: 'from-rose-50 to-pink-100/30',
  transparency: 'from-emerald-50 to-teal-100/30',
  roles: 'from-violet-50 to-purple-100/30',
};

const featureIconColors = {
  proposals: 'bg-primary text-primary-foreground',
  voting: 'bg-rose-500 text-white',
  transparency: 'bg-emerald-500 text-white',
  roles: 'bg-violet-500 text-white',
};

export function FeaturesSection() {
  const t = useTranslations('features');
  const { ref, isVisible } = useScrollReveal<HTMLElement>();

  return (
    <section id="features" className="section-padding bg-[hsl(35,30%,96%)]" ref={ref}>
      <div className="container-tight">
        <div className={`text-center max-w-2xl mx-auto mb-16 scroll-reveal ${isVisible ? 'visible' : ''}`}>
          <span className="text-sm font-medium text-primary mb-4 block">{t('label')}</span>
          <h2 className="heading-lg mb-6">
            {t('title')}
          </h2>
          <p className="text-body">
            {t('description')}
          </p>
        </div>

        {/* Bento-style grid: first card emphasized */}
        <div className={`grid md:grid-cols-2 gap-5 stagger-children ${isVisible ? 'visible' : ''}`}>
          {featureKeys.map((key, index) => {
            const Icon = featureIcons[key];
            const benefits = t.raw(`items.${key}.benefits`) as string[];
            const isHero = index === 0;

            return (
              <div
                key={key}
                className={`group relative rounded-2xl border border-border/60 p-8 transition-all duration-300 hover:border-primary/30 hover:shadow-xl hover:shadow-primary/5 hover:-translate-y-1 overflow-hidden ${
                  isHero ? 'md:row-span-2 bg-gradient-to-br ' + featureAccents[key] : 'bg-card'
                }`}
              >
                {/* Subtle gradient overlay for non-hero cards */}
                {!isHero && (
                  <div className={`absolute inset-0 bg-gradient-to-br ${featureAccents[key]} opacity-0 group-hover:opacity-100 transition-opacity duration-500`} />
                )}

                <div className="relative z-10">
                  <div className={`w-12 h-12 rounded-xl flex items-center justify-center mb-6 transition-transform duration-300 group-hover:scale-110 ${featureIconColors[key]}`}>
                    <Icon className="w-5 h-5" />
                  </div>
                  <h3 className={`heading-md mb-3 ${isHero ? 'text-2xl' : ''}`}>{t(`items.${key}.title`)}</h3>
                  <p className={`text-muted-foreground mb-6 ${isHero ? 'text-base' : ''}`}>{t(`items.${key}.description`)}</p>
                  <ul className="space-y-2.5">
                    {benefits.map((benefit, i) => (
                      <li key={i} className="flex items-center gap-2.5 text-sm text-muted-foreground">
                        <div className="w-5 h-5 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                          <Check className="w-3 h-3 text-primary" />
                        </div>
                        {benefit}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
