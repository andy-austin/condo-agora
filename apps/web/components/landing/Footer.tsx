'use client';

import { Mail } from "lucide-react";

const links = {
  product: [
    { label: "Características", href: "#features" },
    { label: "Precios", href: "#pricing" },
    { label: "Demo", href: "#demo" },
    { label: "Actualizaciones", href: "#updates" }
  ],
  company: [
    { label: "Acerca de", href: "#about" },
    { label: "Blog", href: "#blog" },
    { label: "Carreras", href: "#careers" },
    { label: "Contacto", href: "#contact" }
  ],
  legal: [
    { label: "Privacidad", href: "#privacy" },
    { label: "Términos", href: "#terms" },
    { label: "Cookies", href: "#cookies" }
  ]
};

export function Footer() {
  return (
    <footer className="border-t border-border">
      <div className="container-tight py-16">
        <div className="grid md:grid-cols-2 lg:grid-cols-5 gap-12">
          <div className="lg:col-span-2">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
                <span className="text-primary-foreground font-bold text-sm">C</span>
              </div>
              <span className="text-xl font-bold">Condo Ágora</span>
            </div>
            <p className="text-muted-foreground mb-6 max-w-sm">
              Decisiones claras, mejoras reales. La plataforma que transforma
              la gestión comunitaria de tu condominio.
            </p>
            <div className="space-y-2 text-sm text-muted-foreground">
              <a href="mailto:hola@condoagora.com.uy" className="flex items-center gap-2 hover:text-foreground transition-colors">
                <Mail className="w-4 h-4" />
                hola@condoagora.com.uy
              </a>
            </div>
          </div>

          <div>
            <h4 className="font-semibold mb-4">Producto</h4>
            <ul className="space-y-3">
              {links.product.map((link) => (
                <li key={link.label}>
                  <a
                    href={link.href}
                    className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {link.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h4 className="font-semibold mb-4">Empresa</h4>
            <ul className="space-y-3">
              {links.company.map((link) => (
                <li key={link.label}>
                  <a
                    href={link.href}
                    className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {link.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h4 className="font-semibold mb-4">Legal</h4>
            <ul className="space-y-3">
              {links.legal.map((link) => (
                <li key={link.label}>
                  <a
                    href={link.href}
                    className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {link.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="divider my-12" />

        <div className="flex flex-col md:flex-row items-center justify-between gap-4 text-sm text-muted-foreground">
          <p>© 2024 Condo Ágora. Todos los derechos reservados.</p>
          <p>Hecho con ❤️ para comunidades más unidas</p>
        </div>
      </div>
    </footer>
  );
}
