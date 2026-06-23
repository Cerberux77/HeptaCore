import {
  Html,
  Text,
  Button,
  Container,
  Section,
  Heading,
} from "@react-email/components";
import * as React from "react";

interface MemberInvitationProps {
  tenantName: string;
  token: string;
  email: string;
  inviteLink: string;
  role: string;
  expiresAt: Date;
  lang: "es" | "en";
}

const texts = {
  es: {
    subject: (name: string) => `Te invitaron a colaborar en ${name}`,
    heading: "Invitación de colaboración",
    subtitle: (name: string) => `Has sido invitado a colaborar en el tenant ${name} de HeptaCore`,
    role: (r: string) => `Rol: ${r}`,
    activate: "Aceptar invitación",
    expires: (date: string) => `Esta invitación expira el ${date}`,
    security: "Por seguridad, este enlace es personal e intransferible.",
    footer: "HeptaCore — Gestión de contenido para redes sociales",
  },
  en: {
    subject: (name: string) => `You've been invited to collaborate on ${name}`,
    heading: "Collaboration Invitation",
    subtitle: (name: string) => `You have been invited to collaborate on the ${name} tenant on HeptaCore`,
    role: (r: string) => `Role: ${r}`,
    activate: "Accept Invitation",
    expires: (date: string) => `This invitation expires on ${date}`,
    security: "For security, this link is personal and non-transferable.",
    footer: "HeptaCore — Social Media Content Management",
  },
};

export function MemberInvitationEmail(props: MemberInvitationProps) {
  const t = texts[props.lang];
  const expiryStr = props.expiresAt.toLocaleDateString(props.lang === "es" ? "es-VE" : "en-US", {
    year: "numeric", month: "long", day: "numeric",
  });

  return (
    <Html>
      <Container style={container}>
        <Section style={header}>
          <Heading style={h1}>{t.heading}</Heading>
          <Text style={paragraph}>{t.subtitle(props.tenantName)}</Text>
        </Section>
        <Section style={body}>
          <Text style={label}>{t.role(props.role)}</Text>
          <Text style={paragraph}>{props.email}</Text>
          <Button href={props.inviteLink} style={button}>{t.activate}</Button>
          <Text style={expiry}>{t.expires(expiryStr)}</Text>
          <Text style={note}>{t.security}</Text>
        </Section>
        <Section style={footer}>
          <Text style={footerText}>{t.footer}</Text>
        </Section>
      </Container>
    </Html>
  );
}

export function memberInvitationText(props: MemberInvitationProps): string {
  const t = texts[props.lang];
  const expiryStr = props.expiresAt.toLocaleDateString(props.lang === "es" ? "es-VE" : "en-US", {
    year: "numeric", month: "long", day: "numeric",
  });

  return `${t.subtitle(props.tenantName)}\n\n${t.role(props.role)}: ${props.email}\n\n${t.activate}: ${props.inviteLink}\n\n${t.expires(expiryStr)}\n\n${t.footer}`;
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

const note: React.CSSProperties = {
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
