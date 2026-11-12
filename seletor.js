/* ── Seletor de horario do CRM (11/11/2026) ──────────────────────────────
   Substitui o calendario do GHL: o lead escolhe quando quer a ligacao e o CRM
   cria a tarefa "Ligacao: confirmar pre-agendamento" e leva o lead para
   Aplicacao (POST /api/pre-agendamento/v1). Identifica o lead pelo ?sid= (o
   submission_id da captura do Playbook, repassado pelo quiz).
   Sem sid: identifica pelo e-mail + telefone da URL (o CRM confere os dois na
   mesma captura). 12/11/2026: o calendario do GHL saiu da pagina. Erro do CRM
   mostra aviso com "Tentar de novo"; sem nenhum dado do lead, avisa que o time
   chama no WhatsApp. */
(function () {
  var API = 'https://crm.fullsalessystem.com.br/api/pre-agendamento/v1';
  var box = document.getElementById('pb-seletor');
  if (!box) return;
  var sid = pbQuery('sid');
  var email = pbQuery('email');
  var telefone = pbQuery('phone');
  var escolhido = null;

  /* Sem o calendario do GHL: o aviso fica na propria caixa. comBotao = deixa tentar de novo. */
  function falha(motivo, texto, comBotao) {
    pbDl('pb_seletor_fallback', { motivo: motivo });
    enviando = false;
    box.textContent = '';
    box.appendChild(el('h3', 'pbs-titulo', 'Quando podemos te ligar?'));
    box.appendChild(el('p', 'pbs-sub', texto));
    if (comBotao) {
      var b = el('button', 'pbs-confirmar', 'Tentar de novo');
      b.type = 'button';
      b.onclick = function () { box.textContent = ''; box.appendChild(el('p', 'pbs-sub', 'Carregando horários…')); carregar(); };
      box.appendChild(b);
    }
  }
  var FALHA_CRM = 'Não conseguimos carregar a agenda agora. Tente de novo em instantes. Se preferir, aguarde: nosso time vai te chamar no WhatsApp.';

  function el(tag, cls, txt) {
    var e = document.createElement(tag);
    if (cls) e.className = cls;
    if (txt) e.textContent = txt;
    return e;
  }

  var enviando = false;
  function enviar(corpo, btn) {
    /* Um envio por vez: "Pode me ligar agora" e "Confirmar" sao botoes diferentes. */
    if (enviando) return;
    enviando = true;
    btn.disabled = true;
    var antes = btn.textContent;
    btn.textContent = 'Confirmando…';
    if (/^[a-zA-Z0-9-]{8,80}$/.test(sid)) corpo.sid = sid;
    else { corpo.email = email; corpo.telefone = telefone; }
    corpo.perfil = PB_VARIANTE === 'semi' ? 'semi' : 'qualificado';
    fetch(API, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(corpo) })
      .then(function (r) { return r.json().catch(function () { return {}; }).then(function (j) { return { r: r, j: j }; }); })
      .then(function (x) {
        if (x.r.ok) return pbAgendou('seletor_crm');
        if (x.r.status >= 500) return falha('crm_' + x.r.status, FALHA_CRM, true);
        /* 400/429: horario venceu ou muitas tentativas. Mostra a mensagem e recarrega a lista. */
        aviso.textContent = x.j.error || 'Não deu certo. Escolha outro horário.';
        enviando = false;
        btn.disabled = false;
        btn.textContent = antes;
        carregar();
      })
      .catch(function () { falha('rede', FALHA_CRM, true); });
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
        if (!d || !d.dias || !d.dias.length) return falha('sem_horarios', FALHA_CRM, true);
        escolhido = null;
        render(d);
      })
      .catch(function () { falha('horarios_indisponiveis', FALHA_CRM, true); });
  }
  if (!/^[a-zA-Z0-9-]{8,80}$/.test(sid) && !(email && telefone)) {
    falha('sem_identificacao', 'Recebemos seu cadastro. Nosso time vai te chamar no WhatsApp para combinar o melhor horário da ligação.', false);
    return;
  }
  carregar();
})();
