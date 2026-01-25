'use client';

import { useTranslations } from "next-intl";

const stepKeys = ['create', 'propose', 'vote', 'execute'] as const;

export function HowItWorks() {
  const t = useTranslations('howItWorks');

  return (
    <section id="how-it-works" className="section-padding bg-muted/30">
      <div className="container-tight">
        <div className="text-center max-w-2xl mx-auto mb-16">
          <span className="text-sm font-medium text-primary mb-4 block">{t('label')}</span>
          <h2 className="heading-lg mb-6">
            {t('title')}
          </h2>
          <p className="text-body">
            {t('description')}
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
          {stepKeys.map((key, index) => (
            <div key={key} className="relative">
              <div className="text-7xl font-bold text-primary/10 mb-4">
                {t(`steps.${key}.number`)}
              </div>
              <h3 className="heading-md mb-3">{t(`steps.${key}.title`)}</h3>
              <p className="text-muted-foreground">{t(`steps.${key}.description`)}</p>

              {index < stepKeys.length - 1 && (
                <div className="hidden lg:block absolute top-8 left-full w-full h-px bg-gradient-to-r from-border to-transparent" />
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
