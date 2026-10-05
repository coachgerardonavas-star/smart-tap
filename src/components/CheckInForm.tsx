import { useEffect, useRef, useState, type CSSProperties, type SyntheticEvent } from "react";
import "./check-in.css";
import { latestBirthdayForAge } from "../lib/privacy";
import { businessInitials, buttonTextColor, customerThemeCopy, type CustomerTheme } from "../lib/customer-theme";

type Props = {
  slug: string;
  tagCode?: string;
  businessName: string;
  primaryColor: string;
  privacyUrl: string;
  theme: CustomerTheme;
  tagline?: string | null;
  benefits: string[];
  heroImageUrl?: string | null;
  logoUrl?: string | null;
  googleReviewUrl?: string | null;
  demo?: boolean;
  turnstileSiteKey?: string | null;
};

type SuccessData = { ok: true; businessName: string };

type TurnstileApi = {
  render: (container: HTMLElement, options: { sitekey: string }) => string;
  getResponse: (widgetId: string) => string | undefined;
  reset: (widgetId: string) => void;
  remove: (widgetId: string) => void;
};

function turnstileApi(): TurnstileApi | undefined {
  return (window as Window & { turnstile?: TurnstileApi }).turnstile;
}

export default function CheckInForm({
  slug, tagCode = "", businessName, primaryColor, privacyUrl, theme, tagline,
  benefits, heroImageUrl, logoUrl, googleReviewUrl, demo = false, turnstileSiteKey = null,
}: Props) {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState<SuccessData | null>(null);
  const turnstileContainer = useRef<HTMLDivElement>(null);
  const turnstileWidget = useRef<string | null>(null);

  // Render the challenge explicitly after hydration. Implicit rendering of a
  // `.cf-turnstile` element inside this island raced React hydration, which
  // removed the widget, so every live check-in was rejected without a token.
  useEffect(() => {
    if (!turnstileSiteKey || demo || success) return;
    const renderWidget = () => {
      const api = turnstileApi();
      if (!api || !turnstileContainer.current || turnstileWidget.current) return Boolean(turnstileWidget.current);
      turnstileWidget.current = api.render(turnstileContainer.current, { sitekey: turnstileSiteKey });
      return true;
    };
    const timer = renderWidget() ? undefined : window.setInterval(() => { if (renderWidget()) window.clearInterval(timer); }, 200);
    return () => {
      if (timer) window.clearInterval(timer);
      if (turnstileWidget.current) turnstileApi()?.remove(turnstileWidget.current);
      turnstileWidget.current = null;
    };
  }, [turnstileSiteKey, demo, success]);
  const copy = customerThemeCopy[theme];
  const initials = businessInitials(businessName);
  const style = { "--brand-color": primaryColor, "--brand-label": buttonTextColor(primaryColor) } as CSSProperties;

  async function submit(event: SyntheticEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setError("");
    const form = new FormData(event.currentTarget);
    const payload = {
      slug, tagCode, fullName: form.get("fullName"), phone: form.get("phone"),
      birthday: form.get("birthday"), consent: form.get("consent") === "on",
      whatsappOptIn: form.get("whatsappOptIn") === "on", website: form.get("website"),
      turnstileToken: turnstileWidget.current ? turnstileApi()?.getResponse(turnstileWidget.current) ?? "" : form.get("cf-turnstile-response"),
    };
    if (demo) {
      setSuccess({ ok: true, businessName });
      setPending(false);
      return;
    }
    try {
      const response = await fetch("/api/public/check-in", {
        method: "POST", headers: { "content-type": "application/json", accept: "application/json" },
        body: JSON.stringify(payload),
      });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error || "No pudimos registrar la visita.");
      setSuccess(body);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "No pudimos registrar la visita.");
      if (turnstileWidget.current) turnstileApi()?.reset(turnstileWidget.current);
    } finally {
      setPending(false);
    }
  }

  if (success) {
    return (
      <main className={`customer-screen theme-${theme} confirmation-screen`} style={style} data-state="confirmation">
        <div className="confirmation-shape confirmation-shape-one" aria-hidden="true" />
        <div className="confirmation-shape confirmation-shape-two" aria-hidden="true" />
        <header className="confirmation-brand">
          <BrandMark logoUrl={logoUrl} initials={initials} businessName={businessName} />
          <strong>{businessName}</strong>
        </header>
        <section className="confirmation" aria-live="polite">
          <div className="check" aria-hidden="true">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6 9 17l-5-5" /></svg>
          </div>
          <h1>¡Listo!</h1>
          <h2>Tu visita quedó registrada</h2>
          <p>Gracias por venir. La próxima vez solo toca la tarjeta otra vez.</p>
        </section>
        {googleReviewUrl && (
          <a className="review-link" href={googleReviewUrl} target="_blank" rel="noreferrer">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" /></svg>
            <span>Déjanos una reseña en Google</span>
          </a>
        )}
      </main>
    );
  }

  return (
    <main className={`customer-screen theme-${theme}`} style={style} data-state="form">
      <section className="brand-hero">
        {heroImageUrl && <img className="hero-image" src={heroImageUrl} alt="" width="1200" height="800" />}
        <div className="hero-overlay" aria-hidden="true" />
        <div className="brand-lockup">
          <BrandMark logoUrl={logoUrl} initials={initials} businessName={businessName} />
          <div className="brand-text">{theme !== "moderno" && <strong>{businessName}</strong>}{tagline && <span>{tagline}</span>}</div>
        </div>
        <div className="hero-copy">
          <h1>{theme === "colorido" ? `¡Únete al club ${businessName}!` : theme === "moderno" ? businessName.toLocaleUpperCase("es-US") : copy.heroTitle}</h1>
          <ul>{benefits.map((benefit, index) => <li key={`${benefit}-${index}`}><span aria-hidden="true">{String(index + 1).padStart(2, "0")}</span>{benefit}</li>)}</ul>
        </div>
      </section>
      <section className="form-panel">
        <header className="form-heading"><h2>{copy.formTitle}</h2><p>{copy.formLead}</p></header>
        <form className="checkin-form" onSubmit={submit} noValidate>
          <div className="field first-field">
            <label htmlFor="fullName">{theme === "moderno" ? "NOMBRE" : "Nombre"}</label>
            <input id="fullName" name="fullName" autoComplete="name" minLength={2} maxLength={120} required />
          </div>
          <div className="field">
            <label htmlFor="phone">{theme === "moderno" ? "TELÉFONO" : "Teléfono"}</label>
            <input id="phone" name="phone" type="tel" autoComplete="tel" inputMode="tel" maxLength={32} required />
            <span className="hint">Usaremos tu teléfono para identificar tus próximas visitas.</span>
          </div>
          <div className="field">
            <label htmlFor="birthday">¿Cuándo cumples años? <span className="optional">(opcional)</span></label>
            <input id="birthday" name="birthday" type="date" autoComplete="bday" max={latestBirthdayForAge()} />
            <span className="hint">Déjanos tu fecha de cumpleaños y podremos sorprenderte con descuentos, regalos o beneficios especiales en tu día.</span>
          </div>
          <div className="honeypot" aria-hidden="true">
            <label htmlFor="website">Sitio web</label><input id="website" name="website" tabIndex={-1} autoComplete="off" />
          </div>
          <label className="consent">
            <input name="consent" type="checkbox" required />
            <span>Acepto que {businessName} guarde estos datos para registrar mis visitas y comunicarse conmigo según su <a href={privacyUrl} target="_blank" rel="noreferrer">política de privacidad</a>. Tengo 13 años o más.</span>
          </label>
          <label className="consent whatsapp-consent">
            <input name="whatsappOptIn" type="checkbox" />
            <span>Recibe ofertas y sorpresas de cumpleaños de {businessName} por WhatsApp. Puedes pedir que paren cuando quieras.</span>
          </label>
          {turnstileSiteKey && <div className="turnstile-slot" ref={turnstileContainer} />}
          {error && <div className="form-alert" role="alert">{error}</div>}
          <button type="submit" disabled={pending}>{pending ? "Registrando…" : copy.submitLabel}</button>
          <p className="privacy-note">Puedes pedir al negocio que consulte, corrija o elimine tus datos.</p>
        </form>
      </section>
    </main>
  );
}

function BrandMark({ logoUrl, initials, businessName }: { logoUrl?: string | null; initials: string; businessName: string }) {
  return logoUrl
    ? <img className="brand-mark logo" src={logoUrl} alt={`Logo de ${businessName}`} width="64" height="64" />
    : <span className="brand-mark initials" aria-hidden="true">{initials}</span>;
}
