/* ── dataLayer (GTM-MK7SRXJ9) ──────────────────────────────
   Eventos p/ mapear no GTM: pb_calendly_booked
   (pb_calendly_view é pushado inline no <head> do index.html)
   Params comuns em todo push: variante ('qualificado'|'semi'), funil ('playbook') */
var PB_VARIANTE = 'qualificado';
function pbDl(evt, params) {
  window.dataLayer = window.dataLayer || [];
  window.dataLayer.push(Object.assign({ event: evt, variante: PB_VARIANTE, funil: 'playbook' }, params || {}));
}

/* ── Booking GHL/LeadConnector: confirmação via postMessage + redirect ── */
var PB_REDIRECT_URL = 'https://playbook-obrigado-final.fullsalessystem.com/';
var pbBookedFired = false;

/* ── Nao agendou: tag playbook-não-agendado-trigger no GHL ──────────────
   Se o lead sai da pagina (fecha, navega ou esconde a aba/troca de app)
   sem agendar, avisa a API do quiz qualificado, que adiciona a tag.
   Se depois ele volta e agenda, a mesma API remove a tag.
   sendBeacon (text/plain) sobrevive ao fechamento da pagina. */
/* localhost: dev-server do faq03-quizz na porta 3000 */
var PB_AGENDAMENTO_API = /^(localhost|127\.0\.0\.1)$/.test(location.hostname)
  ? 'http://localhost:3000/api/agendamento'
  : 'https://playbook-quizz.fullsalessystem.com/api/agendamento';
var pbNaoAgendadoSent = false;

function pbQuery(name) {
  try { return new URLSearchParams(window.location.search).get(name) || ''; } catch (e) { return ''; }
}

function pbAgendamentoBeacon(status) {
  var email = pbQuery('email');
  var phone = pbQuery('phone');
  if (!email && !phone) return;
  var body = JSON.stringify({ status: status, email: email, phone: phone, page: window.location.href });
  try {
    if (navigator.sendBeacon && navigator.sendBeacon(PB_AGENDAMENTO_API, new Blob([body], { type: 'text/plain;charset=UTF-8' }))) return;
  } catch (e) { /* cai no fetch */ }
  try {
    fetch(PB_AGENDAMENTO_API, { method: 'POST', headers: { 'Content-Type': 'text/plain;charset=UTF-8' }, body: body, keepalive: true });
  } catch (e) { /* sem rede: nada a fazer */ }
}

function pbSaiuSemAgendar() {
  if (pbBookedFired || pbNaoAgendadoSent) return;
  pbNaoAgendadoSent = true;
  pbAgendamentoBeacon('nao-agendou');
}

window.addEventListener('pagehide', pbSaiuSemAgendar);
document.addEventListener('visibilitychange', function () {
  if (document.visibilityState === 'hidden') pbSaiuSemAgendar();
});

/* Agendou (calendario do GHL por postMessage ou seletor do CRM): conversao + obrigado-final. */
function pbAgendou(origem) {
  if (pbBookedFired) return;
  pbBookedFired = true;

  /* Saiu antes (trocou de app) e voltou pra agendar: tira a tag de nao agendado */
  if (pbNaoAgendadoSent) pbAgendamentoBeacon('agendou');

  pbDl('pb_calendly_booked', { msg_type: origem });

  /* Conversao Meta: agendamento e o evento mais valioso do funil (pixel vem via GTM) */
  if (typeof fbq === 'function') fbq('track', 'Schedule');

  /* delay p/ tag GTM disparar antes do redirect (antes era síncrono) */
  setTimeout(function () {
    window.location.href = PB_REDIRECT_URL;
  }, 300);
}

window.addEventListener('message', function (e) {
  if (!e.data) return;
  var t = e.data;
  var isBooked =
    t.type === 'appointmentBooked' || t.event === 'appointmentBooked' ||
    t.type === 'bookingConfirmation' || t.event === 'bookingConfirmation' ||
    t.action === 'appointmentBooked' ||
    (typeof t === 'string' && t.indexOf('appointmentBooked') !== -1);
  if (isBooked) pbAgendou(t.type || t.event || t.action || 'string');
});

/* ── Floating CTA: aparece após a seção #diagnostico ── */
(function () {
  var cta = document.querySelector('.floating-cta');
  var target = document.getElementById('diagnostico');
  if (cta && target) {
    new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        var visible = entry.isIntersecting || entry.boundingClientRect.top < 0;
        cta.classList.toggle('visible', visible);
      });
    }, { threshold: 0 }).observe(target);
  }
})();
