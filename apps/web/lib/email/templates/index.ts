import { render } from "@react-email/components";
import { TenantOwnerInvitationEmail, tenantOwnerInvitationText } from "./tenant-owner-invitation";
import { TenantAccessGrantedEmail, tenantAccessGrantedText } from "./tenant-access-granted";
import { MemberInvitationEmail, memberInvitationText } from "./member-invitation";
import * as React from "react";

type TemplateType = "owner-invitation" | "access-granted" | "member-invitation";

export async function renderTemplate(
  type: TemplateType,
  lang: "es" | "en",
  params: any,
): Promise<{ html: string; text: string; subject: string }> {
  let subject: string;
  let html: string;
  let text: string;

  switch (type) {
    case "owner-invitation": {
      const t = texts[lang];
      subject = params.isExistingAccount
        ? (lang === "es" ? `Acceso a ${params.tenantName} en HeptaCore` : `Access to ${params.tenantName} on HeptaCore`)
        : t.subject(params.tenantName);
      html = await render(
        React.createElement(TenantOwnerInvitationEmail, { ...params, lang }),
      );
      text = tenantOwnerInvitationText({ ...params, lang });
      break;
    }
    case "access-granted": {
      const t = textsAccess[lang];
      subject = t.subject(params.tenantName);
      html = await render(
        React.createElement(TenantAccessGrantedEmail, { ...params, lang }),
      );
      text = tenantAccessGrantedText({ ...params, lang });
      break;
    }
    case "member-invitation": {
      const t = textsMember[lang];
      subject = t.subject(params.tenantName);
      html = await render(
        React.createElement(MemberInvitationEmail, { ...params, lang }),
      );
      text = memberInvitationText({ ...params, lang });
      break;
    }
    default:
      throw new Error(`Unknown template type: ${type}`);
  }

  return { html, text, subject };
}

const texts = {
  es: {
    subject: (name: string) => `Activa tu acceso a ${name} en HeptaCore`,
  },
  en: {
    subject: (name: string) => `Activate your access to ${name} on HeptaCore`,
  },
};

const textsAccess = {
  es: {
    subject: (name: string) => `Ya tienes acceso a ${name}`,
  },
  en: {
    subject: (name: string) => `You now have access to ${name}`,
  },
};

const textsMember = {
  es: {
    subject: (name: string) => `Te invitaron a colaborar en ${name}`,
  },
  en: {
    subject: (name: string) => `You've been invited to collaborate on ${name}`,
  },
};
