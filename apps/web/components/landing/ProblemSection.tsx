'use client';

import { MessageCircleX, Eye, Clock, ArrowRight } from "lucide-react";
import { useTranslations } from "next-intl";
import { useScrollReveal } from "@/hooks/useScrollReveal";

const problemKeys = ['lost', 'transparency', 'slow'] as const;
const problemIcons = {
  lost: MessageCircleX,
  transparency: Eye,
  slow: Clock,
};

export function ProblemSection() {
  const t = useTranslations('problems');
  const { ref, isVisible } = useScrollReveal<HTMLElement>();

  return (
    <section className="section-padding bg-[hsl(25,15%,10%)] text-white relative overflow-hidden" ref={ref}>
      {/* Decorative gradient */}
      <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-primary/5 rounded-full blur-[150px] -z-0" />
      <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-amber-500/5 rounded-full blur-[100px] -z-0" />

      <div className="container-tight relative z-10">
        <div className="grid lg:grid-cols-2 gap-16 items-center">
          <div className={`scroll-reveal-left ${isVisible ? 'visible' : ''}`}>
            <span className="text-sm font-medium text-primary mb-4 block">{t('label')}</span>
            <h2 className="heading-lg mb-6">
              {t('title')}
            </h2>
            <p className="text-lg text-white/60 leading-relaxed mb-8">
              {t('description')}
            </p>
            <a href="#features" className="inline-flex items-center gap-2 text-primary font-medium hover:gap-3 transition-all">
              {t('cta')}
              <ArrowRight className="w-4 h-4" />
            </a>
          </div>

          <div className={`space-y-4 stagger-children ${isVisible ? 'visible' : ''}`}>
            {problemKeys.map((key, index) => {
              const Icon = problemIcons[key];

              return (
                <div
                  key={key}
                  className="flex items-start gap-4 bg-white/[0.04] border border-white/[0.06] rounded-2xl p-6 backdrop-blur-sm hover:bg-white/[0.06] hover:border-white/[0.1] transition-all duration-300 group"
                >
                  <div className="w-10 h-10 rounded-xl bg-primary/15 flex items-center justify-center shrink-0 group-hover:bg-primary/20 transition-colors">
                    <Icon className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <h3 className="heading-md mb-2 text-white">{t(`items.${key}.title`)}</h3>
                    <p className="text-white/50 leading-relaxed">{t(`items.${key}.description`)}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}
