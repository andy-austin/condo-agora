'use client';

import { ArrowRight, Building2, Users, Vote } from "lucide-react";
import Image from 'next/image';
import { useTranslations } from "next-intl";

export function HeroSection() {
  const t = useTranslations('hero');

  const stats = [
    { icon: Building2, value: '200+', labelKey: 'buildings', color: 'text-orange-500' },
    { icon: Users, value: '5,000+', labelKey: 'residents', color: 'text-amber-600' },
    { icon: Vote, value: '10,000+', labelKey: 'votes', color: 'text-rose-500' },
  ];

  return (
    <section className="relative pt-32 lg:pt-40 pb-20 lg:pb-32 overflow-hidden">
      {/* Warm gradient background */}
      <div
        className="absolute inset-0 -z-10"
        style={{
          background: 'linear-gradient(135deg, hsl(40, 30%, 97%) 0%, hsl(25, 60%, 95%) 50%, hsl(20, 40%, 93%) 100%)',
        }}
      />
      {/* Subtle noise texture overlay */}
      <div
        className="absolute inset-0 -z-10 opacity-[0.03]"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")`,
        }}
      />
      {/* Decorative gradient orbs */}
      <div className="absolute top-20 -left-32 w-96 h-96 bg-primary/10 rounded-full blur-3xl -z-10" />
      <div className="absolute bottom-20 -right-32 w-96 h-96 bg-amber-300/10 rounded-full blur-3xl -z-10" />

      <div className="container-tight">
        <div className="max-w-4xl mx-auto text-center hero-stagger">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/60 backdrop-blur-sm border border-white/40 text-primary text-sm font-medium mb-8 shadow-sm">
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

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-12">
            <button className="btn-primary bg-gradient-to-b from-primary to-orange-600">
              {t('ctaPrimary')}
              <ArrowRight className="ml-2 w-5 h-5" />
            </button>
            <a href="#features" className="btn-outline bg-white/50 backdrop-blur-sm hover:bg-white/80">
              {t('ctaSecondary')}
              <ArrowRight className="ml-2 w-5 h-5" />
            </a>
          </div>

          {/* Glass Stats Cards */}
          <div className="flex flex-wrap items-center justify-center gap-4 sm:gap-6 mb-16">
            {stats.map((stat) => {
              const Icon = stat.icon;
              return (
                <div
                  key={stat.labelKey}
                  className="flex items-center gap-3 px-5 py-3 rounded-2xl bg-white/60 backdrop-blur-sm border border-white/40 shadow-sm"
                >
                  <Icon className={`w-5 h-5 ${stat.color}`} />
                  <div className="text-left">
                    <p className="text-xl font-bold text-foreground font-display">{stat.value}</p>
                    <p className="text-xs text-muted-foreground">{t(`stats.${stat.labelKey}`)}</p>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Dashboard Mockup */}
          <div className="relative">
            <div className="absolute inset-0 bg-gradient-to-t from-background via-transparent to-transparent z-10 pointer-events-none" />
            <div className="relative rounded-2xl border border-border overflow-hidden shadow-2xl shadow-primary/10 rotate-[1deg] hover:rotate-0 transition-transform duration-500">
              <div className="bg-white/80 backdrop-blur-sm px-4 py-3 border-b border-border flex items-center gap-2">
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
            <div className="absolute -bottom-6 left-1/2 -translate-x-1/2 w-3/4 h-24 bg-primary/15 blur-3xl rounded-full" />
          </div>
        </div>
      </div>
    </section>
  );
}
