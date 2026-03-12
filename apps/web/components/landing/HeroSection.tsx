'use client';

import { ArrowRight, Building2, Users, Vote } from "lucide-react";
import Image from 'next/image';
import Link from 'next/link';
import { useTranslations } from "next-intl";

export function HeroSection() {
  const t = useTranslations('hero');

  const stats = [
    { icon: Building2, value: '200+', labelKey: 'buildings', color: 'text-primary' },
    { icon: Users, value: '5,000+', labelKey: 'residents', color: 'text-amber-600' },
    { icon: Vote, value: '10,000+', labelKey: 'votes', color: 'text-rose-500' },
  ];

  return (
    <section className="relative pt-28 lg:pt-36 pb-20 lg:pb-28 overflow-hidden">
      {/* Background */}
      <div
        className="absolute inset-0 -z-10"
        style={{
          background: 'linear-gradient(160deg, hsl(40, 30%, 97%) 0%, hsl(25, 60%, 95%) 40%, hsl(20, 40%, 93%) 100%)',
        }}
      />
      <div
        className="absolute inset-0 -z-10 opacity-[0.03]"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")`,
        }}
      />
      <div className="absolute top-10 -left-40 w-[500px] h-[500px] bg-primary/8 rounded-full blur-[120px] -z-10" />
      <div className="absolute bottom-0 -right-40 w-[500px] h-[500px] bg-amber-300/8 rounded-full blur-[120px] -z-10" />

      <div className="container-tight">
        <div className="grid lg:grid-cols-12 gap-12 lg:gap-8 items-center">
          {/* Left: Text content */}
          <div className="lg:col-span-6 xl:col-span-5 hero-stagger">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/70 backdrop-blur-sm border border-white/50 text-primary text-sm font-medium mb-8 shadow-sm">
              <span className="w-2 h-2 rounded-full bg-primary animate-pulse" />
              {t('badge')}
            </div>

            <h1 className="heading-xl mb-6 !text-4xl sm:!text-5xl lg:!text-6xl xl:!text-[4.25rem]">
              {t('headline1')}{" "}
              <span className="text-gradient">{t('headline2')}</span>
              <br className="hidden sm:block" />
              {t('headline3')}{" "}
              <span className="text-gradient">{t('headline4')}</span>
            </h1>

            <p className="text-body max-w-lg mb-8">
              {t('description')}
            </p>

            <div className="flex flex-col sm:flex-row items-start gap-3 mb-12">
              <Link href="/login" className="btn-primary bg-gradient-to-b from-primary to-orange-600">
                {t('ctaPrimary')}
                <ArrowRight className="ml-2 w-5 h-5" />
              </Link>
              <a href="#features" className="btn-outline bg-white/50 backdrop-blur-sm hover:bg-white/80">
                {t('ctaSecondary')}
              </a>
            </div>

            {/* Stats row */}
            <div className="flex flex-wrap items-center gap-6">
              {stats.map((stat, i) => {
                const Icon = stat.icon;
                return (
                  <div key={stat.labelKey} className="flex items-center gap-3">
                    {i > 0 && <div className="w-px h-8 bg-border hidden sm:block" />}
                    <div className={`flex items-center gap-2 ${i > 0 ? 'sm:pl-6' : ''}`}>
                      <Icon className={`w-4 h-4 ${stat.color}`} />
                      <div>
                        <p className="text-lg font-bold text-foreground leading-none">{stat.value}</p>
                        <p className="text-xs text-muted-foreground">{t(`stats.${stat.labelKey}`)}</p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Right: Dashboard Mockup */}
          <div className="lg:col-span-6 xl:col-span-7 hero-stagger">
            <div className="relative lg:translate-x-4 xl:translate-x-8">
              {/* Glow behind mockup */}
              <div className="absolute -inset-8 bg-gradient-to-br from-primary/10 via-transparent to-amber-300/10 rounded-3xl blur-2xl -z-10" />

              <div className="relative rounded-2xl border border-border/60 overflow-hidden shadow-2xl shadow-black/10 lg:rotate-[1.5deg] hover:rotate-0 transition-transform duration-700">
                {/* Browser chrome */}
                <div className="bg-white/90 backdrop-blur-sm px-4 py-3 border-b border-border/60 flex items-center gap-2">
                  <div className="flex gap-1.5">
                    <div className="w-3 h-3 rounded-full bg-red-400/80" />
                    <div className="w-3 h-3 rounded-full bg-yellow-400/80" />
                    <div className="w-3 h-3 rounded-full bg-green-400/80" />
                  </div>
                  <div className="flex-1 text-center">
                    <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-md bg-muted/50 text-xs text-muted-foreground">
                      <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                        <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                      </svg>
                      {t('mockupUrl')}
                    </div>
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

              {/* Floating shadow */}
              <div className="absolute -bottom-6 left-1/2 -translate-x-1/2 w-3/4 h-16 bg-primary/10 blur-3xl rounded-full" />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
