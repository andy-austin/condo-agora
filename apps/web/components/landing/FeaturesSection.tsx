'use client';

import { FileText, Vote, BarChart3, Users, Check } from "lucide-react";

const features = [
  {
    icon: FileText,
    title: "Propuestas Centralizadas",
    description: "Todas las propuestas organizadas en un solo lugar. Fácil de crear, comentar y dar seguimiento.",
    benefits: ["Historial completo", "Comentarios organizados", "Notificaciones automáticas"]
  },
  {
    icon: Vote,
    title: "Votaciones por Prioridad",
    description: "Sistema de votación inteligente que permite priorizar las propuestas más importantes.",
    benefits: ["Votación anónima", "Resultados en tiempo real", "Múltiples métodos de votación"]
  },
  {
    icon: BarChart3,
    title: "Transparencia Total",
    description: "Reportes claros y accesibles para todos los miembros de la comunidad.",
    benefits: ["Dashboard en tiempo real", "Reportes exportables", "Auditoría completa"]
  },
  {
    icon: Users,
    title: "Roles y Delegación",
    description: "Gestión flexible de permisos para diferentes tipos de usuarios.",
    benefits: ["Roles personalizables", "Delegación de voto", "Control de acceso"]
  }
];

export function FeaturesSection() {
  return (
    <section id="features" className="section-padding">
      <div className="container-tight">
        <div className="text-center max-w-2xl mx-auto mb-16">
          <span className="text-sm font-medium text-primary mb-4 block">Características</span>
          <h2 className="heading-lg mb-6">
            Herramientas diseñadas para la armonía comunitaria
          </h2>
          <p className="text-body">
            Todo lo que necesitás para gestionar tu edificio de manera eficiente y transparente.
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          {features.map((feature, index) => (
            <div
              key={index}
              className="card-minimal group"
            >
              <div className="icon-box mb-6 group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
                <feature.icon className="w-5 h-5" />
              </div>
              <h3 className="heading-md mb-3">{feature.title}</h3>
              <p className="text-muted-foreground mb-6">{feature.description}</p>
              <ul className="space-y-2">
                {feature.benefits.map((benefit, i) => (
                  <li key={i} className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Check className="w-4 h-4 text-primary" />
                    {benefit}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
