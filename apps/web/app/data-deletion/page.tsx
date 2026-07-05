import { getPrivacyEmail } from "../../lib/email/brand";

export default function DataDeletionPage() {
  const privacyEmail = getPrivacyEmail();
  return (
    <main style={{ maxWidth: 720, margin: "4rem auto", padding: "0 1.5rem", fontFamily: "system-ui, sans-serif", lineHeight: 1.7, color: "#111" }}>
      <h1 style={{ fontSize: "2rem", marginBottom: "0.5rem" }}>Data Deletion Instructions</h1>
      <p style={{ color: "#555" }}>Last updated: June 15, 2026</p>

      <h2>How to Request Data Deletion</h2>
      <p>HeptaCore respects your right to delete your data. You can request deletion of all data associated with your account and connected social platforms.</p>

      <h3>Option 1: In-App Disconnection</h3>
      <ol>
        <li>Log in to your HeptaCore dashboard.</li>
        <li>Navigate to <strong>Settings → Social Accounts</strong>.</li>
        <li>Click <strong>Disconnect</strong> next to any connected platform (Instagram, Facebook).</li>
        <li>This immediately removes the stored access token and credential for that platform.</li>
      </ol>

      <h3>Option 2: Account Deletion</h3>
      <p>To delete your entire HeptaCore account and all associated data:</p>
      <ol>
        <li>Send an email to <a href={`mailto:${privacyEmail}`}>{privacyEmail}</a></li>
        <li>Include your registered email address and tenant name.</li>
        <li>We will process your request within 30 days and confirm completion.</li>
      </ol>

      <h2>What Gets Deleted</h2>
      <ul>
        <li>All stored credentials and access tokens.</li>
        <li>Your account profile and membership records.</li>
        <li>Publishing history and audit logs associated with your account.</li>
        <li>Content drafts that have not been published.</li>
      </ul>

      <h2>What Cannot Be Deleted</h2>
      <p>Content already published to social platforms (Instagram, Facebook) through HeptaCore is subject to those platforms&apos; data retention policies. You must delete such content directly on the respective platform.</p>

      <h2>Contact</h2>
      <p>For data deletion requests: <a href={`mailto:${privacyEmail}`}>{privacyEmail}</a></p>
    </main>
  );
}
