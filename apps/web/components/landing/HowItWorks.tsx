'use client';

const steps = [
  {
    number: "01",
    title: "Creá tu comunidad",
    description: "Registrá tu edificio y agregá a todos los residentes en minutos."
  },
  {
    number: "02",
    title: "Proponé mejoras",
    description: "Cualquier miembro puede crear propuestas claras y estructuradas."
  },
  {
    number: "03",
    title: "Votá y decidí",
    description: "Sistema de votación democrático con resultados transparentes."
  },
  {
    number: "04",
    title: "Ejecutá y dale seguimiento",
    description: "Monitorea el progreso de las mejoras aprobadas."
  }
];

export function HowItWorks() {
  return (
    <section id="how-it-works" className="section-padding bg-muted/30">
      <div className="container-tight">
        <div className="text-center max-w-2xl mx-auto mb-16">
          <span className="text-sm font-medium text-primary mb-4 block">Cómo funciona</span>
          <h2 className="heading-lg mb-6">
            Simple, rápido y efectivo
          </h2>
          <p className="text-body">
            En cuatro simples pasos, transformá la gestión de tu comunidad.
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
          {steps.map((step, index) => (
            <div key={index} className="relative">
              <div className="text-7xl font-bold text-primary/10 mb-4">
                {step.number}
              </div>
              <h3 className="heading-md mb-3">{step.title}</h3>
              <p className="text-muted-foreground">{step.description}</p>
              
              {index < steps.length - 1 && (
                <div className="hidden lg:block absolute top-8 left-full w-full h-px bg-gradient-to-r from-border to-transparent" />
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
