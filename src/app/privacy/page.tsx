import Link from "next/link";

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mb-8">
      <h2 className="text-[#c9a050] text-lg font-semibold mb-3">{title}</h2>
      {children}
    </section>
  );
}

function Body({ children }: { children: React.ReactNode }) {
  return <p className="text-gray-400 text-sm leading-6 mb-3">{children}</p>;
}

function Bullet({ children }: { children: React.ReactNode }) {
  return <li className="text-gray-500 text-sm leading-6">{children}</li>;
}

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-[#111]">
      <div className="max-w-2xl mx-auto px-6 py-16">

        <Link href="/" className="text-xs text-gray-600 hover:text-gray-400 transition-colors mb-8 block">
          ← Home
        </Link>

        <h1 className="font-[family-name:var(--font-fredericka)] text-3xl text-[#c9a050] mb-1">
          Privacy Policy
        </h1>
        <p className="text-gray-600 text-sm mb-10">Last Updated: July 2026</p>

        <Body>
          ShaveSplash ("we", "our", or "us") is committed to protecting your privacy. This Privacy Policy explains how we collect, use, store, and safeguard your information depending on how you choose to use the app.
        </Body>

        {/* Developer Info */}
        <div className="bg-[#1e1e1e] border border-white/5 rounded-2xl p-5 mb-8">
          <h2 className="text-[#c9a050] font-semibold mb-3">Developer Information</h2>
          <p className="text-gray-400 text-sm leading-6">
            <span className="text-[#f5f2eb] font-medium">Developer:</span> ShaveSplash<br />
            <span className="text-[#f5f2eb] font-medium">Contact:</span> teutonblade@shavesplash.com<br />
            <span className="text-[#f5f2eb] font-medium">Web:</span> www.shavesplash.app
          </p>
        </div>

        <Section title="How You Use ShaveSplash">
          <Body>
            ShaveSplash offers two modes. Your privacy rights and our data practices differ depending on which you choose.
          </Body>
          <div className="space-y-3 mb-3">
            <div className="bg-[#1e1e1e] border border-white/5 rounded-xl p-4">
              <p className="text-[#f5f2eb] font-medium text-sm mb-1">Local Only</p>
              <p className="text-gray-500 text-sm leading-5">All data stays on your device. Nothing is transmitted to our servers. No account is created. Uninstalling the app removes all data permanently.</p>
            </div>
            <div className="bg-[#1e1e1e] border border-[#c9a050]/20 rounded-xl p-4">
              <p className="text-[#f5f2eb] font-medium text-sm mb-1">Cloud Connected</p>
              <p className="text-gray-500 text-sm leading-5">You create a free account. Your data is synced to our secure servers so you can access it on the web at www.shavesplash.app and across devices. The rest of this policy applies to Cloud Connected users.</p>
            </div>
          </div>
        </Section>

        <Section title="Information We Collect">
          <Body>When you use Cloud Connected mode, we collect and store the following:</Body>

          <p className="text-[#f5f2eb] text-xs font-semibold uppercase tracking-wide mb-2">Account</p>
          <ul className="list-disc list-inside mb-4 space-y-1">
            <Bullet>Email address (used to sign in via one-time code)</Bullet>
            <Bullet>Display name (optional, set by you)</Bullet>
          </ul>

          <p className="text-[#f5f2eb] text-xs font-semibold uppercase tracking-wide mb-2">Your Shave Data</p>
          <ul className="list-disc list-inside mb-4 space-y-1">
            <Bullet>Shave logs, scores, results, notes, and photos</Bullet>
            <Bullet>Den inventory (razors, blades, soaps, brushes, aftershaves, etc.)</Bullet>
            <Bullet>Custom score parameters and result options</Bullet>
            <Bullet>App preferences</Bullet>
          </ul>

          <p className="text-[#f5f2eb] text-xs font-semibold uppercase tracking-wide mb-2">Community Activity</p>
          <ul className="list-disc list-inside mb-4 space-y-1">
            <Bullet>Forum posts and replies you publish</Bullet>
            <Bullet>Shave of the Day (SOTD) posts, reactions, and comments</Bullet>
            <Bullet>Buy/Sell/Trade listings and messages between users</Bullet>
            <Bullet>Reactions and emoji responses to community content</Bullet>
          </ul>

          <p className="text-[#f5f2eb] text-xs font-semibold uppercase tracking-wide mb-2">Usage Data</p>
          <Body>
            We collect anonymous usage activity (such as which features you use and when) to understand how the app is being used. This data is associated with your account for up to 90 days, after which individual activity records are deleted and only aggregated, anonymized statistics are retained.
          </Body>
        </Section>

        <Section title="How We Use Your Information">
          <ul className="list-disc list-inside space-y-1">
            <Bullet>To provide and operate the ShaveSplash service</Bullet>
            <Bullet>To sync your data across the app and the web</Bullet>
            <Bullet>To display your community contributions (forum, BST, SOTD)</Bullet>
            <Bullet>To send BST message notifications via email</Bullet>
            <Bullet>To understand usage patterns and improve the app</Bullet>
            <Bullet>To manage your subscription if you upgrade to Expert tier</Bullet>
          </ul>
        </Section>

        <Section title="Third-Party Services">
          <Body>We use the following third-party services to operate ShaveSplash:</Body>

          <p className="text-[#f5f2eb] text-sm font-medium mb-1">Infrastructure</p>
          <Body>Your data is stored on servers provided by Railway (hosting) and Turso (database). Both are located in the United States.</Body>

          <p className="text-[#f5f2eb] text-sm font-medium mb-1">Payments</p>
          <Body>If you subscribe to the Expert tier, payments are processed by Stripe. We do not store your payment card details. Stripe's privacy policy applies to payment data.</Body>

          <Body>We do not sell, rent, or share your personal data with any other third parties for marketing or advertising purposes.</Body>
        </Section>

        <Section title="Tracking and Advertising">
          <p className="text-[#f5f2eb] text-sm font-medium mb-2">We do not track you across apps or websites owned by other companies.</p>
          <Body>ShaveSplash does not use advertising SDKs, does not sell your data to advertisers, and does not share your data with data brokers.</Body>
        </Section>

        <Section title="Data Retention">
          <ul className="list-disc list-inside space-y-1">
            <Bullet>Account and shave data: retained until you delete your account</Bullet>
            <Bullet>Community content (forum posts, BST listings): retained until you delete them or your account</Bullet>
            <Bullet>Individual usage activity records: deleted after 90 days</Bullet>
            <Bullet>Aggregated, anonymized usage statistics: retained indefinitely</Bullet>
            <Bullet>Deleted account data: permanently removed from our servers within 30 days</Bullet>
          </ul>
        </Section>

        <Section title="Your Rights and Controls">
          <Body>You have the following rights over your data:</Body>
          <ul className="list-disc list-inside space-y-2 mb-3">
            <Bullet><span className="text-[#f5f2eb] font-medium">Access:</span> View all your data within the app</Bullet>
            <Bullet><span className="text-[#f5f2eb] font-medium">Export:</span> Export your shave data from Settings in the iOS app</Bullet>
            <Bullet><span className="text-[#f5f2eb] font-medium">Delete content:</span> Remove individual logs, Den items, forum posts, or BST listings at any time</Bullet>
            <Bullet><span className="text-[#f5f2eb] font-medium">Delete account:</span> Permanently delete your account and all associated data via Settings → Delete My Account & Data in the iOS app</Bullet>
            <Bullet><span className="text-[#f5f2eb] font-medium">Switch to Local:</span> You can switch to Local Only mode at any time from Settings, which stops all future data sync</Bullet>
          </ul>
          <Body>To exercise any other privacy rights or to make a data request, contact us at teutonblade@shavesplash.com.</Body>
        </Section>

        <Section title="Data Security">
          <Body>Cloud data is transmitted over encrypted HTTPS connections and stored in secure, access-controlled databases. We follow industry-standard security practices. No method of transmission or storage is 100% secure, and we cannot guarantee absolute security.</Body>
          <Body>Local Only mode data is stored on your device using your device's built-in security. We recommend securing your device with a passcode or biometric authentication.</Body>
        </Section>

        <Section title="Children's Privacy">
          <Body>ShaveSplash is not intended for children under 13. We do not knowingly collect personal information from children under 13. If you believe a child has provided us with personal information, please contact us and we will delete it promptly.</Body>
        </Section>

        <Section title="Changes to This Policy">
          <Body>We may update this Privacy Policy from time to time. Material changes will be communicated within the app. The "Last Updated" date at the top of this page reflects the most recent revision.</Body>
        </Section>

        {/* Contact */}
        <div className="bg-[#c9a050]/10 border border-[#c9a050]/20 rounded-2xl p-5">
          <h2 className="text-[#c9a050] font-semibold mb-2">Contact Us</h2>
          <p className="text-gray-400 text-sm leading-6 mb-2">Questions about this Privacy Policy or your data? Contact us at:</p>
          <p className="text-[#f5f2eb] text-sm font-semibold">teutonblade@shavesplash.com</p>
        </div>

      </div>
    </div>
  );
}
