'use client';

import { useTranslations } from "next-intl";

export function LogoCloud() {
  // These are client names, not translated
  const logos = [
    "Torres del Sol",
    "Residencial Pocitos",
    "Edificio Vista Mar",
    "Jardines del Prado",
    "Plaza Residencial",
    "Mirador del Puerto",
    "Costa Azul",
    "Las Palmeras"
  ];

  const t = useTranslations('logoCloud');

  return (
    <section className="py-16 border-y border-border overflow-hidden">
      <div className="container-tight">
        <p className="text-center text-sm text-muted-foreground mb-8">
          {t('title')}
        </p>
      </div>

      {/* Infinite scroll container */}
      <div className="relative">
        {/* Gradient masks for smooth fade effect */}
        <div className="absolute left-0 top-0 bottom-0 w-32 bg-gradient-to-r from-background to-transparent z-10 pointer-events-none" />
        <div className="absolute right-0 top-0 bottom-0 w-32 bg-gradient-to-l from-background to-transparent z-10 pointer-events-none" />

        {/* Scrolling content */}
        <div className="flex logo-scroll">
          {/* First set of logos */}
          {logos.map((logo, index) => (
            <div
              key={`first-${index}`}
              className="flex-shrink-0 px-8 lg:px-12"
            >
              <span className="text-lg font-semibold text-muted-foreground/50 hover:text-muted-foreground transition-colors whitespace-nowrap">
                {logo}
              </span>
            </div>
          ))}
          {/* Duplicate set for seamless loop */}
          {logos.map((logo, index) => (
            <div
              key={`second-${index}`}
              className="flex-shrink-0 px-8 lg:px-12"
            >
              <span className="text-lg font-semibold text-muted-foreground/50 hover:text-muted-foreground transition-colors whitespace-nowrap">
                {logo}
              </span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
