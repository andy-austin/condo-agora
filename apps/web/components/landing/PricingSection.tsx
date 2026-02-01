'use client';

import { Check, ArrowRight } from "lucide-react";
import { useTranslations } from "next-intl";
import { useScrollReveal } from "@/hooks/useScrollReveal";

const tierKeys = ['free', 'pro'] as const;

export function PricingSection() {
  const t = useTranslations('pricing');
  const { ref, isVisible } = useScrollReveal<HTMLElement>();

  return (
    <section id="pricing" className="section-padding bg-muted/30" ref={ref}>
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

        <div className={`grid md:grid-cols-2 gap-6 lg:gap-8 max-w-4xl mx-auto stagger-children ${isVisible ? 'visible' : ''}`}>
          {tierKeys.map((tier) => {
            const isPopular = tier === 'pro';
            const features = t.raw(`tiers.${tier}.features`) as string[];

            return (
              <div
                key={tier}
                className={`relative rounded-2xl p-8 transition-all duration-300 ${
                  isPopular
                    ? 'bg-foreground text-background ring-2 ring-primary shadow-2xl shadow-primary/20'
                    : 'bg-card border border-border hover:border-primary/30 hover:shadow-lg'
                }`}
              >
                {isPopular && (
                  <div className="absolute -top-4 left-1/2 -translate-x-1/2">
                    <span className="inline-flex items-center px-4 py-1.5 rounded-full bg-primary text-primary-foreground text-sm font-medium">
                      {t('popular')}
                    </span>
                  </div>
                )}

                <div className="mb-6">
                  <h3 className={`text-xl font-semibold mb-2 ${isPopular ? 'text-background' : ''}`}>
                    {t(`tiers.${tier}.name`)}
                  </h3>
                  <p className={`text-sm ${isPopular ? 'text-background/70' : 'text-muted-foreground'}`}>
                    {t(`tiers.${tier}.description`)}
                  </p>
                </div>

                <div className="mb-6">
                  <span className={`text-4xl font-bold ${isPopular ? 'text-background' : ''}`}>
                    {t(`tiers.${tier}.price`)}
                  </span>
                  <span className={`text-sm ${isPopular ? 'text-background/70' : 'text-muted-foreground'}`}>
                    {t(`tiers.${tier}.period`)}
                  </span>
                </div>

                <ul className="space-y-3 mb-8">
                  {features.map((feature, i) => (
                    <li key={i} className="flex items-start gap-3">
                      <Check className={`w-5 h-5 shrink-0 mt-0.5 ${isPopular ? 'text-primary' : 'text-primary'}`} />
                      <span className={`text-sm ${isPopular ? 'text-background/90' : 'text-muted-foreground'}`}>
                        {feature}
                      </span>
                    </li>
                  ))}
                </ul>

                <button
                  className={`w-full inline-flex items-center justify-center px-6 py-3 text-sm font-semibold rounded-full transition-all duration-300 ${
                    isPopular
                      ? 'bg-primary text-primary-foreground hover:bg-primary/90 shadow-lg shadow-primary/25'
                      : 'bg-foreground text-background hover:bg-foreground/90'
                  }`}
                >
                  {t(`tiers.${tier}.cta`)}
                  <ArrowRight className="ml-2 w-4 h-4" />
                </button>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
