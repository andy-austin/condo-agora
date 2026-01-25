'use client';

import { ArrowRight, Play } from "lucide-react";
import Image from 'next/image';
import { useTranslations } from "next-intl";

export function HeroSection() {
  const t = useTranslations('hero');

  return (
    <section className="pt-32 lg:pt-40 pb-20 lg:pb-32 overflow-hidden">
      <div className="container-tight">
        <div className="max-w-4xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 text-primary text-sm font-medium mb-8">
            <span className="w-2 h-2 rounded-full bg-primary animate-pulse" />
            {t('badge')}
          </div>

          <h1 className="heading-xl mb-6">
            {t('headline1')}{" "}
            <span className="text-gradient">{t('headline2')}</span>
            <br />
            {t('headline3')}{" "}
            <span className="text-gradient">{t('headline4')}</span>
          </h1>

          <p className="text-body max-w-2xl mx-auto mb-10">
            {t('description')}
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-16">
            <button className="btn-primary">
              {t('ctaPrimary')}
              <ArrowRight className="ml-2 w-5 h-5" />
            </button>
            <button className="btn-outline">
              <Play className="mr-2 w-5 h-5" />
              {t('ctaSecondary')}
            </button>
          </div>

          <div className="relative">
            <div className="absolute inset-0 bg-gradient-to-t from-background via-transparent to-transparent z-10 pointer-events-none" />
            <div className="relative rounded-2xl border border-border overflow-hidden shadow-2xl shadow-primary/10">
              <div className="bg-muted/50 px-4 py-3 border-b border-border flex items-center gap-2">
                <div className="flex gap-1.5">
                  <div className="w-3 h-3 rounded-full bg-red-400" />
                  <div className="w-3 h-3 rounded-full bg-yellow-400" />
                  <div className="w-3 h-3 rounded-full bg-green-400" />
                </div>
                <div className="flex-1 text-center">
                  <span className="text-xs text-muted-foreground">{t('mockupUrl')}</span>
                </div>
              </div>
              <Image
                src="/app-mockup.png"
                alt={t('mockupAlt')}
                width={1200}
                height={800}
                className="w-full h-auto"
                priority
              />
            </div>
            <div className="absolute -bottom-4 left-1/2 -translate-x-1/2 w-3/4 h-20 bg-primary/20 blur-3xl rounded-full" />
          </div>
        </div>
      </div>
    </section>
  );
}
