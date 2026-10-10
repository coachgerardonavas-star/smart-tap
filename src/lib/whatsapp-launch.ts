function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (character) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
  })[character]!);
}

export function whatsappLaunchResponse(url: string): Response {
  const parsed = new URL(url);
  if (parsed.protocol !== "https:" || parsed.hostname !== "wa.me") {
    throw new Error("Invalid WhatsApp launch URL");
  }
  const safeHref = escapeHtml(parsed.toString());
  const scriptUrl = JSON.stringify(parsed.toString()).replace(/</g, "\\u003c");
  const html = `<!doctype html><html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>Abriendo WhatsApp | Smart Tap</title><style>body{margin:0;min-height:100vh;display:grid;place-items:center;padding:24px;box-sizing:border-box;background:#f7f8fa;color:#182230;font-family:Inter,system-ui,sans-serif}.card{width:min(480px,100%);padding:28px;border:1px solid #e4e7ec;border-radius:18px;background:#fff;box-shadow:0 8px 24px rgba(16,24,40,.08);text-align:center}.button{display:inline-flex;align-items:center;justify-content:center;min-height:48px;padding:0 20px;border-radius:11px;background:#087f5b;color:#fff;font-weight:750;text-decoration:none}.muted{color:#667085}</style></head><body><main class="card"><h1>Abriendo WhatsApp…</h1><p class="muted">Si WhatsApp no se abre automáticamente, toca el botón.</p><p><a class="button" href="${safeHref}">Abrir WhatsApp</a></p></main><script>window.location.replace(${scriptUrl});</script></body></html>`;
  return new Response(html, {
    status: 200,
    headers: { "content-type": "text/html; charset=utf-8", "cache-control": "private, no-store" },
  });
}
