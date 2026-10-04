export const PRIVACY_NOTICE_VERSION = "2026-10-04";
export const PRIVACY_NOTICE_UPDATED_ES = "4 de octubre de 2026";
export const PRIVACY_NOTICE_UPDATED_EN = "October 4, 2026";
export const MINIMUM_CUSTOMER_AGE = 13;

type NoticeInput = {
  businessNameEs: string;
  businessNameEn: string;
  contactEs: string;
  contactEn: string;
};

export type NoticeSection = {
  heading: string;
  paragraphs?: string[];
  items?: string[];
};

export function buildPrivacyNoticeCopy(input: NoticeInput) {
  const { businessNameEs, businessNameEn, contactEs, contactEn } = input;
  return {
    es: {
      title: `Aviso de privacidad — ${businessNameEs}`,
      sections: [
        { heading: "Quién guarda tus datos", paragraphs: [`${businessNameEs} usa Smart Tap, un servicio de Automate IT LLC (Florida, EE. UU.), para registrar tus visitas. ${businessNameEs} decide cómo usar tus datos; Automate IT solo los guarda y protege por cuenta del negocio.`] },
        { heading: "Qué datos guardamos", items: ["Tu nombre y teléfono.", "Tu fecha de cumpleaños, solo si decides darla.", "Las fechas de tus visitas.", "Si aceptaste recibir mensajes por WhatsApp.", "Un registro de tu consentimiento: fecha, versión de este aviso y un identificador técnico protegido. No guardamos tu dirección IP en texto legible."] },
        { heading: "Para qué se usan", paragraphs: [`Para reconocerte cuando vuelves, contar tus visitas y, si lo aceptaste, enviarte ofertas o un saludo de cumpleaños por WhatsApp. Los mensajes los envía una persona de ${businessNameEs}, no un sistema automático.`] },
        { heading: "WhatsApp", paragraphs: [`Es opcional y viene sin marcar. Puedes dejar de recibir mensajes cuando quieras: responde BAJA o díselo a ${businessNameEs}.`] },
        { heading: "Quién más los ve", paragraphs: [`Solo las personas autorizadas de ${businessNameEs} (máximo 2). Ningún otro negocio puede verlos. Tus datos se guardan con proveedores de alojamiento y base de datos en Estados Unidos, con acceso restringido. No vendemos, alquilamos ni compartimos tus datos con fines comerciales.`] },
        { heading: "Cuánto tiempo", paragraphs: [`Si pasan 24 meses sin que registres una visita, tus datos se borran. Si ${businessNameEs} deja de usar Smart Tap, recibe una copia de su lista de clientes y Smart Tap borra los datos en 30 días.`] },
        { heading: "Tus derechos", paragraphs: [`Puedes pedir ver, corregir o borrar tus datos, o retirar tu consentimiento. Escríbele a ${businessNameEs}: ${contactEs}. Si no te responde, escribe a smarttap@yourbizupgraded.com.`] },
        { heading: "Edad", paragraphs: ["El registro es solo para personas de 13 años o más."] },
        { heading: "Cambios", paragraphs: ["Si este aviso cambia, actualizamos la fecha de abajo. Cada consentimiento queda guardado con la versión que aceptaste."] },
      ] satisfies NoticeSection[],
      updated: `Última actualización: ${PRIVACY_NOTICE_UPDATED_ES}`,
    },
    en: {
      title: `Privacy notice — ${businessNameEn}`,
      sections: [
        { heading: "Who keeps your data", paragraphs: [`${businessNameEn} uses Smart Tap, a service of Automate IT LLC (Florida, USA), to record your visits. ${businessNameEn} decides how your data is used; Automate IT only stores and protects it on the business's behalf.`] },
        { heading: "What we keep", items: ["Your name and phone number.", "Your birthday, only if you choose to share it.", "The dates of your visits.", "Whether you agreed to receive WhatsApp messages.", "A record of your consent: date, version of this notice and a protected technical identifier. We do not store your IP address in readable form."] },
        { heading: "What it is used for", paragraphs: [`To recognize you when you come back, count your visits and, if you agreed, send you offers or a birthday greeting on WhatsApp. Messages are sent by a person at ${businessNameEn}, not by an automated system.`] },
        { heading: "WhatsApp", paragraphs: [`It is optional and unchecked by default. You can stop messages at any time: reply BAJA or tell ${businessNameEn}.`] },
        { heading: "Who else sees it", paragraphs: [`Only authorized people at ${businessNameEn} (2 at most). No other business can see it. Your data is stored with hosting and database providers in the United States, with restricted access. We do not sell, rent or share your data for commercial purposes.`] },
        { heading: "How long", paragraphs: [`If 24 months pass without a recorded visit, your data is deleted. If ${businessNameEn} stops using Smart Tap, it receives a copy of its customer list and Smart Tap deletes the data within 30 days.`] },
        { heading: "Your rights", paragraphs: [`You can ask to see, correct or delete your data, or withdraw your consent. Contact ${businessNameEn}: ${contactEn}. If they do not answer, write to smarttap@yourbizupgraded.com.`] },
        { heading: "Age", paragraphs: ["Registration is only for people aged 13 or older."] },
        { heading: "Changes", paragraphs: ["If this notice changes, we update the date below. Each consent is stored with the version you accepted."] },
      ] satisfies NoticeSection[],
      updated: `Last updated: ${PRIVACY_NOTICE_UPDATED_EN}`,
    },
  };
}

export function businessPrivacyUrl(slug: string, override?: string | null): string {
  const custom = override?.trim();
  return custom || `/privacy/${slug}`;
}

export function businessContact(phone?: string | null, email?: string | null): string | null {
  const values = [phone?.trim(), email?.trim()].filter((value): value is string => Boolean(value));
  return values.length ? values.join(" · ") : null;
}

export function latestBirthdayForAge(age = MINIMUM_CUSTOMER_AGE, now = new Date()): string {
  const year = now.getUTCFullYear() - age;
  const month = String(now.getUTCMonth() + 1).padStart(2, "0");
  const day = String(now.getUTCDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function isAtLeastMinimumAge(birthday: string, now = new Date()): boolean {
  return birthday <= latestBirthdayForAge(MINIMUM_CUSTOMER_AGE, now);
}
