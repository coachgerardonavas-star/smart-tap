import { useEffect, useRef, useState, type CSSProperties, type ReactNode, type SyntheticEvent } from "react";
import "./check-in.css";
import { latestBirthdayForAge } from "../lib/privacy";
import { businessInitials, buttonTextColor, customerThemeCopy, visitStars, type CustomerTheme } from "../lib/customer-theme";
import { businessPresets, type BusinessType } from "../lib/business-presets";

type Props = { slug:string; tagCode?:string; businessName:string; primaryColor:string; privacyUrl:string; theme:CustomerTheme; tagline?:string|null; benefits:string[]; heroImageUrl?:string|null; logoUrl?:string|null; googleReviewUrl?:string|null; instagramUrl?:string|null; businessType?:BusinessType|null; demo?:boolean; demoVisitCount?:number; turnstileSiteKey?:string|null };
type SuccessData = { ok:true; businessName:string; visitCount:number };
type TurnstileApi = { render:(container:HTMLElement,options:{sitekey:string})=>string; getResponse:(widgetId:string)=>string|undefined; reset:(widgetId:string)=>void; remove:(widgetId:string)=>void };
const turnstileApi = () => (window as Window & {turnstile?:TurnstileApi}).turnstile;

export default function CheckInForm({ slug,tagCode="",businessName,primaryColor,privacyUrl,theme,tagline,benefits,heroImageUrl,logoUrl,googleReviewUrl,instagramUrl,businessType,demo=false,demoVisitCount=3,turnstileSiteKey=null }:Props) {
  const [pending,setPending]=useState(false), [error,setError]=useState("");
  const [success,setSuccess]=useState<SuccessData|null>(null);
  const turnstileContainer=useRef<HTMLDivElement>(null), turnstileWidget=useRef<string|null>(null);
  useEffect(()=>{
    if(!turnstileSiteKey||demo||success)return;
    const renderWidget=()=>{const api=turnstileApi();if(!api||!turnstileContainer.current||turnstileWidget.current)return Boolean(turnstileWidget.current);turnstileWidget.current=api.render(turnstileContainer.current,{sitekey:turnstileSiteKey});return true;};
    const timer=renderWidget()?undefined:window.setInterval(()=>{if(renderWidget())window.clearInterval(timer);},200);
    return()=>{if(timer)window.clearInterval(timer);if(turnstileWidget.current)turnstileApi()?.remove(turnstileWidget.current);turnstileWidget.current=null;};
  },[turnstileSiteKey,demo,success]);
  const copy=customerThemeCopy[theme], initials=businessInitials(businessName);
  const style={"--brand-color":primaryColor,"--brand-label":buttonTextColor(primaryColor)} as CSSProperties;
  async function submit(event:SyntheticEvent<HTMLFormElement>){
    event.preventDefault();setPending(true);setError("");const form=new FormData(event.currentTarget);
    const payload={slug,tagCode,fullName:form.get("fullName"),phone:form.get("phone"),birthday:form.get("birthday"),consent:form.get("consent")==="on",whatsappOptIn:form.get("whatsappOptIn")==="on",website:form.get("website"),turnstileToken:turnstileWidget.current?turnstileApi()?.getResponse(turnstileWidget.current)??"":form.get("cf-turnstile-response")};
    if(demo){setSuccess({ok:true,businessName,visitCount:demoVisitCount});setPending(false);return;}
    try{const response=await fetch("/api/public/check-in",{method:"POST",headers:{"content-type":"application/json",accept:"application/json"},body:JSON.stringify(payload)});const body=await response.json();if(!response.ok)throw new Error(body.error||"No pudimos registrar la visita.");setSuccess(body);}
    catch(caught){setError(caught instanceof Error?caught.message:"No pudimos registrar la visita.");if(turnstileWidget.current)turnstileApi()?.reset(turnstileWidget.current);}finally{setPending(false);}
  }
  if(success){const stars=visitStars(success.visitCount);return <main className={`customer-screen theme-${theme} confirmation-screen`} style={style} data-state="confirmation">
    <div className="confirmation-shape confirmation-shape-one" aria-hidden="true"/><div className="confirmation-shape confirmation-shape-two" aria-hidden="true"/>
    <header className="confirmation-brand"><BrandMark logoUrl={logoUrl} initials={initials} businessName={businessName} businessType={businessType}/><strong>{businessName}</strong></header>
    <section className="confirmation" aria-live="polite"><div className="check" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6 9 17l-5-5"/></svg></div><h1>¡Listo!</h1><h2>Tu visita quedó registrada</h2>
      <div className="visit-card"><strong>Esta es tu visita número {success.visitCount}</strong><div className="stars" aria-label={`${Math.min(success.visitCount,5)} de 5 estrellas`}>{stars.map((filled,index)=><span className={`star ${filled?"filled":""}`} key={index} aria-hidden="true"><Icon name="star"/></span>)}</div><small>La próxima vez, solo toca la tarjeta otra vez.</small></div>
    </section><div className="social-actions">{googleReviewUrl&&<a className="review-link" href={googleReviewUrl} target="_blank" rel="noreferrer"><Icon name="star"/><span>Déjanos una reseña en Google</span></a>}{instagramUrl&&<a className="instagram-link" href={instagramUrl} target="_blank" rel="noreferrer"><Icon name="instagram"/><span>Seguir en Instagram</span></a>}</div><p className="confirmation-foot">¡Vuelve pronto!</p>
  </main>;}
  return <main className={`customer-screen theme-${theme}`} style={style} data-state="form"><section className="brand-hero">
    {heroImageUrl&&<img className="hero-image" src={heroImageUrl} alt="" width="1200" height="900" sizes="(max-width: 780px) 100vw, 60vw" fetchPriority="high"/>}<div className="hero-overlay" aria-hidden="true"/>
    <div className="brand-lockup"><BrandMark logoUrl={logoUrl} initials={initials} businessName={businessName} businessType={businessType}/><div className="brand-text"><strong>{businessName}</strong><span className="business-subtitle">{businessType?businessPresets[businessType].label:"Negocio local"}</span></div></div>
    {tagline&&<p className="brand-tagline">{tagline}</p>}<div className="hero-copy"><h1>{theme==="colorido"?`¡Únete al club ${businessName}!`:theme==="moderno"?"REGÍSTRATE Y TE TENEMOS PRESENTE":copy.heroTitle}</h1><ul>{benefits.map((benefit,index)=><li key={`${benefit}-${index}`}><span className="benefit-icon" aria-hidden="true"><Icon name={index===0?"gift":index===1?"star":"cake"}/></span><span><strong>{benefit}</strong><small>{index===0?"Solo para clientes del club":index===1?"Cada visita cuenta":"Porque siempre es buen momento"}</small></span></li>)}</ul></div>
  </section><section className="form-panel"><header className="form-heading"><h2>{copy.formTitle}</h2><p>{copy.formLead}</p></header><form className="checkin-form" onSubmit={submit} noValidate>
    <Field icon="user"><label htmlFor="fullName">{theme==="moderno"?"NOMBRE":"Nombre"}</label><input id="fullName" name="fullName" autoComplete="name" minLength={2} maxLength={120} required/></Field>
    <Field icon="phone"><label htmlFor="phone">{theme==="moderno"?"TELÉFONO":"Teléfono"}</label><input id="phone" name="phone" type="tel" autoComplete="tel" inputMode="tel" maxLength={32} required/><span className="hint">Usaremos tu teléfono para identificar tus próximas visitas.</span></Field>
    <Field icon="cake"><label htmlFor="birthday">¿Cuándo cumples años? <span className="optional">(opcional)</span></label><input id="birthday" name="birthday" type="date" autoComplete="bday" max={latestBirthdayForAge()}/><span className="hint">Déjanos tu fecha de cumpleaños y podremos sorprenderte con descuentos, regalos o beneficios especiales en tu día.</span></Field>
    <div className="honeypot" aria-hidden="true"><label htmlFor="website">Sitio web</label><input id="website" name="website" tabIndex={-1} autoComplete="off"/></div>
    <label className="consent"><input name="consent" type="checkbox" required/><span>Acepto que {businessName} guarde estos datos para registrar mis visitas y comunicarse conmigo según su <a href={privacyUrl} target="_blank" rel="noreferrer">política de privacidad</a>. Tengo 13 años o más.</span></label>
    <label className="consent whatsapp-consent"><input name="whatsappOptIn" type="checkbox" /><span>Recibe ofertas y sorpresas de cumpleaños de {businessName} por WhatsApp. Puedes pedir que paren cuando quieras.</span></label>
    {turnstileSiteKey&&<div className="turnstile-slot" ref={turnstileContainer}/>} {error&&<div className="form-alert" role="alert">{error}</div>}<button type="submit" disabled={pending}>{pending?"Registrando…":copy.submitLabel}</button><p className="privacy-note">Puedes pedir al negocio que consulte, corrija o elimine tus datos.</p><div className="form-illustration" aria-hidden="true"><Icon name={businessType??"store"}/></div>
  </form></section></main>;
}

