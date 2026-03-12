'use client';

import { ArrowRight } from "lucide-react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { useScrollReveal } from "@/hooks/useScrollReveal";

export function CtaSection() {
  const t = useTranslations('cta');
  const { ref, isVisible } = useScrollReveal<HTMLElement>();

  return (
    <section className="section-padding" ref={ref}>
      <div className="container-tight">
        <div className={`relative overflow-hidden rounded-3xl bg-[hsl(25,15%,10%)] text-white p-12 lg:p-20 scroll-reveal ${isVisible ? 'visible' : ''}`}>
          {/* Decorative elements */}
          <div className="absolute inset-0 bg-gradient-to-br from-primary/15 via-transparent to-transparent" />
          <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-primary/8 rounded-full blur-[150px]" />
          <div className="absolute bottom-0 left-1/3 w-[300px] h-[300px] bg-amber-500/5 rounded-full blur-[100px]" />

          {/* Grid pattern overlay */}
          <div className="absolute inset-0 opacity-[0.03]">
            <svg width="100%" height="100%">
              <defs>
                <pattern id="cta-grid" width="40" height="40" patternUnits="userSpaceOnUse">
                  <path d="M 40 0 L 0 0 0 40" fill="none" stroke="white" strokeWidth="0.5" />
                </pattern>
              </defs>
              <rect width="100%" height="100%" fill="url(#cta-grid)" />
            </svg>
          </div>

          <div className="relative max-w-2xl">
            <h2 className="text-3xl lg:text-5xl font-bold mb-6" style={{ fontFamily: "'DM Serif Display', Georgia, serif" }}>
              {t('title')}
            </h2>
            <p className="text-lg text-white/60 mb-10 leading-relaxed">
              {t('description')}
            </p>
            <div className="flex flex-col sm:flex-row gap-4">
              <Link href="/login" className="btn-primary bg-white text-[hsl(25,15%,10%)] hover:bg-white/90 shadow-none hover:shadow-lg">
                {t('ctaPrimary')}
                <ArrowRight className="ml-2 w-5 h-5" />
              </Link>
              <button className="btn-outline border-white/20 text-white hover:bg-white/10 hover:border-white/40">
                {t('ctaSecondary')}
              </button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
