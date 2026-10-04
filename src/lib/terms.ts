export const TERMS_VERSION = "2026-10-04";

export type TermsSection = {
  heading: string;
  text: string;
};

export const TERMS_COPY = {
  es: {
    title: "Términos de servicio de Smart Tap",
    sections: [
      { heading: "1. Quiénes somos.", text: 'Smart Tap es un servicio de Automate IT LLC, empresa de Florida (EE. UU.). "El negocio" es la empresa que contrata Smart Tap.' },
      { heading: "2. Qué incluye.", text: "Una ubicación, 3 tarjetas NFC configuradas (2 para registrar visitas y 1 para reseñas de Google), el panel del negocio con hasta 2 usuarios, la cola de seguimiento con mensajes sugeridos y soporte básico con hasta 2 cambios simples cada 2 semanas (por ejemplo, editar una oferta, un texto, el logo o los datos del negocio). Las integraciones, el envío automático de WhatsApp y las funciones a la medida se cotizan aparte." },
      { heading: "3. Precio y pagos.", text: "$199 de instalación + $79 al mes. Al contratar se pagan $278 (instalación + primer mes). La siguiente mensualidad se cobra 30 días después de ese primer pago, no desde la activación. Cada tarjeta NFC adicional cuesta $10. Cada ubicación adicional cuesta $79 al mes más su instalación según la tarifa vigente. Si el negocio cancela antes de que Smart Tap se active, se le devuelven los $278 completos." },
      { heading: "4. Permanencia y cancelación.", text: "Una vez activado, el compromiso mínimo es de 3 mensualidades; si el negocio cancela antes, esas 3 mensualidades se deben igual. Después del mínimo, puede cancelar con 30 días de aviso por escrito. El acceso termina al final del último periodo pagado." },
      { heading: "5. Falta de pago.", text: "Si un cobro falla, avisamos al negocio. Si a los 7 días del aviso no se ha pagado, el servicio se suspende: los datos se conservan, pero el panel y las tarjetas dejan de funcionar hasta que se pague." },
      { heading: "6. Activación.", text: "Smart Tap se activa solo cuando el dueño aprueba la configuración final: marca, usuarios, ofertas, días de inactividad, ubicación de las tarjetas, textos y enlace de Google." },
      { heading: "7. Los datos de los clientes son del negocio.", text: "El negocio es dueño de los datos de sus clientes y decide cómo usarlos. Automate IT los guarda y protege por cuenta del negocio, y no los vende ni los usa para otros fines. El negocio se compromete a mantener visible el aviso de privacidad que Smart Tap genera, a atender las solicitudes de sus clientes para ver, corregir o borrar sus datos, y a registrar solo a personas de 13 años o más. Si nos llega una solicitud de uno de sus clientes, se la pasamos al negocio." },
      { heading: "8. Mensajes y ofertas.", text: "Smart Tap sugiere mensajes con las ofertas que el dueño aprobó, pero los envía una persona del negocio desde su propio WhatsApp. El negocio es responsable del contenido y destinatarios de lo que envía, de cumplir las ofertas que promete, de respetar a quien pida no recibir más mensajes y de cumplir las leyes de mensajería y las reglas de WhatsApp." },
      { heading: "9. Uso permitido.", text: "El negocio no puede usar Smart Tap para enviar mensajes a personas que no dieron su consentimiento, cargar datos de terceros, compartir sus accesos ni intentar entrar a datos de otros negocios. Si lo hace, podemos suspender el servicio." },
      { heading: "10. Seguridad.", text: "Protegemos los datos con acceso por usuario, aislamiento entre negocios y verificación en dos pasos para administradores. Si ocurre un incidente que afecte los datos del negocio, le avisamos sin demora indebida con lo que sepamos en ese momento." },
      { heading: "11. Disponibilidad.", text: "Hacemos un esfuerzo razonable para que Smart Tap funcione siempre y avisamos el mantenimiento planeado. No garantizamos que funcione sin interrupciones ni errores." },
      { heading: "12. Sin garantía de resultados.", text: "Smart Tap ayuda a registrar visitas y dar seguimiento a clientes. No garantizamos un número de clientes, visitas, reseñas ni ventas." },
      { heading: "13. Límite de responsabilidad.", text: "La responsabilidad total de Automate IT por cualquier reclamo no pasa de lo que el negocio pagó en los 12 meses anteriores al hecho. No respondemos por daños indirectos, como ganancias perdidas, pérdida de clientes o daños a la reputación. Este límite no aplica donde la ley no lo permita." },
      { heading: "14. El negocio nos cubre.", text: "El negocio defiende y cubre a Automate IT ante reclamos que vengan de los mensajes y ofertas que envió, de datos que cargó sin permiso o del incumplimiento de estos Términos." },
      { heading: "15. Al terminar el servicio.", text: "El negocio tiene 30 días para descargar su lista de clientes. A los 90 días se borran todos sus datos de Smart Tap." },
      { heading: "16. Cambios a estos Términos.", text: "Avisamos por correo con 30 días de anticipación. Si el negocio no está de acuerdo, puede cancelar sin penalidad antes de que entren en vigor. La versión nueva se acepta al entrar al panel." },
      { heading: "17. Disputas.", text: "Primero intentamos resolverlas con mediación. Si no se resuelven, van a las cortes del condado de Orange, Florida, bajo las leyes del Estado de Florida." },
      { heading: "18. Idioma.", text: "Estos Términos están en español y en inglés. Si hay diferencias entre las dos versiones, manda el español." },
    ] satisfies TermsSection[],
    version: `Versión ${TERMS_VERSION}`,
  },
  en: {
    title: "Smart Tap Terms of Service",
    sections: [
      { heading: "1. Who we are.", text: 'Smart Tap is a service of Automate IT LLC, a Florida (USA) company. "The business" is the company that contracts Smart Tap.' },
      { heading: "2. What is included.", text: "One location, 3 configured NFC tags (2 to record visits and 1 for Google reviews), the business dashboard with up to 2 users, the follow-up queue with suggested messages, and basic support with up to 2 simple changes every 2 weeks (for example, editing an offer, a text, the logo or business details). Integrations, automated WhatsApp sending and custom features are quoted separately." },
      { heading: "3. Price and payments.", text: "$199 setup + $79 per month. At purchase the business pays $278 (setup + first month). The next monthly payment is charged 30 days after that first payment, not from activation. Each additional NFC tag costs $10. Each additional location costs $79 per month plus its setup at the current rate. If the business cancels before Smart Tap is activated, the full $278 is refunded." },
      { heading: "4. Commitment and cancellation.", text: "Once activated, the minimum commitment is 3 monthly payments; if the business cancels earlier, those 3 payments remain due. After the minimum, it may cancel with 30 days' written notice. Access ends at the end of the last paid period." },
      { heading: "5. Non-payment.", text: "If a charge fails, we notify the business. If payment is not made within 7 days of that notice, the service is suspended: data is kept, but the dashboard and tags stop working until payment is made." },
      { heading: "6. Activation.", text: "Smart Tap is activated only when the owner approves the final configuration: branding, users, offers, inactivity days, tag placement, texts and the Google link." },
      { heading: "7. Customer data belongs to the business.", text: "The business owns its customers' data and decides how it is used. Automate IT stores and protects it on the business's behalf and does not sell it or use it for other purposes. The business agrees to keep the privacy notice generated by Smart Tap visible, to handle its customers' requests to see, correct or delete their data, and to register only people aged 13 or older. If we receive a request from one of its customers, we forward it to the business." },
      { heading: "8. Messages and offers.", text: "Smart Tap suggests messages with the offers the owner approved, but a person at the business sends them from its own WhatsApp. The business is responsible for the content and recipients of what it sends, for honoring the offers it promises, for respecting anyone who asks to stop receiving messages, and for complying with messaging laws and WhatsApp rules." },
      { heading: "9. Permitted use.", text: "The business may not use Smart Tap to message people who did not consent, upload third-party data, share its credentials or attempt to access other businesses' data. If it does, we may suspend the service." },
      { heading: "10. Security.", text: "We protect data with per-user access, isolation between businesses and two-step verification for administrators. If an incident affects the business's data, we notify it without undue delay with what we know at that time." },
      { heading: "11. Availability.", text: "We make reasonable efforts to keep Smart Tap running and announce planned maintenance. We do not guarantee uninterrupted or error-free operation." },
      { heading: "12. No guaranteed results.", text: "Smart Tap helps record visits and follow up with customers. We do not guarantee any number of customers, visits, reviews or sales." },
      { heading: "13. Limitation of liability.", text: "Automate IT's total liability for any claim will not exceed what the business paid in the 12 months before the event. We are not liable for indirect damages such as lost profits, lost customers or reputational harm. This limit does not apply where the law does not allow it." },
      { heading: "14. Indemnification.", text: "The business will defend and hold Automate IT harmless from claims arising from the messages and offers it sent, data it uploaded without permission, or breach of these Terms." },
      { heading: "15. When the service ends.", text: "The business has 30 days to download its customer list. After 90 days all its data is deleted from Smart Tap." },
      { heading: "16. Changes to these Terms.", text: "We give 30 days' notice by email. If the business disagrees, it may cancel without penalty before the changes take effect. The new version is accepted when entering the dashboard." },
      { heading: "17. Disputes.", text: "We first try to resolve them through mediation. If unresolved, they go to the courts of Orange County, Florida, under Florida law." },
      { heading: "18. Language.", text: "These Terms are in Spanish and English. If the versions differ, the Spanish version prevails." },
    ] satisfies TermsSection[],
    version: `Version ${TERMS_VERSION}`,
  },
} as const;
