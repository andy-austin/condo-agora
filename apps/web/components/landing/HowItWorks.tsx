'use client';

import { useTranslations } from "next-intl";
import { useScrollReveal } from "@/hooks/useScrollReveal";

const stepKeys = ['create', 'propose', 'vote', 'execute'] as const;

export function HowItWorks() {
  const t = useTranslations('howItWorks');
  const { ref, isVisible } = useScrollReveal<HTMLElement>();

  return (
    <section id="how-it-works" className="section-padding bg-muted/30" ref={ref}>
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
        <div className={`lg:hidden space-y-8 stagger-children ${isVisible ? 'visible' : ''}`}>
          {stepKeys.map((key, index) => (
            <div key={key} className="relative pl-8">
              {/* Vertical line */}
              {index < stepKeys.length - 1 && (
                <div className="absolute left-[11px] top-16 bottom-0 w-0.5 bg-gradient-to-b from-primary/30 to-transparent" />
              )}
              {/* Step number circle */}
              <div className="absolute left-0 top-0 w-6 h-6 rounded-full bg-primary/10 border-2 border-primary flex items-center justify-center">
                <span className="text-xs font-bold text-primary">{index + 1}</span>
              </div>
              <div>
                <div className="text-5xl font-bold text-primary/10 mb-2">
                  {t(`steps.${key}.number`)}
                </div>
                <h3 className="heading-md mb-2">{t(`steps.${key}.title`)}</h3>
                <p className="text-muted-foreground">{t(`steps.${key}.description`)}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Desktop: horizontal with arrows */}
        <div className={`hidden lg:grid lg:grid-cols-4 gap-8 stagger-children ${isVisible ? 'visible' : ''}`}>
          {stepKeys.map((key, index) => (
            <div key={key} className="relative">
              <div className="text-7xl font-bold text-primary/10 mb-4">
                {t(`steps.${key}.number`)}
              </div>
              <h3 className="heading-md mb-3">{t(`steps.${key}.title`)}</h3>
              <p className="text-muted-foreground">{t(`steps.${key}.description`)}</p>

              {/* Connecting arrow */}
              {index < stepKeys.length - 1 && (
                <div className="absolute top-12 left-full w-full flex items-center justify-center pointer-events-none">
                  <svg
                    className="w-16 h-6 text-primary/30"
                    viewBox="0 0 64 24"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    {/* Arrow line */}
                    <path
                      d="M0 12H56"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeDasharray="4 4"
                    />
                    {/* Arrow head */}
                    <path
                      d="M48 6L56 12L48 18"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
