import { useState, type SyntheticEvent } from "react";
import "./check-in.css";

type Props = {
  slug: string;
  tagCode?: string;
  businessName: string;
  primaryColor: string;
  privacyUrl: string;
  demo?: boolean;
};

type SuccessData = {
  customerName: string;
  businessName: string;
  visitCount: number;
  alreadyCounted?: boolean;
};

export default function CheckInForm({ slug, tagCode = "", businessName, primaryColor, privacyUrl, demo = false }: Props) {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState<SuccessData | null>(null);

  async function submit(event: SyntheticEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setError("");
    const form = new FormData(event.currentTarget);
    const payload = {
      slug,
      tagCode,
      fullName: form.get("fullName"),
      phone: form.get("phone"),
      birthday: form.get("birthday"),
      consent: form.get("consent") === "on",
      whatsappOptIn: form.get("whatsappOptIn") === "on",
      consentVersion: "2026-10-01",
      website: form.get("website"),
    };

    if (demo) {
      const name = String(form.get("fullName") || "Cliente demo").trim();
      setSuccess({ customerName: name || "Cliente demo", businessName, visitCount: 4 });
      setPending(false);
      return;
    }

    try {
      const response = await fetch("/api/public/check-in", {
        method: "POST",
        headers: { "content-type": "application/json", accept: "application/json" },
        body: JSON.stringify(payload),
      });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error || "No pudimos registrar la visita.");
      setSuccess(body.data);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "No pudimos registrar la visita.");
    } finally {
      setPending(false);
    }
  }

  if (success) {
    return (
      <section className="confirmation" aria-live="polite">
        <div className="check" style={{ backgroundColor: primaryColor }} aria-hidden="true">✓</div>
        <p className="eyebrow">{success.alreadyCounted ? "Visita de hoy ya registrada" : "Visita registrada"}</p>
        <h2>Gracias, {success.customerName}</h2>
        <p>{success.alreadyCounted
          ? `Tu visita de hoy a ${success.businessName} ya estaba registrada. Llevas ${success.visitCount} en total.`
          : `Esta es tu visita número ${success.visitCount} a ${success.businessName}.`}</p>
        <p className="small">Puedes cerrar esta página.</p>
      </section>
    );
  }

  return (
    <form className="checkin-form" onSubmit={submit} noValidate style={{ "--brand-color": primaryColor } as React.CSSProperties}>
      <div className="field">
        <label htmlFor="fullName">Nombre</label>
        <input id="fullName" name="fullName" autoComplete="name" minLength={2} maxLength={120} required />
      </div>
      <div className="field">
        <label htmlFor="phone">Teléfono</label>
        <input id="phone" name="phone" type="tel" autoComplete="tel" inputMode="tel" maxLength={32} required />
        <span className="hint">Usaremos tu teléfono para identificar tus próximas visitas.</span>
      </div>
      <div className="field">
        <label htmlFor="birthday">¿Cuándo cumples años? <span className="optional">(opcional)</span></label>
        <input id="birthday" name="birthday" type="date" autoComplete="bday" max={new Date().toISOString().slice(0, 10)} />
        <span className="hint">Déjanos tu fecha de cumpleaños y podremos sorprenderte con descuentos, regalos o beneficios especiales en tu día.</span>
      </div>
      <div className="honeypot" aria-hidden="true">
        <label htmlFor="website">Sitio web</label>
        <input id="website" name="website" tabIndex={-1} autoComplete="off" />
      </div>
      <label className="consent">
        <input name="consent" type="checkbox" required />
        <span>Acepto que {businessName} guarde estos datos para registrar mis visitas y comunicarse conmigo según su <a href={privacyUrl} target="_blank" rel="noreferrer">política de privacidad</a>.</span>
      </label>
      <label className="consent whatsapp-consent">
        <input name="whatsappOptIn" type="checkbox" />
        <span>Quiero recibir mensajes y promociones de {businessName} por WhatsApp. Puedo pedir que paren en cualquier momento.</span>
      </label>
      {error && <div className="form-alert" role="alert">{error}</div>}
      <button type="submit" disabled={pending} style={{ backgroundColor: primaryColor }}>
        {pending ? "Registrando…" : "Registrar mi visita"}
      </button>
      <p className="privacy-note">Puedes pedir al negocio que consulte, corrija o elimine tus datos.</p>
    </form>
  );
}
