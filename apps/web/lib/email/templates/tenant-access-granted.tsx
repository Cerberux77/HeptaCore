import {
  Html,
  Text,
  Link,
  Button,
  Container,
  Section,
  Heading,
} from "@react-email/components";
import * as React from "react";

interface AccessGrantedProps {
  tenantName: string;
  email: string;
  loginLink: string;
  lang: "es" | "en";
}

const texts = {
  es: {
    subject: (name: string) => `Ya tienes acceso a ${name}`,
    heading: "Acceso concedido",
    subtitle: (name: string) => `Se te ha otorgado acceso al tenant ${name} en HeptaCore`,
    login: "Iniciar sesión",
    security: "Si no esperabas este acceso, por favor ignora este mensaje.",
    footer: "HeptaCore — Gestión de contenido para redes sociales",
  },
  en: {
    subject: (name: string) => `You now have access to ${name}`,
    heading: "Access Granted",
    subtitle: (name: string) => `You have been granted access to the ${name} tenant on HeptaCore`,
    login: "Log in",
    security: "If you did not expect this access, please ignore this message.",
    footer: "HeptaCore — Social Media Content Management",
  },
};

export function TenantAccessGrantedEmail(props: AccessGrantedProps) {
  const t = texts[props.lang];
  return (
    <Html>
      <Container style={container}>
        <Section style={header}>
          <Heading style={h1}>{t.heading}</Heading>
          <Text style={paragraph}>{t.subtitle(props.tenantName)}</Text>
        </Section>
        <Section style={body}>
          <Text style={paragraph}>{props.email}</Text>
          <Button href={props.loginLink} style={button}>{t.login}</Button>
          <Text style={note}>{t.security}</Text>
        </Section>
        <Section style={footer}>
          <Text style={footerText}>{t.footer}</Text>
        </Section>
      </Container>
    </Html>
  );
}

export function tenantAccessGrantedText(props: AccessGrantedProps): string {
  const t = texts[props.lang];
  return `${t.subtitle(props.tenantName)}\n\nEmail: ${props.email}\n\n${t.login}: ${props.loginLink}\n\n${t.footer}`;
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
