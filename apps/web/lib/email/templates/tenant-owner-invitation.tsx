import {
  Html,
  Text,
  Link,
  Button,
  Container,
  Section,
  Heading,
  Row,
  Column,
} from "@react-email/components";
import * as React from "react";

interface OwnerInvitationProps {
  tenantName: string;
  token: string;
  email: string;
  inviteLink: string;
  expiresAt: Date;
  isExistingAccount: boolean;
  lang: "es" | "en";
}

const texts = {
  es: {
    subject: (name: string) => `Activa tu acceso a ${name} en HeptaCore`,
    heading: "Bienvenido a HeptaCore",
    subtitle: (name: string) => `Has sido designado como OWNER del tenant ${name}`,
    activate: "Activar mi cuenta",
    expires: (date: string) => `Esta invitación expira el ${date}`,
    security: "Por seguridad, este enlace es personal e intransferible. No lo compartas con nadie.",
    footer: "HeptaCore — Gestión de contenido para redes sociales",
    roleOwner: "Rol: OWNER",
    question: "¿Preguntas? Contáctanos en soporte@heptacore.vercel.app",
    loginInstead: "Ya tienes cuenta? Inicia sesión aquí",
    existingHeading: "Acceso a nuevo tenant",
    existingSubtitle: (name: string) => `Se te ha otorgado acceso como OWNER al tenant ${name}`,
    login: "Iniciar sesión",
  },
  en: {
    subject: (name: string) => `Activate your access to ${name} on HeptaCore`,
    heading: "Welcome to HeptaCore",
    subtitle: (name: string) => `You have been designated as OWNER of the ${name} tenant`,
    activate: "Activate my account",
    expires: (date: string) => `This invitation expires on ${date}`,
    security: "For security, this link is personal and non-transferable. Do not share it with anyone.",
    footer: "HeptaCore — Social Media Content Management",
    roleOwner: "Role: OWNER",
    question: "Questions? Contact us at support@heptacore.vercel.app",
    loginInstead: "Already have an account? Log in here",
    existingHeading: "New Tenant Access",
    existingSubtitle: (name: string) => `You have been granted OWNER access to the ${name} tenant`,
    login: "Log in",
  },
};

export function TenantOwnerInvitationEmail(props: OwnerInvitationProps) {
  const t = texts[props.lang];
  const expiryStr = props.expiresAt.toLocaleDateString(props.lang === "es" ? "es-VE" : "en-US", {
    year: "numeric", month: "long", day: "numeric",
  });

  if (props.isExistingAccount) {
    return (
      <Html>
        <Container style={container}>
          <Section style={header}>
            <Heading style={h1}>{t.existingHeading}</Heading>
            <Text style={paragraph}>{t.existingSubtitle(props.tenantName)}</Text>
          </Section>
          <Section style={body}>
            <Text style={label}>{t.roleOwner}</Text>
            <Text style={paragraph}>{props.email}</Text>
            <Button href={props.inviteLink} style={button}>{t.login}</Button>
            <Text style={securityNote}>{t.security}</Text>
          </Section>
          <Section style={footer}>
            <Text style={footerText}>{t.footer}</Text>
            <Text style={footerText}>{t.question}</Text>
          </Section>
        </Container>
      </Html>
    );
  }

  return (
    <Html>
      <Container style={container}>
        <Section style={header}>
          <Heading style={h1}>{t.heading}</Heading>
          <Text style={paragraph}>{t.subtitle(props.tenantName)}</Text>
        </Section>
        <Section style={body}>
          <Text style={label}>{t.roleOwner}</Text>
          <Text style={paragraph}>{props.email}</Text>
          <Button href={props.inviteLink} style={button}>{t.activate}</Button>
          <Text style={expiry}>{t.expires(expiryStr)}</Text>
          <Text style={securityNote}>{t.security}</Text>
        </Section>
        <Section style={footer}>
          <Text style={footerText}>{t.footer}</Text>
          <Text style={footerText}>{t.question}</Text>
        </Section>
      </Container>
    </Html>
  );
}

export function tenantOwnerInvitationText(props: OwnerInvitationProps): string {
  const t = texts[props.lang];
  const expiryStr = props.expiresAt.toLocaleDateString(props.lang === "es" ? "es-VE" : "en-US", {
    year: "numeric", month: "long", day: "numeric",
  });

  if (props.isExistingAccount) {
    return `${t.existingSubtitle(props.tenantName)}\n\n${t.roleOwner}: ${props.email}\n\n${t.login}: ${props.inviteLink}\n\n${t.security}\n\n${t.footer}`;
  }

  return `${t.subtitle(props.tenantName)}\n\n${t.roleOwner}: ${props.email}\n\n${t.activate}: ${props.inviteLink}\n\n${t.expires(expiryStr)}\n\n${t.security}\n\n${t.footer}`;
}

const container: React.CSSProperties = {
  backgroundColor: "#ffffff",
  fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
  maxWidth: "480px",
  margin: "0 auto",
  padding: "20px 0",
};

const header: React.CSSProperties = {
  backgroundColor: "#0a0a0a",
  padding: "32px 24px",
  textAlign: "center" as const,
};

const h1: React.CSSProperties = {
  color: "#ffffff",
  fontSize: "24px",
  fontWeight: "700",
  margin: "0 0 8px",
};

const paragraph: React.CSSProperties = {
  color: "#374151",
  fontSize: "16px",
  lineHeight: "1.6",
  margin: "0 0 16px",
};

const label: React.CSSProperties = {
  color: "#6b7280",
  fontSize: "12px",
  fontWeight: "600",
  textTransform: "uppercase" as const,
  letterSpacing: "0.5px",
  margin: "0 0 4px",
};

const body: React.CSSProperties = {
  padding: "24px 24px",
};

const button: React.CSSProperties = {
  backgroundColor: "#0070f3",
  color: "#ffffff",
  padding: "12px 24px",
  fontSize: "16px",
  fontWeight: "600",
  borderRadius: "8px",
  textDecoration: "none",
  display: "inline-block",
  margin: "16px 0",
};

const expiry: React.CSSProperties = {
  color: "#9ca3af",
  fontSize: "13px",
  margin: "0 0 16px",
};

const securityNote: React.CSSProperties = {
  color: "#9ca3af",
  fontSize: "13px",
  fontStyle: "italic",
  margin: "0",
};

const footer: React.CSSProperties = {
  borderTop: "1px solid #e5e7eb",
  padding: "16px 24px",
  marginTop: "24px",
};

const footerText: React.CSSProperties = {
  color: "#9ca3af",
  fontSize: "12px",
  margin: "4px 0",
};
