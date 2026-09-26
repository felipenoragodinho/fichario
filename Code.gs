/**
 * Fichário de Inglês — servidor (Google Apps Script ligado a esta planilha)
 *
 * O que faz:
 *  - guarda aulas, progresso, estatísticas e ajustes nas abas desta planilha;
 *  - chama a IA (Gemini, do Google AI Studio) com a sua chave, que fica guardada
 *    nas propriedades do script (nunca no app nem na planilha);
 *  - responde ao app (GitHub Pages) só quando ele envia o código de acesso certo.
 *
 * Menu "Fichário" na planilha: 1) Instalar, 2) Chave do Gemini, 3) Conectar aparelhos.
 * Publicação: Implantar > Nova implantação > App da Web > Executar como: eu > Quem pode acessar: qualquer pessoa.
 */
const SERVER_VERSION = '2.0.0';
const APP_URL_DEFAULT = 'https://felipenoragodinho.github.io/fichario/';
const TAB = { aulas: 'Aulas', prog: 'Progresso', vocab: 'Vocabulário', stats: 'Estatísticas', conf: 'Config', ia: 'IA' };
const HEAD = {
  'Aulas': ['id', 'número', 'data', 'arquivo', 'itens', 'excluída', 'atualizado (servidor)', 'dados (JSON)'],
  'Progresso': ['chave', 'aula', 'inglês', 'português', 'reforço %', 'pontos', 'estabilidade (dias)', 'última revisão', 'respostas', 'acertos', 'erros', 'atualizado (servidor)', 'dados (JSON)'],
  'Vocabulário': ['aula', 'data', 'inglês', 'português', 'pronúncia', 'dica', 'exemplo', 'tradução do exemplo', 'reforço %', 'chave'],
  'Estatísticas': ['data', 'respostas', 'acertos', 'minutos'],
  'Config': ['chave', 'valor (JSON)', 'atualizado (servidor)'],
  'IA': ['chave', 'dados (JSON)', 'atualizado (servidor)'],
};
// reforço exibido = pontos × (0,35 + 0,65 × R), R = 1 / (1 + dias / (9 × estabilidade))
const REFORCO_R1C1 = '=IF(RC9=0,"",ROUND(RC6*(0.35+0.65/(1+MAX(0,NOW()-RC8)/(9*MAX(0.3,RC7))))))';
const VOCAB_R1C1 = '=IFERROR(VLOOKUP(RC10,Progresso!C1:C5,5,FALSE),"")';
const SEED_LESSONS = [{"id":"L041","data":{"v":1,"num":41,"date":"2026-09-21","file":"CLASS 41.docx","items":[{"id":"rest-relax","t":"word","en":"to rest / to relax","pt":"descansar","ex":"The doctor told me to rest.","exPt":"O médico me disse para descansar.","cl":"rest","alt":["to rest","to relax","rest","relax"],"note":"Verbos regulares: passado com -ed (rested, relaxed).","src":"To rest / to relax (ed) -> descansar"},{"id":"doctor","t":"word","en":"doctor","pt":"médico(a)","ex":"My sister is a doctor.","exPt":"Minha irmã é médica.","cl":"doctor","src":"Doctor -> médico"},{"id":"medicine","t":"word","en":"medicine","pt":"remédio / medicina","ex":"Take this medicine after meals.","exPt":"Tome este remédio depois das refeições.","cl":"medicine","note":"Pronúncia: 'MÉ-di-sin' (a força fica no começo).","src":"Medicine -> remédio / medicina"},{"id":"wrist","t":"word","en":"wrist","pt":"pulso (da mão)","ex":"She wears a watch on her wrist.","exPt":"Ela usa um relógio no pulso.","cl":"wrist","note":"O W não é pronunciado: 'rist'.","src":"Wrist -> pulso (da mão)"},{"id":"pulse","t":"word","en":"pulse","pt":"pulso (pulsar)","ex":"The nurse checked my pulse.","exPt":"A enfermeira verificou meu pulso.","cl":"pulse","note":"wrist = a parte do corpo; pulse = a batida do coração.","src":"Pulse -> pulso (pulsar)"},{"id":"forearm","t":"word","en":"forearm","pt":"antebraço","ex":"He has a tattoo on his forearm.","exPt":"Ele tem uma tatuagem no antebraço.","cl":"forearm","note":"fore (frente) + arm (braço).","src":"Forearm -> antebraço"},{"id":"look-like","t":"word","en":"to look like","pt":"aparentar, parecer…","ex":"You look like your father.","exPt":"Você se parece com o seu pai.","cl":"look like","alt":["to look like","look like"],"note":"look like + pessoa/coisa. Com adjetivo é só look: You look tired.","src":"To look like -> aparentar, parecer…"},{"id":"bad","t":"word","en":"bad","pt":"ruim","ex":"Today was a bad day.","exPt":"Hoje foi um dia ruim.","cl":"bad","src":"Bad -> ruim"},{"id":"badly","t":"word","en":"badly","pt":"mal","ex":"I slept badly last night.","exPt":"Eu dormi mal ontem à noite.","cl":"badly","note":"bad descreve coisas (a bad day); badly descreve ações (I slept badly).","src":"Badly -> mal"},{"id":"pay-off","t":"word","en":"to pay off","pt":"compensar","ex":"Your hard work will pay off.","exPt":"Seu esforço vai compensar.","cl":"pay off","alt":["to pay off","pay off"],"note":"Sentido de 'dar resultado'.","src":"To pay off / worth -> compensar / valer a pena"},{"id":"worth","t":"word","en":"worth","pt":"valer a pena","ex":"This movie is worth it!","exPt":"Esse filme vale a pena!","cl":"worth","alt":["worth","worth it","be worth"],"note":"Use com to be: It's worth it! Depois de worth, verbo com -ING: It's worth trying.","src":"To pay off / worth -> compensar / valer a pena"},{"id":"can","t":"word","en":"can","pt":"poder","ex":"I can speak a little English.","exPt":"Eu consigo falar um pouco de inglês.","cl":"can","alt":["can","to can"],"note":"Verbo modal: não usa 'to' (I can, she can). Passado: could.","src":"To can -> poder"},{"id":"could","t":"word","en":"could","pt":"poderia / passado de can","ex":"Could you help me, please?","exPt":"Você poderia me ajudar, por favor?","cl":"Could","note":"Também é 'podia / conseguia': I could swim when I was a child.","src":"Could -> poderia / passado de can"},{"id":"goal","t":"word","en":"goal / target / objective","pt":"meta","ex":"My goal is to speak English well.","exPt":"Minha meta é falar inglês bem.","cl":"goal","alt":["goal","target","objective"],"src":"Goal, target, objective -> meta"},{"id":"late","t":"word","en":"late","pt":"atrasado","ex":"Sorry, I'm late!","exPt":"Desculpe, estou atrasado!","cl":"late","note":"Também significa 'tarde': It's late. (Está tarde.)","src":"Late -> atrasado"},{"id":"deadline","t":"word","en":"deadline","pt":"prazo","ex":"The deadline for the project is Friday.","exPt":"O prazo do projeto é sexta-feira.","cl":"deadline","src":"Deadline -> prazo"},{"id":"tidy-up","t":"word","en":"tidy up","pt":"organizar / arrumar","ex":"Please tidy up your room.","exPt":"Por favor, arrume o seu quarto.","cl":"tidy up","alt":["tidy up","to tidy up","tidy"],"note":"Pronúncia: 'TÁI-di âp'.","src":"Tidy up -> organizar / arrumar"},{"id":"upstairs","t":"word","en":"upstairs","pt":"piso de cima","ex":"The bedrooms are upstairs.","exPt":"Os quartos ficam no andar de cima.","cl":"upstairs","src":"Upstairs / downstairs -> piso de cima / piso de baixo"},{"id":"downstairs","t":"word","en":"downstairs","pt":"piso de baixo","ex":"The kitchen is downstairs.","exPt":"A cozinha fica no andar de baixo.","cl":"downstairs","src":"Upstairs / downstairs -> piso de cima / piso de baixo"},{"id":"meals","t":"word","en":"meals","pt":"refeições","ex":"We have three meals a day.","exPt":"Nós fazemos três refeições por dia.","cl":"meals","alt":["meals","meal"],"note":"Singular: meal (refeição).","src":"Meals -> refeições"},{"id":"meat","t":"word","en":"meat","pt":"carne","ex":"I don't eat red meat.","exPt":"Eu não como carne vermelha.","cl":"meat","note":"Mesma pronúncia de meet (encontrar).","src":"Meat -> carne"},{"id":"cupboard","t":"word","en":"cupboard","pt":"armário da cozinha","ex":"The cups are in the cupboard.","exPt":"As xícaras estão no armário.","cl":"cupboard","note":"O P é mudo: 'CÂ-bârd'.","src":"Cupboard -> armário da cozinha"},{"id":"flight-attendant","t":"word","en":"flight attendant","pt":"comissário(a) de bordo","ex":"The flight attendant gave me some water.","exPt":"A comissária de bordo me deu um pouco de água.","cl":"flight attendant","src":"Flight attendant -> comissário de bordo"},{"id":"sick","t":"word","en":"sick","pt":"doente","ex":"I stayed home because I was sick.","exPt":"Eu fiquei em casa porque estava doente.","cl":"sick","src":"Sick -> doente"},{"id":"naughty","t":"word","en":"naughty","pt":"desobediente","ex":"The naughty dog ate my shoe.","exPt":"O cachorro levado comeu meu sapato.","cl":"naughty","note":"O GH é mudo: 'NÓ-ti'. Muito usado para crianças levadas.","src":"Naughty -> desobediente"},{"id":"soon","t":"word","en":"soon","pt":"em breve","ex":"See you soon!","exPt":"Até logo!","cl":"soon","note":"Não confunda com son / sun, que soam 'sãn'.","pron":"sun","src":"Soon -> em breve (sun)"},{"id":"son","t":"word","en":"son","pt":"filho","ex":"Their son is ten years old.","exPt":"O filho deles tem dez anos.","cl":"son","pron":"sãn","src":"Son -> filho (sãn)"},{"id":"sun","t":"word","en":"sun","pt":"sol","ex":"The sun is very hot today.","exPt":"O sol está muito quente hoje.","cl":"sun","pron":"sãn — mesma pronúncia de son","src":"Sun -> sol (sãn – mesma pronúncia)"},{"id":"give","t":"word","en":"give","pt":"dar","ex":"Can you give me a pen?","exPt":"Você pode me dar uma caneta?","cl":"give","alt":["give","to give"],"note":"Passado: gave. Particípio: given.","src":"Give -> dar (gave – passado)"},{"id":"c-bad-badly","t":"concept","en":"bad × badly","pt":"bad é adjetivo: descreve pessoas e coisas (a bad day). badly é advérbio: descreve como uma ação acontece (I slept badly).","examples":["Today was a bad day.","I slept badly last night."],"drills":[{"q":"It was a ____ day.","a":["bad"],"opts":["bad","badly"],"pt":"Foi um dia ruim."},{"q":"He sings very ____.","a":["badly"],"opts":["bad","badly"],"pt":"Ele canta muito mal."},{"q":"This is a ____ idea.","a":["bad"],"opts":["bad","badly"],"pt":"Esta é uma má ideia."},{"q":"I played ____ yesterday.","a":["badly"],"opts":["bad","badly"],"pt":"Eu joguei mal ontem."}]},{"id":"c-soon-son-sun","t":"concept","en":"soon × son × sun","pt":"soon ('sun') = em breve. son e sun têm a mesma pronúncia ('sãn'): son = filho, sun = sol. O contexto mostra qual é.","examples":["See you soon!","My son loves the sun."],"drills":[{"q":"My ____ is ten years old.","a":["son"],"opts":["son","sun","soon"],"pt":"Meu filho tem dez anos."},{"q":"The ____ is very hot today.","a":["sun"],"opts":["son","sun","soon"],"pt":"O sol está muito quente hoje."},{"q":"See you ____!","a":["soon"],"opts":["son","sun","soon"],"pt":"Até logo!"},{"q":"The class starts ____.","a":["soon"],"opts":["son","sun","soon"],"pt":"A aula começa em breve."}]}],"texts":[],"links":[],"raw":"ENGLISH CLASS\nTo rest / to relax (ed) -> descansar\nDoctor -> médico\nMedicine -> remédio / medicina\nWrist -> pulso (da mão)\nPulse -> pulso (pulsar)\nForearm -> antebraço\nTo look like -> aparentar, parecer…\nBad -> ruim\nBadly -> mal\nTo pay off / worth -> compensar / valer a pena\nTo can -> poder\nCould -> poderia / passado de can\nGoal, target, objective -> meta\nLate -> atrasado\nDeadline -> prazo\nTidy up -> organizar / arrumar\nUpstairs / downstairs -> piso de cima / piso de baixo\nMeals -> refeições\nMeat -> carne\nCupboard -> armário da cozinha\nFlight attendant -> comissário de bordo\nSick -> doente\nNaughty -> desobediente\nSoon -> em breve (sun)\nSon -> filho (sãn)\nSun -> sol (sãn – mesma pronúncia)\nGive -> dar (gave – passado)","ai":true}},{"id":"L042","data":{"v":1,"num":42,"date":"2026-09-24","file":"CLASS 42.docx","items":[{"id":"attempt","t":"word","en":"attempt","pt":"tentativa","ex":"It was my first attempt to cook rice.","exPt":"Foi minha primeira tentativa de fazer arroz.","cl":"attempt","note":"Também é verbo: to attempt = tentar.","src":"Attempt -> tentativa"},{"id":"was-able-to","t":"word","en":"I was able to / I could","pt":"eu consegui…","ex":"I was able to finish the report on time.","exPt":"Eu consegui terminar o relatório no prazo.","cl":"was able to","alt":["I was able to","I could","I was able","was able to","could"],"note":"Para algo que você conseguiu numa situação específica, prefira was able to.","src":"I was able / I could -> eu consegui…"},{"id":"fit","t":"word","en":"to fit","pt":"encaixar; caber; servir (roupa)","ex":"These shoes don't fit me.","exPt":"Esses sapatos não me servem.","cl":"fit","alt":["to fit","fit"],"note":"fit = ter o tamanho certo.","src":"To fit / to match -> encaixar…"},{"id":"match","t":"word","en":"to match","pt":"combinar; encaixar (corresponder)","ex":"Your shoes match your bag.","exPt":"Seus sapatos combinam com sua bolsa.","cl":"match","alt":["to match","match"],"note":"match = combinar (cor, estilo, par).","src":"To fit / to match -> encaixar…"},{"id":"size","t":"word","en":"size","pt":"tamanho","ex":"What size are these shoes?","exPt":"Qual é o tamanho destes sapatos?","cl":"size","src":"Size -> tamanho"},{"id":"track","t":"word","en":"to track","pt":"rastrear","ex":"I use an app to track my progress.","exPt":"Eu uso um app para acompanhar meu progresso.","cl":"track","alt":["to track","track"],"note":"Também: acompanhar (progresso, pedido, horas).","src":"To track -> rastrear"},{"id":"few","t":"word","en":"few","pt":"poucos(as)","ex":"There are few people here today.","exPt":"Há poucas pessoas aqui hoje.","cl":"few","note":"Para coisas contáveis. a few = alguns (sentido positivo).","src":"Few"},{"id":"fewer","t":"word","en":"few⟦er⟧","pt":"menos","ex":"I have fewer meetings this week.","exPt":"Eu tenho menos reuniões esta semana.","cl":"fewer","alt":["fewer"],"note":"fewer + plural (fewer cars). Para incontáveis use less (less water).","src":"Few⟦er⟧ -> menos"},{"id":"poem","t":"word","en":"poem","pt":"poema","ex":"I wrote a poem in English!","exPt":"Eu escrevi um poema em inglês!","cl":"poem","note":"Pronúncia: 'PÔU-em'.","src":"Poem -> poema"},{"id":"c-prep-ing","t":"concept","en":"Preposição + verbo com -ING","pt":"Depois de preposição (at, in, for, about, of, without…), o verbo vem com -ING.","examples":["I am good at cooking.","You are interested in working from home."],"drills":[{"q":"I am good at ____ (cook).","a":["cooking"],"opts":["cook","cooking","to cook"],"pt":"Eu sou bom em cozinhar."},{"q":"She is interested in ____ (learn) English.","a":["learning"],"opts":["learn","learning","to learn"],"pt":"Ela está interessada em aprender inglês."},{"q":"Thank you for ____ (help) me.","a":["helping"],"opts":["help","helping","to help"],"pt":"Obrigado por me ajudar."},{"q":"I'm tired of ____ (wait).","a":["waiting"],"opts":["wait","waiting","to wait"],"pt":"Estou cansado de esperar."},{"q":"He left without ____ (say) goodbye.","a":["saying"],"opts":["say","saying","to say"],"pt":"Ele saiu sem dizer tchau."}]},{"id":"c-could-able","t":"concept","en":"can → could / was able to","pt":"could = passado de can (podia, conseguia) e também 'poderia' em pedidos educados. was able to = consegui, numa situação específica.","examples":["When I was a child, I could swim.","I was able to finish on time.","Could you help me?"],"drills":[{"q":"When I was a child, I ____ swim very well.","a":["could"],"opts":["can","could","able"],"pt":"Quando eu era criança, eu nadava muito bem."},{"q":"Yesterday I was ____ to finish the report.","a":["able"],"opts":["able","could","can"],"pt":"Ontem eu consegui terminar o relatório."},{"q":"____ you open the window, please?","a":["Could"],"opts":["Could","Able","Was"],"pt":"Você poderia abrir a janela, por favor?"},{"q":"Now I ____ speak a little English.","a":["can"],"opts":["can","could","able"],"pt":"Agora eu consigo falar um pouco de inglês."}]},{"id":"c-fewer-less","t":"concept","en":"few → fewer × less","pt":"few = poucos; fewer = menos. Os dois são para coisas contáveis (cars, meetings). Para incontáveis (water, time), use less.","examples":["I have fewer meetings this week.","I drink less coffee now."],"drills":[{"q":"There are ____ cars on the street today.","a":["fewer"],"opts":["fewer","less"],"pt":"Há menos carros na rua hoje."},{"q":"I drink ____ coffee now.","a":["less"],"opts":["fewer","less"],"pt":"Eu bebo menos café agora."},{"q":"I have ____ meetings this week.","a":["fewer"],"opts":["fewer","less"],"pt":"Eu tenho menos reuniões esta semana."},{"q":"Please use ____ salt.","a":["less"],"opts":["fewer","less"],"pt":"Por favor, use menos sal."}]}],"texts":[{"title":"Poema","lines":["I could be a doctor, I could rest","But my hand in my wrist pulse ⟦for⟧ acquir⟦ing⟧ the end","They told me, doesn’t worth get sick for this","However, the goal was locked a long time","Son of the sun, delay the naughtiness","And give the last step for the upstairs"]},{"title":"Frases","lines":["I am here for try⟦ing⟧ again","I am good at cook⟦ing⟧","You are interested ⟦in⟧ ⟦work⟧ing from home"]}],"links":[{"url":"https://test-english.com/use-of-english/a1/","title":"Use of English A1 · test-english.com","done":false}],"raw":"ENGLISH CLASS\nAttempt -> tentativa\nI was able / I could -> eu consegui…\nTo fit / to match -> encaixar…\nSize -> tamanho\nTo track -> rastrear\nFew\nFew⟦er⟧ -> menos\nPoem -> poema\n\nI could be a doctor, I could rest\nBut my hand in my wrist pulse ⟦for⟧ acquir⟦ing⟧ the end\nThey told me, doesn’t worth get sick for this\nHowever, the goal was locked a long time\nSon of the sun, delay the naughtiness\nAnd give the last step for the upstairs\n\nI am here for try⟦ing⟧ again\nI am good at cook⟦ing⟧\nYou are interested ⟦in⟧ ⟦work⟧ing from home","ai":true}}];
const SEED_SETTINGS = { sessionSize: 15, newPerSession: 8, about: 'Sou coordenador de TI.', autoSpeak: true };

