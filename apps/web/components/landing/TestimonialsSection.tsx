'use client';

import { Star, Quote } from "lucide-react";
import { useTranslations } from "next-intl";

const testimonialKeys = ['maria', 'carlos', 'ana'] as const;

export function TestimonialsSection() {
  const t = useTranslations('testimonials');

  return (
    <section id="testimonials" className="section-padding">
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

        <div className="grid md:grid-cols-3 gap-6">
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

              <div>
                <p className="font-semibold">{t(`items.${key}.name`)}</p>
                <p className="text-sm text-muted-foreground">{t(`items.${key}.role`)}</p>
                <p className="text-sm text-muted-foreground">{t(`items.${key}.location`)}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
