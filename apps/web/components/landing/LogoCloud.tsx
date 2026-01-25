'use client';

import { useTranslations } from "next-intl";

export function LogoCloud() {
  // These are client names, not translated
  const logos = [
    "Torres del Sol",
    "Residencial Pocitos",
    "Edificio Vista Mar",
    "Jardines del Prado",
    "Plaza Residencial"
  ];

  const t = useTranslations('logoCloud');

  return (
    <section className="py-16 border-y border-border">
      <div className="container-tight">
        <p className="text-center text-sm text-muted-foreground mb-8">
          {t('title')}
        </p>
        <div className="flex flex-wrap items-center justify-center gap-8 lg:gap-16">
          {logos.map((logo, index) => (
            <div
              key={index}
              className="text-lg font-semibold text-muted-foreground/50 hover:text-muted-foreground transition-colors"
            >
              {logo}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