/* ---------------- entrada do app ---------------- */
function doGet() {
  const url = props_().getProperty('APP_URL') || APP_URL_DEFAULT;
  return HtmlService.createHtmlOutput(
    '<meta name="viewport" content="width=device-width,initial-scale=1">' +
    '<div style="font:16px/1.5 system-ui,sans-serif;padding:24px;max-width:520px">' +
    '<h2 style="margin:0 0 8px">Servidor do Fichário ativo</h2>' +
    '<p>Este endereço é usado pelo app para salvar o progresso e chamar a IA. Para estudar, abra o app:</p>' +
    '<p><a href="' + url + '" target="_blank" rel="noopener">' + url + '</a></p></div>'
  ).setTitle('Fichário · servidor');
}

function doPost(e) {
  let req = null;
  try { req = JSON.parse((e && e.postData && e.postData.contents) || '{}'); } catch (err) { return out_({ ok: false, error: { code: 'bad_request', message: 'Pedido inválido.' } }); }
  if (!checkToken_(req.k)) return out_({ ok: false, error: { code: 'unauthorized', message: 'Código de acesso inválido.' } });
  try { return out_(route_(req)); }
  catch (err) { return out_({ ok: false, error: { code: 'server', message: String(err && err.message || err) } }); }
}

function route_(req) {
  switch (req.a) {
    case 'ping': { const ss = ss_(); return { ok: true, app: 'fichario', version: SERVER_VERSION, time: Date.now(), hasKey: !!getKey_(), sheetName: ss.getName(), sheetUrl: ss.getUrl() }; }
    case 'pull': return pull_(req);
    case 'push': return push_(req);
    case 'ai': return ai_(req);
    default: return { ok: false, error: { code: 'bad_request', message: 'Ação desconhecida.' } };
  }
}

