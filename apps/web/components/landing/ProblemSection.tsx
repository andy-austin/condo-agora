'use client';

import { MessageCircleX, Eye, Clock, ArrowRight } from "lucide-react";
import { useTranslations } from "next-intl";

const problemKeys = ['lost', 'transparency', 'slow'] as const;
const problemIcons = {
  lost: MessageCircleX,
  transparency: Eye,
  slow: Clock,
};

export function ProblemSection() {
  const t = useTranslations('problems');

  return (
    <section className="section-padding bg-muted/30">
      <div className="container-tight">
        <div className="grid lg:grid-cols-2 gap-16 items-center">
          <div>
            <span className="text-sm font-medium text-primary mb-4 block">{t('label')}</span>
            <h2 className="heading-lg mb-6">
              {t('title')}
            </h2>
            <p className="text-body mb-8">
              {t('description')}
            </p>
            <a href="#features" className="inline-flex items-center text-primary font-medium hover:underline">
              {t('cta')}
              <ArrowRight className="ml-2 w-4 h-4" />
            </a>
          </div>

          <div className="space-y-4">
            {problemKeys.map((key) => {
              const Icon = problemIcons[key];

              return (
                <div
                  key={key}
                  className="card-minimal flex items-start gap-4"
                >
                  <div className="icon-box shrink-0">
                    <Icon className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="heading-md mb-2">{t(`items.${key}.title`)}</h3>
                    <p className="text-muted-foreground">{t(`items.${key}.description`)}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}
