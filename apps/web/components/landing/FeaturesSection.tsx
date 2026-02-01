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

export function FeaturesSection() {
  const t = useTranslations('features');
  const { ref, isVisible } = useScrollReveal<HTMLElement>();

  return (
    <section id="features" className="section-padding" ref={ref}>
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

        <div className={`grid md:grid-cols-2 gap-6 stagger-children ${isVisible ? 'visible' : ''}`}>
          {featureKeys.map((key) => {
            const Icon = featureIcons[key];
            const benefits = t.raw(`items.${key}.benefits`) as string[];

            return (
              <div
                key={key}
                className="card-minimal group"
              >
                <div className="icon-box mb-6 group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
                  <Icon className="w-5 h-5" />
                </div>
                <h3 className="heading-md mb-3">{t(`items.${key}.title`)}</h3>
                <p className="text-muted-foreground mb-6">{t(`items.${key}.description`)}</p>
                <ul className="space-y-2">
                  {benefits.map((benefit, i) => (
                    <li key={i} className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Check className="w-4 h-4 text-primary" />
                      {benefit}
                    </li>
                  ))}
                </ul>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