function out_(obj) { return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON); }
function props_() { return PropertiesService.getScriptProperties(); }
function getKey_() { return props_().getProperty('GEMINI_KEY') || ''; }
function checkToken_(k) { const t = props_().getProperty('TOKEN'); return !!t && typeof k === 'string' && k.length >= 16 && k === t; }
function ss_() { const id = props_().getProperty('SS_ID'); return id ? SpreadsheetApp.openById(id) : SpreadsheetApp.getActive(); }
function sheet_(name) { const ss = ss_(); return ss.getSheetByName(name) || ensureSheet_(ss, name, HEAD[name]); }
function parse_(s) { if (!s) return null; try { return JSON.parse(s); } catch (e) { return null; } }
function num_(v) { const n = Number(v); return isFinite(n) ? n : 0; }
function round_(v, d) { const f = Math.pow(10, d); return Math.round(num_(v) * f) / f; }
function dayStr_(v) {
  if (!v) return '';
  if (Object.prototype.toString.call(v) === '[object Date]') return Utilities.formatDate(v, Session.getScriptTimeZone(), 'yyyy-MM-dd');
  const s = String(v).trim(); return /^\d{4}-\d{2}-\d{2}$/.test(s) ? s : '';
}
function rows_(sh, ncols) {
  const n = sh.getLastRow() - 1; if (n < 1) return [];
  return sh.getRange(2, 1, n, ncols || sh.getLastColumn()).getValues().filter(function (r) { return r[0] !== '' && r[0] !== null; });
}
function writeAll_(sh, data, ncols) {
  const old = Math.max(0, sh.getLastRow() - 1);
  if (data.length) sh.getRange(2, 1, data.length, ncols).setValues(data);
  if (old > data.length) sh.getRange(2 + data.length, 1, old - data.length, ncols).clearContent();
}
function ensureSheet_(ss, name, head) {
  let sh = ss.getSheetByName(name);
  if (!sh) sh = ss.insertSheet(name);
  const cur = sh.getRange(1, 1, 1, head.length).getValues()[0];
  if (cur.join('|') !== head.join('|')) sh.getRange(1, 1, 1, head.length).setValues([head]);
  sh.getRange(1, 1, 1, head.length).setFontWeight('bold').setBackground('#E4EAFA');
  sh.setFrozenRows(1);
  return sh;
}

