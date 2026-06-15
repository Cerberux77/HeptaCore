export default function TermsPage() {
  return (
    <main style={{ maxWidth: 720, margin: "4rem auto", padding: "0 1.5rem", fontFamily: "system-ui, sans-serif", lineHeight: 1.7, color: "#111" }}>
      <h1 style={{ fontSize: "2rem", marginBottom: "0.5rem" }}>Terms of Service</h1>
      <p style={{ color: "#555" }}>Last updated: June 15, 2026</p>

      <h2>1. Acceptance of Terms</h2>
      <p>By accessing or using HeptaCore (&quot;the Service&quot;), you agree to be bound by these Terms of Service. If you do not agree, do not use the Service.</p>

      <h2>2. Description of Service</h2>
      <p>HeptaCore is a social media publishing automation platform that allows users to schedule, approve, and publish content to connected social media accounts, including Instagram and Facebook.</p>

      <h2>3. Account Responsibilities</h2>
      <ul>
        <li>You are responsible for maintaining the confidentiality of your account credentials.</li>
        <li>You are responsible for all content published through your account.</li>
        <li>You must not use the Service for spam, harassment, or illegal content.</li>
      </ul>

      <h2>4. Third-Party Platforms</h2>
      <p>The Service integrates with Meta Platforms (Facebook, Instagram) via their official APIs. Your use of these platforms is subject to their respective terms of service. HeptaCore is not responsible for content removed or accounts suspended by third-party platforms.</p>

      <h2>5. Service Availability</h2>
      <p>We strive for high availability but do not guarantee uninterrupted service. Maintenance windows and platform API changes may temporarily affect functionality.</p>

      <h2>6. Limitation of Liability</h2>
      <p>HeptaCore is provided &quot;as is&quot; without warranties of any kind. We are not liable for damages arising from use of the Service, including but not limited to loss of data or publishing errors.</p>

      <h2>7. Changes to Terms</h2>
      <p>We may update these terms at any time. Continued use of the Service after changes constitutes acceptance of the new terms.</p>

      <h2>8. Contact</h2>
      <p>For questions about these terms: <a href="mailto:privacy@heptacore.vercel.app">privacy@heptacore.vercel.app</a></p>
    </main>
  );
}
