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
                className={`relative rounded-2xl p-8 transition-all duration-300 group ${
                  isPopular
                    ? 'bg-[hsl(25,15%,10%)] text-white ring-1 ring-primary/30 shadow-2xl shadow-primary/10'
                    : 'bg-card border border-border/60 hover:border-primary/30 hover:shadow-lg'
                }`}
              >
                {isPopular && (
                  <div className="absolute -top-3.5 left-1/2 -translate-x-1/2">
                    <span className="inline-flex items-center px-4 py-1.5 rounded-full bg-primary text-primary-foreground text-xs font-semibold tracking-wide uppercase shadow-lg shadow-primary/30">
                      {t('popular')}
                    </span>
                  </div>
                )}

                <div className="mb-6">
                  <h3 className={`text-xl font-semibold mb-2 ${isPopular ? 'text-white' : ''}`}>
                    {t(`tiers.${tier}.name`)}
                  </h3>
                  <p className={`text-sm ${isPopular ? 'text-white/60' : 'text-muted-foreground'}`}>
                    {t(`tiers.${tier}.description`)}
                  </p>
                </div>

                <div className="mb-8">
                  <span className={`text-5xl font-bold tracking-tight ${isPopular ? 'text-white' : ''}`}>
                    {t(`tiers.${tier}.price`)}
                  </span>
                  <span className={`text-sm ml-1 ${isPopular ? 'text-white/50' : 'text-muted-foreground'}`}>
                    {t(`tiers.${tier}.period`)}
                  </span>
                </div>

                <ul className="space-y-3 mb-8">
                  {features.map((feature, i) => (
                    <li key={i} className="flex items-start gap-3">
                      <div className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 mt-0.5 ${isPopular ? 'bg-primary/20' : 'bg-primary/10'}`}>
                        <Check className="w-3 h-3 text-primary" />
                      </div>
                      <span className={`text-sm ${isPopular ? 'text-white/80' : 'text-muted-foreground'}`}>
                        {feature}
                      </span>
                    </li>
                  ))}
                </ul>

                <button
                  className={`w-full inline-flex items-center justify-center px-6 py-3.5 text-sm font-semibold rounded-xl transition-all duration-300 active:scale-[0.98] ${
                    isPopular
                      ? 'bg-primary text-primary-foreground hover:bg-primary/90 shadow-lg shadow-primary/25 hover:shadow-xl hover:shadow-primary/30'
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