/* ---------------- sincronização ---------------- */
function pull_(req) {
  const since = num_(req.since);
  const ss = ss_();
  const res = { ok: true, time: Date.now(), lessons: [], progress: [], stats: {}, settings: null, ai: {}, hasKey: !!getKey_(), sheetName: ss.getName(), sheetUrl: ss.getUrl() };
  rows_(sheet_(TAB.aulas), 8).forEach(function (r) {
    const upd = num_(r[6]); if (upd <= since) return;
    const del = r[5] === true || String(r[5]).toLowerCase() === 'true';
    if (del) { res.lessons.push({ id: String(r[0]), del: true, upd: upd }); return; }
    const d = parse_(r[7]); if (d) res.lessons.push({ id: String(r[0]), upd: upd, data: d });
  });
  rows_(sheet_(TAB.prog), 13).forEach(function (r) {
    const upd = num_(r[11]); if (upd <= since) return;
    const e = parse_(r[12]); if (e) res.progress.push({ gid: String(r[0]), e: e });
  });
  rows_(sheet_(TAB.stats), 4).forEach(function (r) {
    const day = dayStr_(r[0]); if (!day) return;
    res.stats[day] = { n: num_(r[1]), ok: num_(r[2]), ms: Math.round(num_(r[3]) * 60000) };
  });
  rows_(sheet_(TAB.conf), 3).forEach(function (r) {
    if (String(r[0]) === 'settings' && num_(r[2]) > since) res.settings = parse_(r[1]);
  });
  rows_(sheet_(TAB.ia), 3).forEach(function (r) {
    if (num_(r[2]) > since) { const d = parse_(r[1]); if (d) res.ai[String(r[0])] = d; }
  });
  return res;
}

