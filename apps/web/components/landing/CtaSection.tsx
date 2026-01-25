'use client';

import { ArrowRight } from "lucide-react";

export function CtaSection() {
  return (
    <section className="section-padding">
      <div className="container-tight">
        <div className="relative overflow-hidden rounded-3xl bg-foreground text-background p-12 lg:p-20">
          <div className="absolute inset-0 bg-gradient-to-br from-primary/20 via-transparent to-transparent" />
          <div className="absolute top-0 right-0 w-96 h-96 bg-primary/10 rounded-full blur-3xl" />
          
          <div className="relative max-w-2xl">
            <h2 className="text-3xl lg:text-5xl font-bold mb-6">
              ¿Listo para transformar la gestión de tu edificio?
            </h2>
            <p className="text-lg text-background/70 mb-8">
              Unite a las comunidades que ya están tomando decisiones de forma 
              más inteligente y transparente.
            </p>
            <div className="flex flex-col sm:flex-row gap-4">
              <button className="btn-primary bg-background text-foreground hover:bg-background/90">
                Solicitar Demo Gratuita
                <ArrowRight className="ml-2 w-5 h-5" />
              </button>
              <button className="btn-outline border-background/30 text-background hover:bg-background/10 hover:border-background">
                Hablar con Ventas
              </button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
