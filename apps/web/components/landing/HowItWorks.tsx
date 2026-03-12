'use client';

import { useTranslations } from "next-intl";
import { useScrollReveal } from "@/hooks/useScrollReveal";

const stepKeys = ['create', 'propose', 'vote', 'execute'] as const;

const stepColors = [
  'bg-primary text-primary-foreground',
  'bg-amber-500 text-white',
  'bg-rose-500 text-white',
  'bg-emerald-500 text-white',
];

export function HowItWorks() {
  const t = useTranslations('howItWorks');
  const { ref, isVisible } = useScrollReveal<HTMLElement>();

  return (
    <section id="how-it-works" className="section-padding" ref={ref}>
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

        {/* Mobile: vertical timeline */}
        <div className={`lg:hidden space-y-6 stagger-children ${isVisible ? 'visible' : ''}`}>
          {stepKeys.map((key, index) => (
            <div key={key} className="relative pl-12">
              {/* Vertical line */}
              {index < stepKeys.length - 1 && (
                <div className="absolute left-[15px] top-10 bottom-0 w-px bg-gradient-to-b from-border to-transparent" />
              )}
              {/* Step number */}
              <div className={`absolute left-0 top-0 w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${stepColors[index]}`}>
                {index + 1}
              </div>
              <div>
                <h3 className="heading-md mb-2">{t(`steps.${key}.title`)}</h3>
                <p className="text-muted-foreground">{t(`steps.${key}.description`)}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Desktop: horizontal with connected steps */}
        <div className={`hidden lg:grid lg:grid-cols-4 gap-0 stagger-children ${isVisible ? 'visible' : ''}`}>
          {stepKeys.map((key, index) => (
            <div key={key} className="relative px-6">
              {/* Connecting line */}
              {index < stepKeys.length - 1 && (
                <div className="absolute top-5 left-[calc(50%+24px)] right-0 h-px bg-border" />
              )}
              {index > 0 && (
                <div className="absolute top-5 left-0 right-[calc(50%+24px)] h-px bg-border" />
              )}

              <div className="relative text-center">
                {/* Step circle */}
                <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold mx-auto mb-6 relative z-10 ${stepColors[index]}`}>
                  {index + 1}
                </div>
                <h3 className="heading-md mb-3">{t(`steps.${key}.title`)}</h3>
                <p className="text-muted-foreground text-sm">{t(`steps.${key}.description`)}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
