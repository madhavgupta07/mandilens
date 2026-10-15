import { PageHeader } from "@/components/domain/layout";
import { DataNote } from "@/components/domain/notes";

export const metadata = {
  title: "Privacy policy",
  description: "What data MandiLens stores and how it is used.",
};

export default function PrivacyPage() {
  return (
    <div className="container-page max-w-3xl space-y-6 py-10">
      <PageHeader eyebrow="Legal" title="Privacy policy" />
      <DataNote>Last updated: October 2026. This is a template for a demonstration project.</DataNote>

      <section className="space-y-3 text-sm leading-relaxed text-muted-foreground">
        <h2 className="text-lg font-semibold text-foreground">1. What we collect</h2>
        <ul className="list-inside list-disc space-y-1">
          <li>Account details you provide: name, email, and a hashed password.</li>
          <li>Optional profile details such as your state and district.</li>
          <li>Content you create: listings, inquiries, alerts, watchlists and saved comparisons.</li>
          <li>Basic operational data such as request timestamps and an audit trail of sensitive actions.</li>
        </ul>

        <h2 className="text-lg font-semibold text-foreground">2. How we use it</h2>
        <p>
          To operate your account, show your content to the people you interact with (for example, the
          counterparty in an inquiry), personalise the app to your region, and keep the service secure.
        </p>

        <h2 className="text-lg font-semibold text-foreground">3. Cookies</h2>
        <p>
          We use a single httpOnly session cookie to keep you signed in. It is not used for
          advertising or cross-site tracking.
        </p>

        <h2 className="text-lg font-semibold text-foreground">4. AI processing</h2>
        <p>
          When you use the AI Copilot, your message and the tool results needed to answer it are sent
          to the configured model provider. If a local Ollama model is configured, no data leaves your
          machine. We do not use your conversations to train models.
        </p>

        <h2 className="text-lg font-semibold text-foreground">5. Sharing</h2>
        <p>
          We do not sell your personal data. Data is shared only with the infrastructure needed to run
          the service (database, hosting, and any AI provider you configure) and where required by law.
        </p>

        <h2 className="text-lg font-semibold text-foreground">6. Retention & deletion</h2>
        <p>
          We keep your data while your account is active. You can request deletion of your account and
          associated content by contacting the maintainers.
        </p>

        <h2 className="text-lg font-semibold text-foreground">7. Security</h2>
        <p>
          Passwords are hashed with bcrypt and sessions use signed tokens. No system is perfectly
          secure; please use a unique password.
        </p>

        <h2 className="text-lg font-semibold text-foreground">8. Contact</h2>
        <p>Questions and deletion requests can be raised through the project repository issues.</p>
      </section>
    </div>
  );
}
