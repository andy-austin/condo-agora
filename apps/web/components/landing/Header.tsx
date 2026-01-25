'use client';

import { Button } from "@/components/ui/button";
import { Menu } from "lucide-react";
import { useState } from "react";

export function Header() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-lg border-b border-border">
      <div className="container-tight">
        <div className="flex items-center justify-between h-16 lg:h-20">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
              <span className="text-primary-foreground font-bold text-sm">C</span>
            </div>
            <span className="text-xl font-bold">Condo Ágora</span>
          </div>

          <nav className="hidden lg:flex items-center gap-8">
            <a href="#features" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">
              Características
            </a>
            <a href="#how-it-works" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">
              Cómo Funciona
            </a>
            <a href="#testimonials" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">
              Testimonios
            </a>
          </nav>

          <div className="hidden lg:flex items-center gap-4">
            <Button variant="ghost" className="text-sm font-medium">
              Iniciar Sesión
            </Button>
            <Button className="btn-primary text-sm py-2.5 px-6">
              Solicitar Demo
            </Button>
          </div>

          <button
            className="lg:hidden p-2"
            onClick={() => setIsOpen(!isOpen)}
          >
            <Menu className="w-6 h-6" />
          </button>
        </div>

        {isOpen && (
          <div className="lg:hidden py-4 border-t border-border">
            <nav className="flex flex-col gap-4">
              <a href="#features" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">
                Características
              </a>
              <a href="#how-it-works" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">
                Cómo Funciona
              </a>
              <a href="#testimonials" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">
                Testimonios
              </a>
              <div className="flex flex-col gap-2 pt-4">
                <Button variant="ghost" className="justify-start">
                  Iniciar Sesión
                </Button>
                <Button className="btn-primary">
                  Solicitar Demo
                </Button>
              </div>
            </nav>
          </div>
        )}
      </div>
    </header>
  );
}
