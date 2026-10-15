import { PageHeader } from "@/components/domain/layout";
import { DataNote } from "@/components/domain/notes";

export const metadata = {
  title: "Terms of use",
  description: "The terms under which MandiLens is provided.",
};

export default function TermsPage() {
  return (
    <div className="container-page max-w-3xl space-y-6 py-10">
      <PageHeader eyebrow="Legal" title="Terms of use" />
      <DataNote>Last updated: October 2026. This is a template for a demonstration project.</DataNote>

      <section className="space-y-3 text-sm leading-relaxed text-muted-foreground">
        <h2 className="text-lg font-semibold text-foreground">1. Acceptance</h2>
        <p>
          By using MandiLens you agree to these terms. If you do not agree, do not use the service.
        </p>

        <h2 className="text-lg font-semibold text-foreground">2. Nature of the service</h2>
        <p>
          MandiLens provides estimated comparisons of agricultural market prices based on data from
          third-party sources and information you enter. It is a decision aid only. It does not
          provide financial, legal, or agronomic advice, and it does not guarantee any price or
          outcome.
        </p>

        <h2 className="text-lg font-semibold text-foreground">3. No warranty</h2>
        <p>
          The service is provided “as is” and “as available”, without warranties of any kind. Data may
          be incomplete, delayed, or inaccurate. You are responsible for verifying any information
          before acting on it.
        </p>

        <h2 className="text-lg font-semibold text-foreground">4. Acceptable use</h2>
        <p>
          You agree not to misuse the service, including by submitting unlawful, misleading, or
          infringing content in listings or inquiries, attempting to disrupt the service, or scraping
          it in a way that harms other users.
        </p>

        <h2 className="text-lg font-semibold text-foreground">5. User content</h2>
        <p>
          You are responsible for the content you submit (such as listings and inquiries). You grant
          MandiLens a licence to store and display that content in order to operate the service. You
          must not submit content you do not have the right to share.
        </p>

        <h2 className="text-lg font-semibold text-foreground">6. Third-party data</h2>
        <p>
          Prices may be sourced from third parties such as AGMARKNET via data.gov.in and are subject
          to their own licences and terms, including attribution requirements.
        </p>

        <h2 className="text-lg font-semibold text-foreground">7. Limitation of liability</h2>
        <p>
          To the maximum extent permitted by law, the maintainers are not liable for any loss arising
          from use of, or reliance on, the service.
        </p>

        <h2 className="text-lg font-semibold text-foreground">8. Changes</h2>
        <p>
          These terms may change. Continued use after changes constitutes acceptance of the revised
          terms.
        </p>
      </section>
    </div>
  );
}
