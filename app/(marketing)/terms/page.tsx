import { FileText } from "lucide-react";

export default function TermsOfServicePage() {
  return (
    <div className="max-w-3xl mx-auto px-5 py-16 sm:py-24">
      <div className="flex items-center gap-3 mb-6">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
          <FileText className="h-5 w-5 text-primary" />
        </div>
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-foreground tracking-tight">
            Terms of Service
          </h1>
          <p className="text-xs text-muted-foreground mt-0.5">Last updated: March 1, 2026</p>
        </div>
      </div>

      <div className="prose-sm space-y-8 text-sm text-muted-foreground leading-relaxed">
        <section>
          <h2 className="text-base font-bold text-foreground mb-3">1. Acceptance of Terms</h2>
          <p>
            By accessing or using Onelinker (&quot;Service&quot;), you agree to be bound by these Terms of Service (&quot;Terms&quot;). If you are using the Service on behalf of an organization, you represent that you have authority to bind that organization to these Terms.
          </p>
        </section>

        <section>
          <h2 className="text-base font-bold text-foreground mb-3">2. Description of Service</h2>
          <p>
            Onelinker is a social media scheduling and management platform that allows users to:
          </p>
          <ul className="list-disc pl-5 space-y-1 mt-2">
            <li>Connect and manage multiple social media accounts</li>
            <li>Create, schedule, and publish content across platforms</li>
            <li>Use AI-powered tools for content generation</li>
            <li>Access analytics and performance insights</li>
            <li>Collaborate with team members across workspaces</li>
          </ul>
        </section>

        <section>
          <h2 className="text-base font-bold text-foreground mb-3">3. Account Registration</h2>
          <p>
            To use the Service, you must create an account with accurate and complete information. You are responsible for maintaining the security of your account credentials and for all activities that occur under your account. You must be at least 16 years of age to use the Service.
          </p>
        </section>

        <section>
          <h2 className="text-base font-bold text-foreground mb-3">4. Acceptable Use</h2>
          <p>You agree not to:</p>
          <ul className="list-disc pl-5 space-y-1 mt-2">
            <li>Use the Service for any unlawful purpose or to violate any laws</li>
            <li>Post content that infringes on intellectual property rights</li>
            <li>Distribute malware, spam, or harmful content through the Service</li>
            <li>Attempt to gain unauthorized access to the Service or other users&apos; accounts</li>
            <li>Use the Service to harass, abuse, or harm others</li>
            <li>Reverse engineer, decompile, or disassemble the Service</li>
            <li>Use automated means to access the Service beyond our provided API</li>
            <li>Resell or redistribute the Service without our written consent</li>
          </ul>
        </section>

        <section>
          <h2 className="text-base font-bold text-foreground mb-3">5. Content Ownership</h2>
          <p>
            You retain ownership of all content you create and publish through the Service. By using the Service, you grant us a limited license to store, process, and transmit your content solely for the purpose of providing the Service. We do not claim ownership over your content and will not use it for any purpose beyond delivering the Service.
          </p>
        </section>

        <section>
          <h2 className="text-base font-bold text-foreground mb-3">6. Plans & Billing</h2>
          <ul className="list-disc pl-5 space-y-1">
            <li><span className="text-foreground font-medium">Free Plan:</span> Available at no cost with feature limitations as described on our pricing page</li>
            <li><span className="text-foreground font-medium">Paid Plans:</span> Billed monthly or annually as selected at the time of purchase</li>
            <li><span className="text-foreground font-medium">Upgrades:</span> Take effect immediately; you will be charged a prorated amount</li>
            <li><span className="text-foreground font-medium">Downgrades:</span> Take effect at the end of the current billing period</li>
            <li><span className="text-foreground font-medium">Cancellation:</span> You may cancel at any time. Access continues until the end of the current billing period</li>
            <li><span className="text-foreground font-medium">Refunds:</span> We offer a 7-day refund policy for first-time paid plan subscriptions</li>
          </ul>
        </section>

        <section>
          <h2 className="text-base font-bold text-foreground mb-3">7. Third-Party Platforms</h2>
          <p>
            The Service integrates with third-party social media platforms. Your use of these platforms is subject to their respective terms of service and privacy policies. We are not responsible for the policies, practices, or availability of third-party platforms. Social media platform API changes may affect Service functionality, and we will make reasonable efforts to maintain integrations.
          </p>
        </section>

        <section>
          <h2 className="text-base font-bold text-foreground mb-3">8. AI-Generated Content</h2>
          <p>
            The Service includes AI-powered features for content generation. AI-generated content is provided as suggestions only. You are solely responsible for reviewing, editing, and approving all content before it is published. We do not guarantee the accuracy, originality, or appropriateness of AI-generated content.
          </p>
        </section>

        <section>
          <h2 className="text-base font-bold text-foreground mb-3">9. Service Availability</h2>
          <p>
            We strive for 99.9% uptime but do not guarantee uninterrupted access. Scheduled maintenance will be communicated in advance when possible. We are not liable for downtime caused by third-party platforms, force majeure events, or circumstances beyond our reasonable control.
          </p>
        </section>

        <section>
          <h2 className="text-base font-bold text-foreground mb-3">10. Limitation of Liability</h2>
          <p>
            To the maximum extent permitted by law, Onelinker shall not be liable for any indirect, incidental, special, consequential, or punitive damages, including loss of profits, data, or business opportunities, arising from your use of or inability to use the Service. Our total liability shall not exceed the amount you paid us in the 12 months preceding the claim.
          </p>
        </section>

        <section>
          <h2 className="text-base font-bold text-foreground mb-3">11. Termination</h2>
          <p>
            We may suspend or terminate your account if you violate these Terms. Upon termination, your right to use the Service ceases immediately. You may request an export of your data within 30 days of termination. We will delete your data in accordance with our Privacy Policy.
          </p>
        </section>

        <section>
          <h2 className="text-base font-bold text-foreground mb-3">12. Changes to Terms</h2>
          <p>
            We may modify these Terms at any time. Material changes will be communicated via email or through the Service at least 30 days in advance. Continued use of the Service after changes take effect constitutes acceptance.
          </p>
        </section>

        <section>
          <h2 className="text-base font-bold text-foreground mb-3">13. Contact</h2>
          <p>For questions about these Terms, contact us at:</p>
          <div className="mt-2 rounded-xl border border-border/40 bg-muted/10 p-4">
            <p className="text-foreground font-medium">Onelinker</p>
            <p>Email: <a href="mailto:legal@onelinker.ai" className="text-primary hover:underline">legal@onelinker.ai</a></p>
          </div>
        </section>
      </div>
    </div>
  );
}
