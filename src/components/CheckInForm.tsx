import { useEffect, useRef, useState, type CSSProperties, type SyntheticEvent } from "react";
import "./check-in.css";
import { latestBirthdayForAge } from "../lib/privacy";
import {
  businessInitials, buttonTextColor, customerStyleTokens, customerThemeCopy, filledVisitStars, heroOrnament, maxVisitStars,
  veilGradient, visibleAccent, visitCountLabel, type CustomerTheme,
} from "../lib/customer-theme";
import { businessPresets, type BusinessType } from "../lib/business-presets";
import { benefitIcons, Icon } from "./customer-icons";

type Props = {
  slug: string;
  tagCode?: string;
  businessName: string;
  businessType: BusinessType;
  primaryColor: string;
  privacyUrl: string;
  theme: CustomerTheme;
  tagline?: string | null;
  benefits: string[];
  heroImageUrl?: string | null;
  logoUrl?: string | null;
  googleReviewUrl?: string | null;
  instagramUrl?: string | null;
  demo?: boolean;
  demoVisitCount?: number;
  turnstileSiteKey?: string | null;
};

type SuccessData = { ok: true; businessName: string; visitCount?: number };

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
  slug, tagCode = "", businessName, businessType, primaryColor, privacyUrl, theme, tagline,
  benefits, heroImageUrl, logoUrl, googleReviewUrl, instagramUrl, demo = false, demoVisitCount = 3, turnstileSiteKey = null,
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
  const preset = businessPresets[businessType];
  const initials = businessInitials(businessName);
  const style = customerScreenStyle(theme, primaryColor);

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
      setSuccess({ ok: true, businessName, visitCount: demoVisitCount });
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
      <ConfirmationView
        theme={theme} primaryColor={primaryColor} businessName={businessName} businessType={businessType}
        logoUrl={logoUrl} googleReviewUrl={googleReviewUrl} instagramUrl={instagramUrl} visitCount={success.visitCount}
      />
    );
  }

  return (
    <main className={`customer-screen theme-${theme}`} style={style} data-state="form">
      <section className="brand-hero">
        {heroImageUrl && (
          <img className="hero-image" src={heroImageUrl} alt="" width="1200" height="800" fetchPriority="high" decoding="async" />
        )}
        <div className="hero-veil" aria-hidden="true" />
        <Decorations theme={theme} />
        <div className="hero-inner">
          <BrandMark logoUrl={logoUrl} initials={initials} businessName={businessName} icon={preset.icon} />
          <p className="brand-name">{businessName}</p>
          <p className="brand-sub">{preset.label}</p>
          <span className="rule" aria-hidden="true" />
          {tagline && <p className="motto">{tagline}</p>}
          <h1>{copy.heroTitle(businessName)}</h1>
          <ul className="benefits">
            {benefits.map((benefit, index) => (
              <li key={`${benefit}-${index}`}>
                <span className="benefit-icon"><Icon name={benefitIcons[index % benefitIcons.length] ?? "star"} /></span>
                <span className="benefit-text">{benefit}</span>
              </li>
            ))}
          </ul>
        </div>
      </section>
      <section className="form-card">
        <header className="form-heading"><h2>{copy.formTitle}</h2><p>{copy.formLead}</p></header>
        <form className="checkin-form" onSubmit={submit} noValidate>
          <div className="field first-field">
            <label htmlFor="fullName">Nombre</label>
            <div className="input-shell"><Icon name="user" /><input id="fullName" name="fullName" autoComplete="name" minLength={2} maxLength={120} placeholder="Ej. Sofía Gómez" required /></div>
          </div>
          <div className="field">
            <label htmlFor="phone">Teléfono</label>
            <div className="input-shell"><Icon name="phone" /><input id="phone" name="phone" type="tel" autoComplete="tel" inputMode="tel" maxLength={32} placeholder="Ej. 407 555 1234" required /></div>
            <span className="hint">Usaremos tu teléfono para identificar tus próximas visitas.</span>
          </div>
          <div className="field">
            <label htmlFor="birthday">¿Cuándo cumples años? <span className="optional">(opcional)</span></label>
            <div className="input-shell"><Icon name="calendar" /><input id="birthday" name="birthday" type="date" autoComplete="bday" max={latestBirthdayForAge()} /></div>
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
        <Illustration theme={theme} />
      </section>
    </main>
  );
}

type ConfirmationProps = {
  theme: CustomerTheme;
  primaryColor: string;
  businessName: string;
  businessType: BusinessType;
  logoUrl?: string | null;
  googleReviewUrl?: string | null;
  instagramUrl?: string | null;
  visitCount?: number;
};