function push_(req) {
  const lock = LockService.getScriptLock();
  lock.waitLock(25000);
  try {
    const now = Date.now();
    let lessonsChanged = false;
    if ((req.lessons && req.lessons.length) || (req.dels && req.dels.length)) lessonsChanged = upsertLessons_(req.lessons || [], req.dels || [], now);
    if (req.progress && req.progress.length) upsertProgress_(req.progress, now);
    if (req.stats && Object.keys(req.stats).length) upsertStats_(req.stats);
    if (req.settings) upsertKV_(TAB.conf, 'settings', req.settings, now);
    if (req.ai) Object.keys(req.ai).forEach(function (name) { if (req.ai[name]) upsertKV_(TAB.ia, name, req.ai[name], now); });
    if (lessonsChanged) rebuildVocab_();
    return { ok: true, time: now };
  } finally { lock.releaseLock(); }
}

function lessonRow_(id, d, now) {
  let json = JSON.stringify(d);
  if (json.length > 49000) json = JSON.stringify(Object.assign({}, d, { raw: '' }));
  if (json.length > 49000) throw new Error('Aula grande demais para uma célula (' + json.length + ' caracteres).');
  return [id, d.num || '', d.date || '', d.file || '', (d.items || []).length, false, now, json];
}

function upsertLessons_(list, dels, now) {
  const sh = sheet_(TAB.aulas);
  const data = rows_(sh, 8);
  const idx = {}; data.forEach(function (r, i) { idx[String(r[0])] = i; });
  let changed = false; const removed = [];
  list.forEach(function (L) {
    if (!L || !L.id || !L.data) return;
    const i = idx[L.id];
    if (i !== undefined) { const cur = parse_(data[i][7]); if (cur && num_(cur.u) > num_(L.data.u)) return; }
    const row = lessonRow_(String(L.id), L.data, now);
    if (i !== undefined) data[i] = row; else { idx[L.id] = data.length; data.push(row); }
    changed = true;
  });
  dels.forEach(function (D) {
    const i = idx[D.id]; if (i === undefined) return;
    const cur = parse_(data[i][7]); if (cur && num_(cur.u) > num_(D.t)) return;
    data[i] = [String(D.id), data[i][1], data[i][2], data[i][3], 0, true, now, ''];
    removed.push(String(D.id)); changed = true;
  });
  if (changed) writeAll_(sh, data, 8);
  if (removed.length) {
    const ps = sheet_(TAB.prog);
    const keep = rows_(ps, 13).filter(function (r) { return removed.indexOf(String(r[0]).split(':')[0]) < 0; });
    writeAll_(ps, keep, 13);
    if (keep.length) ps.getRange(2, 5, keep.length, 1).setFormulaR1C1(REFORCO_R1C1);
  }
  return changed;
}

function upsertProgress_(list, now) {
  const sh = sheet_(TAB.prog);
  const data = rows_(sh, 13);
  const idx = {}; data.forEach(function (r, i) { idx[String(r[0])] = i; });
  list.forEach(function (P) {
    if (!P || !P.gid || !P.e) return;
    const i = idx[P.gid];
    if (i !== undefined) { const cur = parse_(data[i][12]); if (cur && num_(cur.u) > num_(P.e.u)) return; }
    const e = P.e;
    const row = [String(P.gid), P.aula || (i !== undefined ? data[i][1] : ''), P.en || (i !== undefined ? data[i][2] : ''), P.pt || (i !== undefined ? data[i][3] : ''), '',
      round_(e.s, 1), round_(e.st, 2), e.lr ? new Date(e.lr) : '', num_(e.n), num_(e.ok), num_(e.ko), now, JSON.stringify(e)];
    if (i !== undefined) data[i] = row; else { idx[P.gid] = data.length; data.push(row); }
  });
  writeAll_(sh, data, 13);
  if (data.length) sh.getRange(2, 5, data.length, 1).setFormulaR1C1(REFORCO_R1C1);
}

function upsertStats_(stats) {
  const sh = sheet_(TAB.stats);
  const data = rows_(sh, 4).map(function (r) { return [dayStr_(r[0]), num_(r[1]), num_(r[2]), num_(r[3])]; }).filter(function (r) { return r[0]; });
  const idx = {}; data.forEach(function (r, i) { idx[r[0]] = i; });
  Object.keys(stats).forEach(function (day) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(day)) return;
    const e = stats[day] || {}; const row = [day, num_(e.n), num_(e.ok), round_(num_(e.ms) / 60000, 1)];
    const i = idx[day];
    if (i === undefined) { idx[day] = data.length; data.push(row); }
    else if (row[1] >= data[i][1]) data[i] = row;
  });
  data.sort(function (a, b) { return a[0] < b[0] ? -1 : a[0] > b[0] ? 1 : 0; });
  sh.getRange('A:A').setNumberFormat('@');
  writeAll_(sh, data, 4);
}

