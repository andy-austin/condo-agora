'use client';

import { Star, Quote } from "lucide-react";

const testimonials = [
  {
    name: "María González",
    role: "Presidenta de Junta",
    location: "Torres del Sol, Montevideo",
    quote: "Condo Ágora transformó completamente nuestra comunicación. Las votaciones que antes llevaban semanas ahora se resuelven en días.",
    rating: 5
  },
  {
    name: "Carlos Rodríguez",
    role: "Residente",
    location: "Residencial Aurora, Punta del Este",
    quote: "Por fin puedo ver exactamente en qué se gasta la plata de la comunidad. La transparencia es increíble.",
    rating: 5
  },
  {
    name: "Ana Martínez",
    role: "Administradora",
    location: "Vista Mar, Colonia",
    quote: "Gestiono 3 edificios y esta herramienta me ahorra horas de trabajo cada semana. Indispensable.",
    rating: 5
  }
];

export function TestimonialsSection() {
  return (
    <section id="testimonials" className="section-padding">
      <div className="container-tight">
        <div className="text-center max-w-2xl mx-auto mb-16">
          <span className="text-sm font-medium text-primary mb-4 block">Testimonios</span>
          <h2 className="heading-lg mb-6">
            Lo que dicen nuestras comunidades
          </h2>
          <p className="text-body">
            Más de 200 edificios ya confían en Condo Ágora.
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-6">
          {testimonials.map((testimonial, index) => (
            <div key={index} className="card-minimal relative">
              <Quote className="absolute top-6 right-6 w-8 h-8 text-primary/10" />
              
              <div className="flex gap-1 mb-4">
                {[...Array(testimonial.rating)].map((_, i) => (
                  <Star key={i} className="w-4 h-4 fill-primary text-primary" />
                ))}
              </div>

              <p className="text-foreground mb-6 leading-relaxed">
                "{testimonial.quote}"
              </p>

              <div>
                <p className="font-semibold">{testimonial.name}</p>
                <p className="text-sm text-muted-foreground">{testimonial.role}</p>
                <p className="text-sm text-muted-foreground">{testimonial.location}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
