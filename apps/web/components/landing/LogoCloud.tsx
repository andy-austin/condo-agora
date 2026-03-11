'use client';

import { MapPin } from "lucide-react";
import { useTranslations } from "next-intl";

export function LogoCloud() {
  const t = useTranslations('logoCloud');

  return (
    <section className="py-12 border-y border-border">
      <div className="container-tight">
        <div className="flex items-center justify-center gap-3 text-center">
          <MapPin className="w-4 h-4 text-primary shrink-0" />
          <p className="text-sm text-muted-foreground">
            {t('trustSignal')}
          </p>
        </div>
      </div>
    </section>
  );
}
