/* ── Seletor de horario do CRM (11/11/2026) ──────────────────────────────
   Substitui o calendario do GHL: o lead escolhe quando quer a ligacao e o CRM
   cria a tarefa "Ligacao: confirmar pre-agendamento" e leva o lead para
   Aplicacao (POST /api/pre-agendamento/v1). Identifica o lead pelo ?sid= (o
   submission_id da captura do Playbook, repassado pelo quiz).
   Sem sid, sem horarios ou erro do CRM: mostra o calendario antigo do GHL
   (pbMostrarGhl), para o lead nunca ficar sem como agendar. */
(function () {
  var API = 'https://crm.fullsalessystem.com.br/api/pre-agendamento/v1';
  var box = document.getElementById('pb-seletor');
  if (!box) return;
  var sid = pbQuery('sid');
  var escolhido = null;

  function mostrarGhl(motivo) {
    pbDl('pb_seletor_fallback', { motivo: motivo });
    box.hidden = true;
    var w = document.getElementById('pb-ghl');
    var f = w && w.querySelector('iframe[data-src]');
    if (f) { f.src = f.getAttribute('data-src'); f.removeAttribute('data-src'); }
    if (w) w.hidden = false;
    if (!document.querySelector('script[src*="form_embed.js"]')) {
      var s = document.createElement('script');
      s.src = 'https://link.msgsndr.com/js/form_embed.js';
      document.body.appendChild(s);
    }
  }

  if (!/^[a-zA-Z0-9_-]{8,80}$/.test(sid)) return mostrarGhl('sem_sid');

  function el(tag, cls, txt) {
    var e = document.createElement(tag);
    if (cls) e.className = cls;
    if (txt) e.textContent = txt;
    return e;
  }

  function enviar(corpo, btn) {
    btn.disabled = true;
    var antes = btn.textContent;
    btn.textContent = 'Confirmando…';
    corpo.sid = sid;
    corpo.perfil = PB_VARIANTE === 'semi' ? 'semi' : 'qualificado';
    fetch(API, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(corpo) })
      .then(function (r) { return r.json().catch(function () { return {}; }).then(function (j) { return { r: r, j: j }; }); })
      .then(function (x) {
        if (x.r.ok) return pbAgendou('seletor_crm');
        if (x.r.status >= 500) return mostrarGhl('crm_' + x.r.status);
        /* 400/429: horario venceu ou muitas tentativas. Mostra a mensagem e recarrega a lista. */
        aviso.textContent = x.j.error || 'Não deu certo. Escolha outro horário.';
        btn.disabled = false;
        btn.textContent = antes;
        carregar();
      })
      .catch(function () { mostrarGhl('rede'); });
  }

  var aviso = el('p', 'pbs-aviso');
  aviso.setAttribute('role', 'alert');

  function render(dados) {
    box.textContent = '';
    box.appendChild(el('h3', 'pbs-titulo', 'Quando podemos te ligar?'));
    box.appendChild(el('p', 'pbs-sub', 'Escolha o melhor horário. Um consultor do nosso time liga pra você nesse horário (horário de Brasília).'));
    if (dados.agora) {
      var ja = el('button', 'pbs-agora', 'Pode me ligar agora');
      ja.type = 'button';
      ja.onclick = function () { enviar({ agora: true }, ja); };
      box.appendChild(ja);
      box.appendChild(el('p', 'pbs-ou', 'ou escolha um horário'));
    }
    var abas = el('div', 'pbs-dias');
    abas.setAttribute('role', 'tablist');
    var grade = el('div', 'pbs-horas');
    var confirmar = el('button', 'pbs-confirmar', 'Escolha um horário');
    confirmar.type = 'button';
    confirmar.disabled = true;
    confirmar.onclick = function () { if (escolhido) enviar({ inicio: escolhido.inicio }, confirmar); };

    function abrir(i) {
      Array.prototype.forEach.call(abas.children, function (b, k) { b.setAttribute('aria-selected', String(k === i)); });
      grade.textContent = '';
      dados.dias[i].horarios.forEach(function (h) {
        var b = el('button', 'pbs-hora', h.rotulo);
        b.type = 'button';
        b.setAttribute('aria-pressed', String(!!escolhido && escolhido.inicio === h.inicio));
        b.onclick = function () {
          escolhido = { inicio: h.inicio, rotulo: dados.dias[i].rotulo + ' às ' + h.rotulo };
          Array.prototype.forEach.call(grade.children, function (x) { x.setAttribute('aria-pressed', String(x === b)); });
          confirmar.disabled = false;
          confirmar.textContent = 'Confirmar: ' + escolhido.rotulo;
          aviso.textContent = '';
        };
        grade.appendChild(b);
      });
    }
    dados.dias.forEach(function (d, i) {
      var b = el('button', 'pbs-dia', d.rotulo);
      b.type = 'button';
      b.setAttribute('role', 'tab');
      b.onclick = function () { abrir(i); };
      abas.appendChild(b);
    });
    box.appendChild(abas);
    box.appendChild(grade);
    box.appendChild(aviso);
    box.appendChild(confirmar);
    abrir(0);
  }

  function carregar() {
    fetch(API + '/horarios', { cache: 'no-store' })
      .then(function (r) { if (!r.ok) throw new Error('http'); return r.json(); })
      .then(function (d) {
        if (!d || !d.dias || !d.dias.length) return mostrarGhl('sem_horarios');
        escolhido = null;
        render(d);
      })
      .catch(function () { mostrarGhl('horarios_indisponiveis'); });
  }
  carregar();
})();
