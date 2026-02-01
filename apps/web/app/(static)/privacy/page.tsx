import { Shield } from "lucide-react";

export default function PrivacyPage() {
  return (
    <div className="pt-32 pb-20">
      <div className="container-tight">
        <div className="max-w-2xl mx-auto text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-primary/10 text-primary mb-8">
            <Shield className="w-8 h-8" />
          </div>
          <h1 className="heading-lg mb-6">Privacy Policy</h1>
          <p className="text-body mb-8">
            This page is coming soon. We&apos;re preparing our privacy policy to ensure your data is protected.
          </p>
          <a href="/" className="btn-primary">
            Back to Home
          </a>
        </div>
      </div>
    </div>
  );
}