function upsertKV_(tab, key, obj, now) {
  const sh = sheet_(tab);
  const data = rows_(sh, 3);
  let i = -1; data.forEach(function (r, j) { if (String(r[0]) === key) i = j; });
  if (i >= 0) { const cur = parse_(data[i][1]); if (cur && num_(cur.u) > num_(obj.u)) return; }
  const json = JSON.stringify(obj);
  if (json.length > 49000) throw new Error('Dados grandes demais para uma célula: ' + key);
  const row = [key, json, now];
  if (i >= 0) data[i] = row; else data.push(row);
  writeAll_(sh, data, 3);
}

function rebuildVocab_() {
  const lessons = rows_(sheet_(TAB.aulas), 8)
    .filter(function (r) { return !(r[5] === true || String(r[5]).toLowerCase() === 'true'); })
    .map(function (r) { return { id: String(r[0]), d: parse_(r[7]) }; })
    .filter(function (x) { return x.d; })
    .sort(function (a, b) { return String(b.d.date || '').localeCompare(String(a.d.date || '')) || num_(b.d.num) - num_(a.d.num); });
  const rows = [];
  lessons.forEach(function (x) {
    (x.d.items || []).forEach(function (it) {
      if (!it || !it.id) return;
      const en = String(it.en || '').replace(/[⟦⟧]/g, '');
      if (it.t === 'concept') rows.push([x.d.num || '', x.d.date || '', en + ' (gramática)', it.pt || '', '', '', (it.examples || []).join(' · '), '', '', x.id + ':' + it.id]);
      else rows.push([x.d.num || '', x.d.date || '', en, it.pt || '', it.pron || '', it.note || '', it.ex || '', it.exPt || '', '', x.id + ':' + it.id]);
    });
  });
  const sh = sheet_(TAB.vocab);
  sh.getRange('B:B').setNumberFormat('@');
  writeAll_(sh, rows, 10);
  if (rows.length) sh.getRange(2, 9, rows.length, 1).setFormulaR1C1(VOCAB_R1C1);
}

/* ---------------- IA (Gemini) ---------------- */
function ai_(req) {
  const key = getKey_();
  if (!key) return { ok: false, error: { code: 'no_key', message: 'A chave do Gemini ainda não foi configurada na planilha.' } };
  const tier = req.tier === 'quick' ? 'quick' : 'default';
  const contents = buildContents_(req);
  if (!contents.length) return { ok: false, error: { code: 'bad_request', message: 'Pedido vazio.' } };
  const models = pickModels_(key, tier);
  let last = null;
  for (let k = 0; k < Math.min(3, models.length); k++) {
    const r = callGemini_(key, models[k], contents, req, tier, 0);
    if (r.ok) return { ok: true, text: r.text, model: models[k] };
    last = r.error;
    if (!r.retry) break;
  }
  return { ok: false, error: last || { code: 'upstream', message: 'Sem resposta do Gemini.' } };
}

function buildContents_(req) {
  let msgs = [];
  if (Array.isArray(req.messages)) msgs = req.messages.map(function (m) { return { role: m && (m.role === 'assistant' || m.role === 'model') ? 'model' : 'user', text: String((m && m.content) || '') }; });
  else if (req.prompt) msgs = [{ role: 'user', text: String(req.prompt) }];
  const out = [];
  msgs.filter(function (m) { return m.text.trim(); }).forEach(function (m) {
    const last = out[out.length - 1];
    if (last && last.role === m.role) last.parts[0].text += '\n\n' + m.text;
    else out.push({ role: m.role, parts: [{ text: m.text }] });
  });
  if (out.length && out[0].role !== 'user') out.unshift({ role: 'user', parts: [{ text: '(início da conversa)' }] });
  if (out.length && out[out.length - 1].role !== 'user') out.push({ role: 'user', parts: [{ text: 'Continue.' }] });
  return out;
}

