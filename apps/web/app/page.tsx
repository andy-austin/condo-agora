import { Header } from "@/components/landing/Header";
import { HeroSection } from "@/components/landing/HeroSection";
import { LogoCloud } from "@/components/landing/LogoCloud";
import { ProblemSection } from "@/components/landing/ProblemSection";
import { FeaturesSection } from "@/components/landing/FeaturesSection";
import { HowItWorks } from "@/components/landing/HowItWorks";
import { TestimonialsSection } from "@/components/landing/TestimonialsSection";
import { CtaSection } from "@/components/landing/CtaSection";
import { Footer } from "@/components/landing/Footer";

export default function Home() {
  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main>
        <HeroSection />
        <LogoCloud />
        <ProblemSection />
        <FeaturesSection />
        <HowItWorks />
        <TestimonialsSection />
        <CtaSection />
      </main>
      <Footer />
    </div>
  );
}