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

window.addEventListener('message', function (e) {
  if (!e.data) return;
  var t = e.data;
  var isBooked =
    t.type === 'appointmentBooked' || t.event === 'appointmentBooked' ||
    t.type === 'bookingConfirmation' || t.event === 'bookingConfirmation' ||
    t.action === 'appointmentBooked' ||
    (typeof t === 'string' && t.indexOf('appointmentBooked') !== -1);
  if (!isBooked || pbBookedFired) return;
  pbBookedFired = true;

  pbDl('pb_calendly_booked', { msg_type: t.type || t.event || t.action || 'string' });

  /* delay p/ tag GTM disparar antes do redirect (antes era síncrono) */
  setTimeout(function () {
    window.location.href = PB_REDIRECT_URL;
  }, 300);
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
