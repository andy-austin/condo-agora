'use client';

import { Star } from "lucide-react";
import { useTranslations } from "next-intl";
import { useScrollReveal } from "@/hooks/useScrollReveal";

const testimonialKeys = ['maria', 'carlos', 'ana'] as const;

const avatarGradients: Record<typeof testimonialKeys[number], string> = {
  maria: 'from-primary to-orange-400',
  carlos: 'from-amber-400 to-yellow-500',
  ana: 'from-emerald-400 to-teal-500',
};

export function TestimonialsSection() {
  const t = useTranslations('testimonials');
  const { ref, isVisible } = useScrollReveal<HTMLElement>();

  return (
    <section
      id="testimonials"
      className="section-padding bg-gradient-to-br from-amber-50/60 via-background to-orange-50/40 relative overflow-hidden"
      ref={ref}
    >
      {/* Subtle decorative */}
      <div className="absolute top-20 right-0 w-[300px] h-[300px] bg-primary/5 rounded-full blur-[100px]" />

      <div className="container-tight relative z-10">
        <div className={`text-center max-w-2xl mx-auto mb-16 scroll-reveal ${isVisible ? 'visible' : ''}`}>
          <span className="text-sm font-medium text-primary mb-4 block">{t('label')}</span>
          <h2 className="heading-lg mb-6">
            {t('title')}
          </h2>
          <p className="text-body">
            {t('description')}
          </p>
        </div>

        <div className={`grid md:grid-cols-3 gap-6 stagger-children ${isVisible ? 'visible' : ''}`}>
          {testimonialKeys.map((key) => (
            <div key={key} className="group bg-card border border-border/60 rounded-2xl p-8 transition-all duration-300 hover:border-primary/20 hover:shadow-lg hover:shadow-primary/5 hover:-translate-y-1">
              {/* Stars */}
              <div className="flex gap-1 mb-5">
                {[...Array(5)].map((_, i) => (
                  <Star key={i} className="w-4 h-4 fill-amber-400 text-amber-400" />
                ))}
              </div>

              <p className="text-foreground leading-relaxed mb-6">
                &quot;{t(`items.${key}.quote`)}&quot;
              </p>

              <div className="flex items-center gap-3 pt-4 border-t border-border/60">
                <div className={`w-10 h-10 rounded-full bg-gradient-to-br ${avatarGradients[key]} flex items-center justify-center font-semibold text-sm text-white shadow-sm`}>
                  {t(`items.${key}.name`).charAt(0)}
                </div>
                <div>
                  <p className="font-semibold text-sm">{t(`items.${key}.name`)}</p>
                  <p className="text-xs text-muted-foreground">{t(`items.${key}.role`)} · {t(`items.${key}.location`)}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
