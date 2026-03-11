'use client';

import { Quote } from "lucide-react";
import { useTranslations } from "next-intl";
import { useScrollReveal } from "@/hooks/useScrollReveal";

const testimonialKeys = ['maria', 'carlos', 'ana'] as const;

const avatarColors: Record<typeof testimonialKeys[number], string> = {
  maria: 'bg-primary/20 text-primary',
  carlos: 'bg-amber-100 text-amber-700',
  ana: 'bg-emerald-100 text-emerald-700',
};

export function TestimonialsSection() {
  const t = useTranslations('testimonials');
  const { ref, isVisible } = useScrollReveal<HTMLElement>();

  return (
    <section
      id="testimonials"
      className="section-padding bg-gradient-to-br from-amber-50/80 to-orange-50/50"
      ref={ref}
    >
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

        <div className={`grid md:grid-cols-3 gap-6 stagger-children ${isVisible ? 'visible' : ''}`}>
          {testimonialKeys.map((key) => (
            <div key={key} className="card-minimal relative">
              <Quote className="absolute top-6 right-6 w-8 h-8 text-primary/10" />

              <p className="text-foreground mb-6 leading-relaxed">
                &quot;{t(`items.${key}.quote`)}&quot;
              </p>

              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center font-semibold text-sm ${avatarColors[key]}`}>
                  {t(`items.${key}.name`).charAt(0)}
                </div>
                <div>
                  <p className="font-semibold">{t(`items.${key}.name`)}</p>
                  <p className="text-sm text-muted-foreground">{t(`items.${key}.role`)}</p>
                  <p className="text-sm text-muted-foreground">{t(`items.${key}.location`)}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
