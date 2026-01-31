import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ChevronLeft } from "lucide-react";

export default function TermsOfServicePage() {
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
        <h1 className="text-4xl font-bold tracking-tight mb-2">Terms of Service</h1>
        <p className="text-muted-foreground mb-8">Effective Date: January 31, 2026</p>

        {/* Content */}
        <div className="prose prose-invert prose-sm max-w-none space-y-8">
          <p className="text-muted-foreground leading-relaxed">
            Welcome to SongFlow! These Terms of Service (&quot;Terms&quot;) govern your use of the SongFlow website and services (&quot;Service&quot;). By accessing or using the Service, you agree to be bound by these Terms. If you do not agree to these Terms, please do not use the Service.
          </p>

          <section>
            <h2 className="text-xl font-semibold mb-4">1. Account Usage</h2>
            <p className="text-muted-foreground leading-relaxed">
              <strong className="text-foreground">1.1. Account Registration:</strong> To use SongFlow, you must authenticate using your TikTok account. You are responsible for maintaining the confidentiality of your account credentials and for all activities that occur under your account.
            </p>
            <p className="text-muted-foreground leading-relaxed mt-3">
              <strong className="text-foreground">1.2. Eligibility:</strong> You must be at least 13 years old to use our Service. By using SongFlow, you represent that you meet this age requirement.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-4">2. Use of Third-Party APIs</h2>
            <p className="text-muted-foreground leading-relaxed">
              <strong className="text-foreground">2.1. TikTok Integration:</strong> SongFlow connects to TikTok Live to receive gift events and viewer interactions. By using our Service, you acknowledge that we access TikTok data through available APIs to provide our functionality.
            </p>
            <p className="text-muted-foreground leading-relaxed mt-3">
              <strong className="text-foreground">2.2. Spotify Integration:</strong> SongFlow integrates with Spotify to queue and play songs. You must have a valid Spotify account to use the song request features. We are not affiliated with Spotify AB.
            </p>
            <p className="text-muted-foreground leading-relaxed mt-3">
              <strong className="text-foreground">2.3. Data Accuracy:</strong> While we strive to provide accurate and up-to-date functionality, we cannot guarantee the continuous availability of third-party services. Changes made by TikTok or Spotify to their APIs may affect our ability to provide the Service.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-4">3. Service Availability</h2>
            <p className="text-muted-foreground leading-relaxed">
              <strong className="text-foreground">3.1. Availability:</strong> SongFlow relies on TikTok and Spotify APIs to function correctly. We cannot guarantee uninterrupted access to the Service. We will make reasonable efforts to maintain availability but are not liable for downtime caused by third-party services.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-4">4. User Responsibilities</h2>
            <p className="text-muted-foreground leading-relaxed">
              <strong className="text-foreground">4.1. Compliance:</strong> Users agree to comply with all applicable laws and regulations of the Republic of Indonesia, as well as these Terms when using SongFlow.
            </p>
            <p className="text-muted-foreground leading-relaxed mt-3">
              <strong className="text-foreground">4.2. Acceptable Use:</strong> You agree not to use SongFlow for any illegal activities, to harass other users, or to violate the terms of service of TikTok or Spotify.
            </p>
            <p className="text-muted-foreground leading-relaxed mt-3">
              <strong className="text-foreground">4.3. Content:</strong> You are responsible for the content streamed through your TikTok Live sessions. SongFlow does not control or monitor the music played through your Spotify account.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-4">5. Termination</h2>
            <p className="text-muted-foreground leading-relaxed">
              <strong className="text-foreground">5.1. Suspension:</strong> SongFlow reserves the right to suspend or terminate access to users who violate these Terms or engage in prohibited activities, at our sole discretion.
            </p>
            <p className="text-muted-foreground leading-relaxed mt-3">
              <strong className="text-foreground">5.2. User Termination:</strong> You may stop using the Service at any time by disconnecting your accounts and ceasing to access SongFlow.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-4">6. Modifications to Terms</h2>
            <p className="text-muted-foreground leading-relaxed">
              SongFlow may update these Terms from time to time. Any changes will be effective upon posting the revised Terms on our website. Your continued use of the Service after any modifications indicates your acceptance of the updated Terms.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-4">7. Disclaimers and Limitations of Liability</h2>
            <p className="text-muted-foreground leading-relaxed">
              <strong className="text-foreground">7.1. No Warranty:</strong> SongFlow is provided &quot;as is&quot; without warranties of any kind, either express or implied. We do not warrant that the Service will be error-free or uninterrupted.
            </p>
            <p className="text-muted-foreground leading-relaxed mt-3">
              <strong className="text-foreground">7.2. Limitation of Liability:</strong> To the maximum extent permitted by law, SongFlow shall not be liable for any direct, indirect, incidental, consequential, or special damages arising from the use of the Service.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-4">8. Governing Law</h2>
            <p className="text-muted-foreground leading-relaxed">
              These Terms shall be governed by and construed in accordance with the laws of the Republic of Indonesia. Any disputes arising from these Terms shall be resolved through the appropriate courts in Indonesia.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-4">9. Contact Us</h2>
            <p className="text-muted-foreground leading-relaxed">
              If you have any questions about these Terms or SongFlow, please contact us at{" "}
              <a href="mailto:ebuntario@gmail.com" className="text-primary underline underline-offset-4 hover:text-primary/80">
                ebuntario@gmail.com
              </a>
            </p>
          </section>

          <div className="border-t border-border pt-8 mt-8">
            <p className="text-muted-foreground text-sm">
              By using SongFlow, you agree to these Terms of Service. If you do not agree with any part of these Terms, please refrain from using our Service.
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
