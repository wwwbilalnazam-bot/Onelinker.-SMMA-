import { Shield } from "lucide-react";

export default function PrivacyPolicyPage() {
  return (
    <div className="max-w-3xl mx-auto px-5 py-16 sm:py-24">
      <div className="flex items-center gap-3 mb-6">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
          <Shield className="h-5 w-5 text-primary" />
        </div>
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-foreground tracking-tight">
            Privacy Policy
          </h1>
          <p className="text-xs text-muted-foreground mt-0.5">Last updated: March 1, 2026</p>
        </div>
      </div>

      <div className="prose-sm space-y-8 text-sm text-muted-foreground leading-relaxed">
        <section>
          <h2 className="text-base font-bold text-foreground mb-3">1. Introduction</h2>
          <p>
            Onelinker (&quot;we,&quot; &quot;our,&quot; or &quot;us&quot;) is committed to protecting your privacy. This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you use our social media scheduling platform, website, and related services (collectively, the &quot;Service&quot;).
          </p>
          <p className="mt-2">
            By accessing or using the Service, you agree to this Privacy Policy. If you do not agree, please do not use the Service.
          </p>
        </section>

        <section>
          <h2 className="text-base font-bold text-foreground mb-3">2. Information We Collect</h2>
          <p className="font-semibold text-foreground mb-2">Account Information</p>
          <ul className="list-disc pl-5 space-y-1">
            <li>Name, email address, and password when you create an account</li>
            <li>Billing information when you subscribe to a paid plan</li>
            <li>Profile information you choose to provide</li>
          </ul>

          <p className="font-semibold text-foreground mt-4 mb-2">Social Media Data</p>
          <ul className="list-disc pl-5 space-y-1">
            <li>Social media account credentials via OAuth (we never store your social media passwords)</li>
            <li>Content you create, schedule, or publish through our Service</li>
            <li>Analytics data from your connected social media accounts</li>
            <li>Profile information from connected platforms (username, avatar, follower counts)</li>
          </ul>

          <p className="font-semibold text-foreground mt-4 mb-2">Usage Data</p>
          <ul className="list-disc pl-5 space-y-1">
            <li>Log data (IP address, browser type, pages visited, time spent)</li>
            <li>Device information (operating system, device type)</li>
            <li>Cookies and similar tracking technologies</li>
          </ul>
        </section>

        <section>
          <h2 className="text-base font-bold text-foreground mb-3">3. How We Use Your Information</h2>
          <ul className="list-disc pl-5 space-y-1">
            <li>To provide, maintain, and improve the Service</li>
            <li>To schedule and publish content to your connected social media accounts</li>
            <li>To generate analytics and insights about your social media performance</li>
            <li>To provide AI-powered content suggestions and caption generation</li>
            <li>To process payments and manage subscriptions</li>
            <li>To send service-related communications (e.g., token expiry reminders)</li>
            <li>To respond to your requests and provide customer support</li>
            <li>To detect and prevent fraud, abuse, and security incidents</li>
          </ul>
        </section>

        <section>
          <h2 className="text-base font-bold text-foreground mb-3">4. Data Sharing & Disclosure</h2>
          <p>We do not sell your personal information. We may share data with:</p>
          <ul className="list-disc pl-5 space-y-1 mt-2">
            <li><span className="text-foreground font-medium">Social media platforms</span> — to publish and manage your content as instructed</li>
            <li><span className="text-foreground font-medium">Service providers</span> — for hosting, payment processing, email delivery, and analytics</li>
            <li><span className="text-foreground font-medium">Legal compliance</span> — when required by law, regulation, or legal process</li>
            <li><span className="text-foreground font-medium">Business transfers</span> — in connection with a merger, acquisition, or sale of assets</li>
          </ul>
        </section>

        <section>
          <h2 className="text-base font-bold text-foreground mb-3">5. Data Security</h2>
          <p>
            We implement industry-standard security measures including encryption in transit (TLS 1.3), encryption at rest, secure OAuth authentication, regular security audits, and access controls. While no system is 100% secure, we are committed to protecting your data to the highest standards.
          </p>
        </section>

        <section>
          <h2 className="text-base font-bold text-foreground mb-3">6. Data Retention</h2>
          <p>
            We retain your data for as long as your account is active or as needed to provide the Service. When you delete your account, we will delete your personal data within 30 days, except where we are required to retain it for legal or compliance purposes.
          </p>
        </section>

        <section>
          <h2 className="text-base font-bold text-foreground mb-3">7. Your Rights</h2>
          <p>Depending on your location, you may have the right to:</p>
          <ul className="list-disc pl-5 space-y-1 mt-2">
            <li>Access, correct, or delete your personal data</li>
            <li>Export your data in a portable format</li>
            <li>Opt out of marketing communications</li>
            <li>Withdraw consent where applicable</li>
            <li>Lodge a complaint with a data protection authority</li>
          </ul>
          <p className="mt-2">
            To exercise these rights, contact us at <a href="mailto:privacy@onelinker.ai" className="text-primary hover:underline">privacy@onelinker.ai</a>.
          </p>
        </section>

        <section>
          <h2 className="text-base font-bold text-foreground mb-3">8. Cookies</h2>
          <p>
            We use essential cookies required for the Service to function, and optional analytics cookies to understand usage patterns. You can manage cookie preferences in your browser settings.
          </p>
        </section>

        <section>
          <h2 className="text-base font-bold text-foreground mb-3">9. Children&apos;s Privacy</h2>
          <p>
            The Service is not intended for users under 16 years of age. We do not knowingly collect personal information from children.
          </p>
        </section>

        <section>
          <h2 className="text-base font-bold text-foreground mb-3">10. Changes to This Policy</h2>
          <p>
            We may update this Privacy Policy from time to time. We will notify you of material changes by posting the updated policy on this page and updating the &quot;Last updated&quot; date.
          </p>
        </section>

        <section>
          <h2 className="text-base font-bold text-foreground mb-3">11. Contact Us</h2>
          <p>
            If you have questions about this Privacy Policy or our data practices, contact us at:
          </p>
          <div className="mt-2 rounded-xl border border-border/40 bg-muted/10 p-4">
            <p className="text-foreground font-medium">Onelinker</p>
            <p>Email: <a href="mailto:privacy@onelinker.ai" className="text-primary hover:underline">privacy@onelinker.ai</a></p>
          </div>
        </section>
      </div>
    </div>
  );
}
