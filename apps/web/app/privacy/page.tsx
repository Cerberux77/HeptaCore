import { getPrivacyEmail } from "../../lib/email/brand";

export default function PrivacyPage() {
  const privacyEmail = getPrivacyEmail();
  return (
    <main style={{ maxWidth: 720, margin: "4rem auto", padding: "0 1.5rem", fontFamily: "system-ui, sans-serif", lineHeight: 1.7, color: "#111" }}>
      <h1 style={{ fontSize: "2rem", marginBottom: "0.5rem" }}>Privacy Policy</h1>
      <p style={{ color: "#555" }}>Last updated: June 15, 2026</p>

      <h2>1. Information We Collect</h2>
      <p>HeptaCore collects the minimum necessary data to provide publishing automation services:</p>
      <ul>
        <li><strong>Account information:</strong> email address and encrypted credentials when you sign up.</li>
        <li><strong>Social media data:</strong> when you connect a social account (Instagram, Facebook), we access only the permissions you grant (e.g., content publishing, page management).</li>
        <li><strong>Usage data:</strong> anonymized logs of API calls and publishing actions for operational monitoring.</li>
      </ul>

      <h2>2. How We Use Data</h2>
      <ul>
        <li>To publish content to your connected social accounts as scheduled or requested.</li>
        <li>To maintain audit logs of publishing actions for your team.</li>
        <li>To improve service reliability and debug issues.</li>
      </ul>
      <p>We do <strong>not</strong> sell, rent, or share your data with third parties for advertising or marketing.</p>

      <h2>3. Data Storage & Security</h2>
      <p>All sensitive credentials (access tokens, API keys) are encrypted at rest using AES-256-GCM. Data is stored in secure cloud databases with access limited to operational infrastructure only.</p>

      <h2>4. Third-Party Services</h2>
      <p>HeptaCore integrates with Meta Platforms (Facebook, Instagram) via their official APIs. Data shared with these platforms is governed by their respective privacy policies.</p>

      <h2>5. Your Rights</h2>
      <ul>
        <li>You can disconnect social accounts at any time, which removes associated credentials.</li>
        <li>You can request deletion of your account and all associated data by contacting us.</li>
        <li>You can request a copy of your data by contacting us.</li>
      </ul>

      <h2>6. Contact</h2>
      <p>For privacy inquiries: <a href={`mailto:${privacyEmail}`}>{privacyEmail}</a></p>
    </main>
  );
}
