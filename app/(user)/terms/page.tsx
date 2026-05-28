import Link from "next/link";
import { ArrowLeft, FileText } from "lucide-react";

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-background pb-16">
      <div className="max-w-lg mx-auto px-4 pt-6 space-y-5">
        <div className="flex items-center gap-3">
          <Link
            href="/profile"
            className="flex h-8 w-8 items-center justify-center rounded-full hover:bg-muted transition-colors"
          >
            <ArrowLeft size={18} />
          </Link>
          <div className="flex items-center gap-2">
            <FileText size={18} className="text-primary" />
            <div>
              <h1 className="text-lg font-bold">Terms of Service</h1>
              <p className="text-xs text-muted-foreground">Last updated May 2026</p>
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-border bg-card px-6 py-5 space-y-5 text-sm leading-relaxed text-foreground">
          <Section title="1. Acceptance of Terms">
            By accessing or using TaxiFlow, you agree to be bound by these Terms of Service. If you do not agree to these terms, please do not use our service.
          </Section>

          <Section title="2. Use of Service">
            TaxiFlow provides a platform connecting passengers with minibus taxi routes in Ethiopia. You may use the service only for lawful purposes and in accordance with these terms. You are responsible for maintaining the confidentiality of your account credentials.
          </Section>

          <Section title="3. Trip Booking and Payments">
            Fares are calculated based on route distance and current pricing. Payments may be made by card or cash at the point of travel. All card payments are processed securely via Stripe. TaxiFlow is not responsible for payment disputes arising from incorrect fare information provided by third parties.
          </Section>

          <Section title="4. Location Services">
            TaxiFlow collects GPS location data during active trips to provide live tracking. Location data is used solely to support trip operations and is not sold to third parties. You may disable location sharing at any time, though this may limit service functionality.
          </Section>

          <Section title="5. User Conduct">
            You agree not to misuse the platform, including but not limited to: submitting false trip data, attempting to reverse-engineer the service, or using the platform to harass others. Violations may result in account suspension.
          </Section>

          <Section title="6. Intellectual Property">
            All content, trademarks, and software on TaxiFlow are owned by or licensed to TaxiFlow. You may not copy, modify, or redistribute any part of the service without prior written consent.
          </Section>

          <Section title="7. Limitation of Liability">
            TaxiFlow is provided on an &quot;as-is&quot; basis. We do not guarantee uninterrupted service availability. To the fullest extent permitted by law, TaxiFlow shall not be liable for indirect, incidental, or consequential damages arising from your use of the service.
          </Section>

          <Section title="8. Changes to Terms">
            We may update these terms at any time. Continued use of the service after changes are posted constitutes your acceptance of the revised terms. We will notify users of material changes via in-app announcement.
          </Section>

          <Section title="9. Governing Law">
            These terms are governed by the laws of the Federal Democratic Republic of Ethiopia. Any disputes shall be resolved in the courts of Addis Ababa.
          </Section>

          <Section title="10. Contact">
            For questions about these terms, contact us at{" "}
            <span className="text-primary">support@taxiflow.et</span>.
          </Section>
        </div>
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="font-semibold text-foreground mb-1">{title}</p>
      <p className="text-muted-foreground">{children}</p>
    </div>
  );
}
