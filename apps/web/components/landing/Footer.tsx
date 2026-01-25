'use client';

import { Mail } from "lucide-react";
import { useTranslations } from "next-intl";

export function Footer() {
  const t = useTranslations('footer');

  const links = {
    product: [
      { labelKey: 'features', href: "#features" },
      { labelKey: 'pricing', href: "#pricing" },
      { labelKey: 'demo', href: "#demo" },
      { labelKey: 'updates', href: "#updates" }
    ],
    company: [
      { labelKey: 'about', href: "#about" },
      { labelKey: 'blog', href: "#blog" },
      { labelKey: 'careers', href: "#careers" },
      { labelKey: 'contact', href: "#contact" }
    ],
    legal: [
      { labelKey: 'privacy', href: "#privacy" },
      { labelKey: 'terms', href: "#terms" },
      { labelKey: 'cookies', href: "#cookies" }
    ]
  };

  return (
    <footer className="border-t border-border">
      <div className="container-tight py-16">
        <div className="grid md:grid-cols-2 lg:grid-cols-5 gap-12">
          <div className="lg:col-span-2">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
                <span className="text-primary-foreground font-bold text-sm">C</span>
              </div>
              <span className="text-xl font-bold">{t('brand')}</span>
            </div>
            <p className="text-muted-foreground mb-6 max-w-sm">
              {t('description')}
            </p>
            <div className="space-y-2 text-sm text-muted-foreground">
              <a href="mailto:hola@condoagora.com.uy" className="flex items-center gap-2 hover:text-foreground transition-colors">
                <Mail className="w-4 h-4" />
                hola@condoagora.com.uy
              </a>
            </div>
          </div>

          <div>
            <h4 className="font-semibold mb-4">{t('product')}</h4>
            <ul className="space-y-3">
              {links.product.map((link) => (
                <li key={link.labelKey}>
                  <a
                    href={link.href}
                    className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {t(`links.${link.labelKey}`)}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h4 className="font-semibold mb-4">{t('company')}</h4>
            <ul className="space-y-3">
              {links.company.map((link) => (
                <li key={link.labelKey}>
                  <a
                    href={link.href}
                    className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {t(`links.${link.labelKey}`)}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h4 className="font-semibold mb-4">{t('legal')}</h4>
            <ul className="space-y-3">
              {links.legal.map((link) => (
                <li key={link.labelKey}>
                  <a
                    href={link.href}
                    className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {t(`links.${link.labelKey}`)}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="divider my-12" />

        <div className="flex flex-col md:flex-row items-center justify-between gap-4 text-sm text-muted-foreground">
          <p>{t('copyright')}</p>
          <p>{t('tagline')}</p>
        </div>
      </div>
    </footer>
  );
}