function listModels_(key) {
  const cache = CacheService.getScriptCache();
  const hit = cache.get('models'); if (hit) return JSON.parse(hit);
  let names = [];
  try {
    const r = UrlFetchApp.fetch('https://generativelanguage.googleapis.com/v1beta/models?pageSize=200', { headers: { 'x-goog-api-key': key }, muteHttpExceptions: true });
    if (r.getResponseCode() === 200) {
      const j = JSON.parse(r.getContentText());
      names = (j.models || []).filter(function (m) { return (m.supportedGenerationMethods || []).indexOf('generateContent') >= 0; })
        .map(function (m) { return String(m.name || '').replace(/^models\//, ''); });
    }
  } catch (e) { names = []; }
  if (names.length) cache.put('models', JSON.stringify(names), 21600);
  return names;
}

function pickModels_(key, tier) {
  const forced = props_().getProperty(tier === 'quick' ? 'MODELO_RAPIDO' : 'MODELO_PRINCIPAL');
  const names = listModels_(key).filter(function (n) { return /flash/.test(n) && !/(tts|image|live|audio|transcribe|embed|robotics|computer|exp|8b)/i.test(n); });
  const ver = function (n) { const m = n.match(/gemini-(\d+(?:\.\d+)?)/); return m ? parseFloat(m[1]) : 0; };
  const score = function (n) { return ver(n) * 10 + (/(preview|latest)/.test(n) ? 0 : 3); };
  const lite = names.filter(function (n) { return /flash-lite/.test(n); }).sort(function (a, b) { return score(b) - score(a); });
  const full = names.filter(function (n) { return !/flash-lite/.test(n); }).sort(function (a, b) { return score(b) - score(a); });
  let order = tier === 'quick' ? lite.concat(full) : full.concat(lite);
  if (!order.length) order = tier === 'quick'
    ? ['gemini-3.5-flash-lite', 'gemini-3.1-flash-lite', 'gemini-flash-lite-latest', 'gemini-3.5-flash', 'gemini-2.5-flash-lite']
    : ['gemini-3.8-flash', 'gemini-3.5-flash', 'gemini-flash-latest', 'gemini-3.5-flash-lite', 'gemini-2.5-flash'];
  if (forced) order = [forced].concat(order.filter(function (n) { return n !== forced; }));
  return order;
}

function callGemini_(key, model, contents, req, tier, depth) {
  const cache = CacheService.getScriptCache();
  const cfg = { temperature: tier === 'quick' ? 0.7 : 0.8, maxOutputTokens: tier === 'quick' ? 2048 : 8192 };
  if (req.json) cfg.responseMimeType = 'application/json';
  if (!cache.get('nothink:' + model)) cfg.thinkingConfig = { thinkingLevel: 'low' };
  const body = { contents: contents, generationConfig: cfg };
  if (req.system) body.systemInstruction = { parts: [{ text: String(req.system).slice(0, 20000) }] };
  let resp;
  try {
    resp = UrlFetchApp.fetch('https://generativelanguage.googleapis.com/v1beta/models/' + encodeURIComponent(model) + ':generateContent', {
      method: 'post', contentType: 'application/json', headers: { 'x-goog-api-key': key }, payload: JSON.stringify(body), muteHttpExceptions: true,
    });
  } catch (e) { return { ok: false, retry: true, error: { code: 'upstream', message: String(e) } }; }
  const code = resp.getResponseCode(); const txt = resp.getContentText();
  let j = null; try { j = JSON.parse(txt); } catch (e) { j = null; }
  if (code === 200 && j) {
    const cand = (j.candidates || [])[0];
    const parts = (cand && cand.content && cand.content.parts) || [];
    const text = parts.filter(function (p) { return p && p.text && !p.thought; }).map(function (p) { return p.text; }).join('');
    if (text) return { ok: true, text: text };
    const why = (cand && cand.finishReason) || (j.promptFeedback && j.promptFeedback.blockReason) || 'EMPTY';
    return { ok: false, error: { code: /SAFETY|PROHIBITED|BLOCK/.test(why) ? 'blocked' : why === 'MAX_TOKENS' ? 'too_long' : 'empty', message: why } };
  }
  const msg = (j && j.error && j.error.message) || String(txt).slice(0, 300);
  if (code === 400 && cfg.thinkingConfig && /think/i.test(msg) && depth < 1) { cache.put('nothink:' + model, '1', 21600); return callGemini_(key, model, contents, req, tier, depth + 1); }
  if (/API key|API_KEY/i.test(msg) || code === 401 || code === 403) return { ok: false, error: { code: 'bad_key', message: msg } };
  if (code === 404 || (code === 400 && /model/i.test(msg) && /(not found|not supported|unsupported)/i.test(msg))) { cache.remove('models'); return { ok: false, retry: true, error: { code: 'model', message: msg } }; }
  if (code === 429) return { ok: false, retry: true, error: { code: 'quota', message: msg } };
  if (code >= 500) return { ok: false, retry: true, error: { code: 'upstream', message: msg } };
  return { ok: false, error: { code: 'upstream', message: msg } };
}

/* ---------------- menu da planilha ---------------- */
function onOpen() {
  SpreadsheetApp.getUi().createMenu('Fichário')
    .addItem('1. Instalar / verificar', 'instalar')
    .addItem('2. Configurar chave do Gemini', 'configurarChave')
    .addItem('3. Conectar aparelhos (link e QR)', 'conectarAparelhos')
    .addSeparator()
    .addItem('Testar a IA', 'testarIA')
    .addItem('Trocar o código de acesso', 'trocarCodigo')
    .addToUi();
}

function instalar() {
  const ss = SpreadsheetApp.getActive();
  const p = props_();
  p.setProperty('SS_ID', ss.getId());
  Object.keys(HEAD).forEach(function (name) { ensureSheet_(ss, name, HEAD[name]); });
  ['Página1', 'Sheet1', 'Planilha1'].forEach(function (n) {
    const sh = ss.getSheetByName(n);
    if (sh && ss.getSheets().length > 1 && sh.getLastRow() === 0) ss.deleteSheet(sh);
  });
  if (!p.getProperty('TOKEN')) p.setProperty('TOKEN', newToken_());
  if (!p.getProperty('APP_URL')) p.setProperty('APP_URL', APP_URL_DEFAULT);
  ss.getSheetByName(TAB.stats).getRange('A:A').setNumberFormat('@');
  ss.getSheetByName(TAB.aulas).getRange('C:C').setNumberFormat('@');
  const seeded = seed_();
  rebuildVocab_();
  ss.getSheetByName(TAB.aulas).hideColumns(8);
  ss.getSheetByName(TAB.prog).hideColumns(12, 2);
  ss.getSheetByName(TAB.conf).hideColumns(3);
  ss.getSheetByName(TAB.ia).hideColumns(3);
  ss.setActiveSheet(ss.getSheetByName(TAB.vocab));
  try {
    SpreadsheetApp.getUi().alert('Fichário instalado',
      (seeded ? 'As aulas 41 e 42 já foram carregadas.\n\n' : '') +
      'Próximos passos:\n• Menu Fichário > 2. Configurar chave do Gemini\n• Implantar > Nova implantação > App da Web (Executar como: eu; Quem pode acessar: qualquer pessoa)\n• Menu Fichário > 3. Conectar aparelhos',
      SpreadsheetApp.getUi().ButtonSet.OK);
  } catch (e) { /* rodando sem interface */ }
  return { ok: true, seeded: seeded };
}

function seed_() {
  const sh = sheet_(TAB.aulas);
  if (rows_(sh, 8).length) return false;
  const now = Date.now();
  const list = SEED_LESSONS.map(function (L) { const d = Object.assign({}, L.data, { u: now }); return { id: L.id, data: d }; });
  if (list.length) upsertLessons_(list, [], now);
  if (!rows_(sheet_(TAB.conf), 3).length) upsertKV_(TAB.conf, 'settings', Object.assign({}, SEED_SETTINGS, { u: now }), now);
  return list.length > 0;
}

function configurarChave() {
  const ui = SpreadsheetApp.getUi();
  const r = ui.prompt('Chave do Gemini', 'Cole aqui a chave criada no Google AI Studio (aistudio.google.com > Get API key).\nEla fica guardada só nas propriedades deste script.', ui.ButtonSet.OK_CANCEL);
  if (r.getSelectedButton() !== ui.Button.OK) return;
  const key = String(r.getResponseText() || '').trim();
  if (key.length < 20) { ui.alert('Essa chave parece incompleta. Tente de novo.'); return; }
  CacheService.getScriptCache().remove('models');
  const names = listModels_(key);
  if (!names.length) { ui.alert('Não consegui usar essa chave para listar os modelos do Gemini. Confira se copiou a chave inteira.'); return; }
  props_().setProperty('GEMINI_KEY', key);
  ui.alert('Chave salva',
    'Modelo para tarefas rápidas (conversa, correção): ' + pickModels_(key, 'quick')[0] +
    '\nModelo para tarefas maiores (organizar aula, textos): ' + pickModels_(key, 'default')[0], ui.ButtonSet.OK);
}

function testarIA() {
  const ui = SpreadsheetApp.getUi();
  const r = ai_({ prompt: 'Reply with only this JSON object: {"ok": true, "message": "Hello, Felipe!"}', json: true, tier: 'quick' });
  if (r.ok) ui.alert('A IA respondeu (' + r.model + '):\n' + r.text);
  else ui.alert('A IA não respondeu: ' + (r.error && (r.error.code + ' — ' + r.error.message)));
}

function trocarCodigo() {
  const ui = SpreadsheetApp.getUi();
  const b = ui.alert('Trocar o código de acesso?', 'Os aparelhos conectados vão precisar do novo link de conexão.', ui.ButtonSet.YES_NO);
  if (b !== ui.Button.YES) return;
  props_().setProperty('TOKEN', newToken_());
  conectarAparelhos();
}

function newToken_() { return (Utilities.getUuid() + Utilities.getUuid()).replace(/-/g, '').slice(0, 40); }

function conectarAparelhos() {
  const p = props_();
  let web = '';
  try { web = ScriptApp.getService().getUrl() || ''; } catch (e) { web = ''; }
  if (!/\/exec$/.test(web)) web = p.getProperty('WEBAPP_URL') || '';
  const t = HtmlService.createTemplate(CONNECT_HTML);
  t.web = web; t.app = p.getProperty('APP_URL') || APP_URL_DEFAULT; t.token = p.getProperty('TOKEN') || '';
  SpreadsheetApp.getUi().showModalDialog(t.evaluate().setWidth(480).setHeight(640), 'Conectar aparelhos');
}

function salvarUrls(web, app) {
  const p = props_();
  if (/^https:\/\/script\.google\.com\/.+\/exec$/.test(web || '')) p.setProperty('WEBAPP_URL', web);
  if (/^https:\/\//.test(app || '')) p.setProperty('APP_URL', app);
  return true;
}

const CONNECT_HTML = '<!doctype html><html><head><base target="_top"><meta charset="utf-8">' +
  '<style>body{font:14px/1.45 system-ui,Segoe UI,Roboto,sans-serif;margin:0;padding:4px 2px;color:#172136}label{display:block;font-weight:700;margin:10px 0 4px}' +
  'input{width:100%;box-sizing:border-box;padding:8px;border:1px solid #C4CFE0;border-radius:6px;font:13px monospace}#qr{display:grid;place-items:center;margin:12px 0;min-height:200px}' +
  '#qr svg{width:220px;height:220px}.row{display:flex;gap:8px;margin-top:8px}button,a.b{flex:1;padding:9px;border-radius:8px;border:1px solid #1F4BB8;background:#1F4BB8;color:#fff;font-weight:700;cursor:pointer;text-align:center;text-decoration:none}' +
  'button.s{background:#fff;color:#1F4BB8}.muted{color:#4A5570;font-size:13px}.warn{color:#C93C34}</style></head><body>' +
  '<p class="muted">Abra o link no computador e leia o QR com a câmera do celular. O link contém o seu código de acesso: guarde como uma senha.</p>' +
  '<label for="web">Endereço do app da Web (termina em /exec)</label><input id="web" value="<?= web ?>" placeholder="https://script.google.com/macros/s/.../exec">' +
  '<label for="app">Endereço do app (GitHub Pages)</label><input id="app" value="<?= app ?>">' +
  '<div id="qr"></div><p id="msg" class="muted"></p>' +
  '<div class="row"><button id="copy">Copiar link</button><a class="b" id="open" href="#" target="_blank" rel="noopener">Abrir o app</a></div>' +
  '<div class="row"><button class="s" onclick="google.script.host.close()">Fechar</button></div>' +
  '<script>var TOKEN = <?!= JSON.stringify(token) ?>;' +
  'function link(){var w=document.getElementById("web").value.trim(),a=document.getElementById("app").value.trim();if(!/\\/exec$/.test(w)||!/^https:\\/\\//.test(a))return "";return a.replace(/#.*$/,"")+"#b="+encodeURIComponent(w)+"&k="+TOKEN;}' +
  'function draw(){var l=link(),q=document.getElementById("qr"),m=document.getElementById("msg");document.getElementById("open").href=l||"#";' +
  'if(!l){q.innerHTML="";m.innerHTML="<span class=warn>Cole o endereço do app da Web. Ele aparece depois de Implantar &gt; Nova implantação.</span>";return;}' +
  'm.textContent=l;if(window.qrcode){var c=qrcode(0,"M");c.addData(l);c.make();q.innerHTML=c.createSvgTag({cellSize:4,margin:2,scalable:true});}' +
  'google.script.run.salvarUrls(document.getElementById("web").value.trim(),document.getElementById("app").value.trim());}' +
  'document.getElementById("web").oninput=draw;document.getElementById("app").oninput=draw;' +
  'document.getElementById("copy").onclick=function(){var l=link();if(!l)return;navigator.clipboard.writeText(l).then(function(){document.getElementById("copy").textContent="Copiado!";},function(){prompt("Copie o link:",l);});};' +
  'var s=document.createElement("script");s.src=document.getElementById("app").value.trim().replace(/\\/?$/,"/")+"qrcode.js";s.onload=draw;s.onerror=function(){var t=document.createElement("script");t.src="https://cdn.jsdelivr.net/npm/qrcode-generator@1.4.4/qrcode.js";t.onload=draw;t.onerror=draw;document.head.appendChild(t);};document.head.appendChild(s);draw();' +
  '</script></body></html>';
