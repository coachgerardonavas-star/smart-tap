// D-058: every page error leaves with an HTML content type. A response
// without one is downloaded by mobile browsers (the "mfa.txt" incident).
const messages: Record<number, { title: string; body: string }> = {
  403: { title: "No tienes acceso", body: "Tu cuenta no tiene permiso para ver esta página." },
  404: { title: "Página no encontrada", body: "Revisa el enlace o vuelve al inicio." },
  500: { title: "Algo salió mal", body: "No pudimos cargar esta página. Intenta de nuevo en unos minutos." },
};

export const htmlContentType = "text/html; charset=utf-8";

export function errorPageHtml(status: number): string {
  const { title, body } = messages[status] ?? messages[500]!;
  return `<!doctype html>
<html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><meta name="robots" content="noindex">
<title>${title} | Smart Tap</title>
<style>body{margin:0;min-height:100vh;display:grid;place-items:center;padding:24px;font-family:system-ui,sans-serif;background:#f8fafc;color:#101828}main{max-width:420px;text-align:center}h1{font-size:1.6rem;margin:0 0 10px}p{color:#475467;line-height:1.5;margin:0 0 22px}a{display:inline-block;min-height:44px;line-height:44px;padding:0 20px;border-radius:10px;background:#101828;color:#fff;font-weight:700;text-decoration:none}</style>
</head><body><main><h1>${title}</h1><p>${body}</p><a href="/login">Ir a iniciar sesión</a></main></body></html>`;
}

export function errorPageResponse(status: number): Response {
  return new Response(errorPageHtml(status), { status, headers: { "content-type": htmlContentType, "cache-control": "no-store" } });
}

export function jsonErrorResponse(status: number, error: string): Response {
  return new Response(JSON.stringify({ error }), { status, headers: { "content-type": "application/json", "cache-control": "no-store" } });
}
