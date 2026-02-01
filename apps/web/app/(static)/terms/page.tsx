import { FileText } from "lucide-react";

export default function TermsPage() {
  return (
    <div className="pt-32 pb-20">
      <div className="container-tight">
        <div className="max-w-2xl mx-auto text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-primary/10 text-primary mb-8">
            <FileText className="w-8 h-8" />
          </div>
          <h1 className="heading-lg mb-6">Terms of Service</h1>
          <p className="text-body mb-8">
            This page is coming soon. We&apos;re finalizing our terms of service.
          </p>
          <a href="/" className="btn-primary">
            Back to Home
          </a>
        </div>
      </div>
    </div>
  );
}