function Field({icon,children}:{icon:string;children:ReactNode}){return <div className="field"><Icon name={icon}/><div>{children}</div></div>}
function BrandMark({logoUrl,initials,businessName,businessType}:{logoUrl?:string|null;initials:string;businessName:string;businessType?:BusinessType|null}){return logoUrl?<img className="brand-mark logo" src={logoUrl} alt={`Logo de ${businessName}`} width="64" height="64"/>:<span className="brand-mark initials" aria-label={`Marca de ${businessName}`}><b>{initials}</b><Icon name={businessType??"store"}/></span>}
function Icon({name}:{name:string}):ReactNode{const common={viewBox:"0 0 24 24",fill:"none",stroke:"currentColor",strokeWidth:1.8,strokeLinecap:"round" as const,strokeLinejoin:"round" as const,"aria-hidden":true};const p:Record<string,ReactNode>={
 user:<><circle cx="12" cy="8" r="3"/><path d="M5 21a7 7 0 0 1 14 0"/></>,phone:<path d="M6.6 2.8 9 2l2 5-2 1.2a15 15 0 0 0 6.8 6.8L17 13l5 2-1 2.5c-.6 1.6-2.2 2.5-3.8 2C10.5 17.8 6.2 13.5 4.5 6.8 4.1 5.1 5 3.5 6.6 2.8Z"/>,gift:<><path d="M4 10h16v11H4zM2.5 6.5h19V10h-19zM12 6.5V21"/><path d="M12 6.5C9 6.5 7 5.8 7 4.3 7 2 11 2.2 12 6.5Zm0 0c3 0 5-.7 5-2.2 0-2.3-4-2.1-5 2.2Z"/></>,star:<path d="m12 2.8 2.85 5.78 6.38.93-4.62 4.5 1.09 6.36L12 17.37l-5.7 3 1.09-6.36-4.62-4.5 6.38-.93L12 2.8Z"/>,cake:<><path d="M4 11h16v10H4zM4 15c2 0 2 2 4 2s2-2 4-2 2 2 4 2 2-2 4-2M8 11V8m4 3V7m4 4V8"/></>,instagram:<><rect x="3" y="3" width="18" height="18" rx="5"/><circle cx="12" cy="12" r="4"/><circle cx="17.5" cy="6.5" r=".7" fill="currentColor"/></>,
 restaurante:<><path d="M7 3v18M4 3v6a3 3 0 0 0 6 0V3M17 3v18M17 3c3 2 3 8 0 10"/></>,cafe:<><path d="M4 8h13v7a5 5 0 0 1-5 5H9a5 5 0 0 1-5-5zM17 10h2a3 3 0 0 1 0 6h-2M7 3v2m4-2v2m4-2v2"/></>,panaderia:<><path d="M12 21V7M12 9C8 9 5 7 5 4c4 0 7 2 7 5Zm0 5c4 0 7-2 7-5-4 0-7 2-7 5Zm0 5c-4 0-7-2-7-5 4 0 7 2 7 5Z"/></>,barberia:<><circle cx="7" cy="7" r="3"/><circle cx="7" cy="17" r="3"/><path d="m9.5 8.5 11 9.5M9.5 15.5l11-9.5"/></>,salon:<><path d="M12 3c2 4 5 6 8 7-2 6-5 10-8 11-3-1-6-5-8-11 3-1 6-3 8-7Z"/></>,heladeria:<><path d="m7 10 5 11 5-11z"/><path d="M7 10a5 5 0 0 1 10 0Z"/></>,tienda:<><path d="M4 9v12h16V9M3 9l2-6h14l2 6M8 21v-7h8v7"/></>,store:<path d="M4 9v12h16V9M3 9l2-6h14l2 6"/>,gimnasio:<><path d="M3 9v6m4-8v10m10-10v10m4-8v6M7 12h10"/></>};return <svg {...common}>{p[name]??p.store}</svg>}
