import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ChevronLeft } from "lucide-react";

export default function PrivacyPolicyPage() {
  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-3xl mx-auto px-4 py-12">
        {/* Back Button */}
        <Link href="/">
          <Button variant="ghost" size="sm" className="mb-8 -ml-2">
            <ChevronLeft className="w-4 h-4 mr-1" />
            Back to Home
          </Button>
        </Link>

        {/* Header */}
        <h1 className="text-4xl font-bold tracking-tight mb-2">Privacy Policy</h1>
        <p className="text-muted-foreground mb-8">Effective Date: January 31, 2026</p>

        {/* Content */}
        <div className="prose prose-invert prose-sm max-w-none space-y-8">
          <p className="text-muted-foreground leading-relaxed">
            Welcome to SongFlow, operated by SongFlow Indonesia (&quot;we,&quot; &quot;us,&quot; &quot;our&quot;). We are committed to protecting your privacy and ensuring the security of your personal information. This Privacy Policy explains how we collect, use, and safeguard your data when you use our Service.
          </p>
          <p className="text-muted-foreground leading-relaxed">
            By accessing or using SongFlow, you consent to the practices described in this policy. If you do not agree with this policy, please refrain from using our Service.
          </p>

          <section>
            <h2 className="text-xl font-semibold mb-4">1. Information We Collect</h2>
            <p className="text-muted-foreground leading-relaxed">
              We collect the following types of data:
            </p>
            <ul className="list-disc list-inside text-muted-foreground space-y-2 mt-3">
              <li>
                <strong className="text-foreground">Account Information:</strong> When you log in via TikTok OAuth, we collect your TikTok username, profile picture, and user ID to identify your account.
              </li>
              <li>
                <strong className="text-foreground">Spotify Account Information:</strong> When you connect your Spotify account, we receive access tokens that allow us to control playback and queue songs on your behalf. We do not store your Spotify credentials.
              </li>
              <li>
                <strong className="text-foreground">TikTok Live Data:</strong> During your live streams, we receive gift events and viewer interactions (such as usernames) to process song requests.
              </li>
              <li>
                <strong className="text-foreground">Server Logs:</strong> We automatically collect and store server access logs, which may include IP addresses, browser information, and timestamps.
              </li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-4">2. How We Use Your Information</h2>
            <p className="text-muted-foreground leading-relaxed">
              We use your information for the following purposes:
            </p>
            <ul className="list-disc list-inside text-muted-foreground space-y-2 mt-3">
              <li>
                <strong className="text-foreground">Service Delivery:</strong> To authenticate you, connect to your TikTok Live sessions, and queue songs to your Spotify account based on viewer requests.
              </li>
              <li>
                <strong className="text-foreground">Session Management:</strong> To track active live sessions and manage song request queues during your streams.
              </li>
              <li>
                <strong className="text-foreground">Service Improvement:</strong> To analyze usage patterns and improve the functionality and reliability of SongFlow.
              </li>
              <li>
                <strong className="text-foreground">Technical Operations:</strong> Server logs are used for system administration, troubleshooting, and security monitoring.
              </li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-4">3. OAuth Authentication</h2>
            <p className="text-muted-foreground leading-relaxed">
              <strong className="text-foreground">TikTok OAuth:</strong> When you log in using TikTok, we access your basic profile information (username, display name, profile picture). We use this solely for authentication and displaying your profile within the app.
            </p>
            <p className="text-muted-foreground leading-relaxed mt-3">
              <strong className="text-foreground">Spotify OAuth:</strong> When you connect Spotify, we request permissions to view your account, control playback, and modify your playback queue. These permissions are necessary for the core functionality of song requests.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-4">4. Data Security</h2>
            <p className="text-muted-foreground leading-relaxed">
              We take the security of your data seriously. We implement reasonable and appropriate measures to protect your personal information from unauthorized access, disclosure, alteration, and destruction. This includes using HTTPS encryption for all data transmission and secure storage for authentication tokens.
            </p>
            <p className="text-muted-foreground leading-relaxed mt-3">
              However, no data transmission over the internet can be guaranteed to be 100% secure. While we strive to protect your data, we cannot guarantee its absolute security.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-4">5. Data Sharing and Disclosure</h2>
            <p className="text-muted-foreground leading-relaxed">
              We do not sell, trade, or rent your personal information to third parties. We may share your information only in the following circumstances:
            </p>
            <ul className="list-disc list-inside text-muted-foreground space-y-2 mt-3">
              <li>
                <strong className="text-foreground">Service Providers:</strong> We may share data with trusted third-party service providers who assist us in operating our Service (such as cloud hosting providers).
              </li>
              <li>
                <strong className="text-foreground">Legal Obligations:</strong> We may disclose your information if required by law, in response to a court order, or to comply with legal requirements under Indonesian law.
              </li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-4">6. Your Rights</h2>
            <p className="text-muted-foreground leading-relaxed">
              You have the following rights regarding your personal information:
            </p>
            <ul className="list-disc list-inside text-muted-foreground space-y-2 mt-3">
              <li>
                <strong className="text-foreground">Access:</strong> You can request access to the personal information we hold about you.
              </li>
              <li>
                <strong className="text-foreground">Correction:</strong> You can request corrections to inaccurate or incomplete personal information.
              </li>
              <li>
                <strong className="text-foreground">Deletion:</strong> You can request the deletion of your personal information. This will result in the termination of your SongFlow account.
              </li>
              <li>
                <strong className="text-foreground">Disconnect:</strong> You can disconnect your Spotify account at any time through your Spotify account settings.
              </li>
            </ul>
            <p className="text-muted-foreground leading-relaxed mt-3">
              To exercise these rights, please contact us at{" "}
              <a href="mailto:support@songflow.id" className="text-primary underline underline-offset-4 hover:text-primary/80">
                support@songflow.id
              </a>
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-4">7. Data Retention</h2>
            <p className="text-muted-foreground leading-relaxed">
              We retain your account information for as long as your account is active. TikTok Live session data (gift events, viewer interactions) is processed in real-time and not stored permanently. Server logs are retained for a limited period for security and operational purposes.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-4">8. Changes to This Policy</h2>
            <p className="text-muted-foreground leading-relaxed">
              We may update this Privacy Policy from time to time. We will notify you of any material changes by posting the updated policy on our website. Your continued use of SongFlow after any changes indicates your acceptance of the updated policy.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-4">9. Contact Us</h2>
            <p className="text-muted-foreground leading-relaxed">
              If you have any questions or concerns about this Privacy Policy, please contact us at:
            </p>
            <p className="text-muted-foreground leading-relaxed mt-3">
              Email:{" "}
              <a href="mailto:support@songflow.id" className="text-primary underline underline-offset-4 hover:text-primary/80">
                support@songflow.id
              </a>
            </p>
          </section>

          <div className="border-t border-border pt-8 mt-8">
            <p className="text-muted-foreground text-sm">
              Thank you for choosing SongFlow. We appreciate your trust in us and are committed to protecting your privacy and data.
            </p>
            <p className="text-muted-foreground text-sm mt-4">
              Last updated: January 31, 2026
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