export function ConfirmationView({ theme, primaryColor, businessName, businessType, logoUrl, googleReviewUrl, instagramUrl, visitCount: rawVisitCount }: ConfirmationProps) {
  const visitCount = typeof rawVisitCount === "number" && Number.isInteger(rawVisitCount) && rawVisitCount > 0 ? rawVisitCount : null;
  const filled = visitCount ? filledVisitStars(visitCount) : 0;
  return (
    <main className={`customer-screen theme-${theme} confirmation-screen`} style={customerScreenStyle(theme, primaryColor)} data-state="confirmation">
      <Decorations theme={theme} />
      <header className="confirmation-brand">
        <BrandMark logoUrl={logoUrl} initials={businessInitials(businessName)} businessName={businessName} icon={businessPresets[businessType].icon} />
        <strong>{businessName}</strong>
      </header>
      <div className="burst" aria-hidden="true">
        <Icon name="rays" className="rays" strokeWidth={0.7} />
        <span className="ok"><Icon name="check" strokeWidth={3} /></span>
      </div>
      <section className="confirmation" aria-live="polite">
        <h1>¡Listo!</h1>
        <h2>Tu visita quedó registrada</h2>
        <div className="visits">
          {visitCount && (
            <>
              <p className="visit-count" data-visit-count={visitCount}>{visitCountLabel(visitCount)}</p>
              <div className="stars" role="img" aria-label={`${filled} de ${maxVisitStars} estrellas`}>
                {Array.from({ length: maxVisitStars }, (_, index) => (
                  <span key={index} className={index < filled ? "star on" : "star"}>
                    <Icon name={index < filled ? "starFilled" : "star"} />
                  </span>
                ))}
              </div>
            </>
          )}
          <p className="visit-note">Gracias por venir. La próxima vez solo toca la tarjeta otra vez.</p>
        </div>
      </section>
      <div className="confirmation-actions">
        {googleReviewUrl && (
          <a className="action primary review-link" href={googleReviewUrl} target="_blank" rel="noopener noreferrer">
            <Icon name="google" />
            <span>Déjanos una reseña en Google</span>
          </a>
        )}
        {instagramUrl && (
          <a className="action ghost instagram-link" href={instagramUrl} target="_blank" rel="noopener noreferrer">
            <Icon name="instagram" />
            <span>Seguir en Instagram</span>
          </a>
        )}
      </div>
      <p className="farewell">{customerThemeCopy[theme].farewell}</p>
    </main>
  );
}

export function BrandMark({ logoUrl, initials, businessName, icon }: { logoUrl?: string | null; initials: string; businessName: string; icon: (typeof businessPresets)[BusinessType]["icon"] }) {
  return logoUrl
    ? <img className="brand-mark logo" src={logoUrl} alt={`Logo de ${businessName}`} width="64" height="64" />
    : (
      <span className="brand-mark fallback" aria-hidden="true" data-fallback="initials">
        <Icon name={icon} className="brand-icon" />
        <span className="initials">{initials}</span>
      </span>
    );
}

function Decorations({ theme }: { theme: CustomerTheme }) {
  if (theme === "colorido") return <><span className="blob blob-one" aria-hidden="true" /><span className="blob blob-two" aria-hidden="true" /></>;
  if (theme === "moderno") return <span className="grain" aria-hidden="true" />;
  return null;
}

function Illustration({ theme }: { theme: CustomerTheme }) {
  if (theme === "elegante") {
    return (
      <svg className="illustration" viewBox="0 0 300 54" preserveAspectRatio="none" fill="none" stroke="currentColor" strokeWidth="1.3" aria-hidden="true" focusable="false">
        <path d="M0 44 C40 30 70 36 100 30 S160 22 190 30 250 38 300 26" /><path d="M0 52 C60 40 110 46 150 40 S240 36 300 44" />
        <path d="M118 30v-10h22v10M114 21l15-9 15 9M126 30v-5h6v5M200 30c0-8 3-14 3-20M203 10c-4 6-4 12-3 20M60 38c0-8 2-14 2-20" />
      </svg>
    );
  }
  if (theme === "calido") {
    return (
      <svg className="illustration" viewBox="0 0 300 54" preserveAspectRatio="none" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" aria-hidden="true" focusable="false">
        <path d="M20 40c6-6 14-6 20 0M70 34c6-6 14-6 20 0M140 42c6-6 14-6 20 0M210 36c6-6 14-6 20 0M260 44c6-6 14-6 20 0" />
        <path d="M30 37v8M80 31v8M150 39v8M220 33v8M270 41v8" />
      </svg>
    );
  }
  return null;
}

export function customerScreenStyle(theme: CustomerTheme, primaryColor: string): CSSProperties {
  const tokens = customerStyleTokens[theme];
  return {
    "--brand-color": primaryColor,
    "--brand-label": buttonTextColor(primaryColor),
    "--brand-edge": visibleAccent(primaryColor, tokens.paper, tokens.paperInk),
    "--brand-edge-confirmation": visibleAccent(primaryColor, tokens.confirmationBackground, tokens.confirmationInk),
    "--star-line": visibleAccent(primaryColor, tokens.card, tokens.confirmationInk),
    "--veil": veilGradient(theme),
    "--hero-ink": tokens.heroInk,
    "--motto-ink": tokens.mottoInk,
    "--ornament": heroOrnament(theme, primaryColor),
    "--paper": tokens.paper,
    "--paper-ink": tokens.paperInk,
    "--paper-muted": tokens.paperMuted,
    "--paper-field": tokens.paperField,
    "--paper-line": tokens.paperLine,
    "--confirmation-background": tokens.confirmationBackground,
    "--confirmation-ink": tokens.confirmationInk,
    "--confirmation-muted": tokens.confirmationMuted,
    "--card": tokens.card,
  } as CSSProperties;
}
