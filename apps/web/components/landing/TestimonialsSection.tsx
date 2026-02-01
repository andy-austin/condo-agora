'use client';

import { Star, Quote } from "lucide-react";
import { useTranslations } from "next-intl";
import { useScrollReveal } from "@/hooks/useScrollReveal";

const testimonialKeys = ['maria', 'carlos', 'ana'] as const;

// DiceBear avatar seeds - deterministic based on name
const avatarSeeds: Record<typeof testimonialKeys[number], string> = {
  maria: 'Maria-Gonzalez',
  carlos: 'Carlos-Rodriguez',
  ana: 'Ana-Martinez'
};

export function TestimonialsSection() {
  const t = useTranslations('testimonials');
  const { ref, isVisible } = useScrollReveal<HTMLElement>();

  return (
    <section
      id="testimonials"
      className="section-padding"
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

              <div className="flex gap-1 mb-4">
                {[...Array(5)].map((_, i) => (
                  <Star key={i} className="w-4 h-4 fill-primary text-primary" />
                ))}
              </div>

              <p className="text-foreground mb-6 leading-relaxed">
                &quot;{t(`items.${key}.quote`)}&quot;
              </p>

              <div className="flex items-center gap-3">
                {/* DiceBear Avatar */}
                <div className="relative w-12 h-12 rounded-full overflow-hidden ring-2 ring-primary/20 bg-muted">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${avatarSeeds[key]}&backgroundColor=f3f4f6`}
                    alt={t(`items.${key}.name`)}
                    width={48}
                    height={48}
                    className="w-full h-full object-cover"
                  />
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
