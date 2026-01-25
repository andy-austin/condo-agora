'use client';

import { MessageCircleX, Eye, Clock, ArrowRight } from "lucide-react";

const problems = [
  {
    icon: MessageCircleX,
    title: "Propuestas perdidas",
    description: "Las ideas importantes se pierden en el caos de los grupos de WhatsApp."
  },
  {
    icon: Eye,
    title: "Falta de transparencia",
    description: "Decisiones sin consultar a todos generan desconfianza."
  },
  {
    icon: Clock,
    title: "Procesos lentos",
    description: "Meses de debates sin llegar a acuerdos concretos."
  }
];

export function ProblemSection() {
  return (
    <section className="section-padding bg-muted/30">
      <div className="container-tight">
        <div className="grid lg:grid-cols-2 gap-16 items-center">
          <div>
            <span className="text-sm font-medium text-primary mb-4 block">El problema</span>
            <h2 className="heading-lg mb-6">
              ¿Cansado de los debates eternos en el grupo de chat?
            </h2>
            <p className="text-body mb-8">
              Los edificios enfrentan problemas de comunicación que afectan 
              la armonía y el progreso de la comunidad. Es hora de cambiar.
            </p>
            <a href="#features" className="inline-flex items-center text-primary font-medium hover:underline">
              Descubrí la solución
              <ArrowRight className="ml-2 w-4 h-4" />
            </a>
          </div>

          <div className="space-y-4">
            {problems.map((problem, index) => (
              <div
                key={index}
                className="card-minimal flex items-start gap-4"
              >
                <div className="icon-box shrink-0">
                  <problem.icon className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="heading-md mb-2">{problem.title}</h3>
                  <p className="text-muted-foreground">{problem.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
