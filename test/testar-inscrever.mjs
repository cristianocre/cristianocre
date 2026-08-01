// test/testar-inscrever.mjs
// Testa o endpoint /api/inscrever de ponta a ponta.
//
// Uso:
//   node test/testar-inscrever.mjs                      (testa https://www.cristianocre.com)
//   node test/testar-inscrever.mjs http://localhost:3000
//
// O teste cria um lead real na base do Notion, com e-mail marcado como
// teste+<timestamp>@cristianocre.com, para você conseguir achar e apagar depois.

const BASE = (process.argv[2] || 'https://www.cristianocre.com').replace(/\/$/, '');
const URL_API = `${BASE}/api/inscrever`;

const verde = (s) => `\x1b[32m${s}\x1b[0m`;
const vermelho = (s) => `\x1b[31m${s}\x1b[0m`;
const cinza = (s) => `\x1b[90m${s}\x1b[0m`;

let passou = 0, falhou = 0;
function checar(nome, condicao, detalhe) {
  if (condicao) { passou++; console.log(`  ${verde('PASSOU')}  ${nome}`); }
  else { falhou++; console.log(`  ${vermelho('FALHOU')}  ${nome}${detalhe ? cinza('  ' + detalhe) : ''}`); }
}

async function post(corpo) {
  const r = await fetch(URL_API, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(corpo)
  });
  const dados = await r.json().catch(() => ({}));
  return { status: r.status, dados };
}

const marca = Date.now();
const emailTeste = `teste+${marca}@cristianocre.com`;

console.log(`\nTestando ${URL_API}\n`);

// 1 ---------------------------------------------------------------- health
console.log('1. Health check (GET)');
let saude = {};
try {
  const r = await fetch(URL_API);
  saude = await r.json().catch(() => ({}));
  checar('responde 200', r.status === 200, `status ${r.status}`);
  checar('está configurado', saude.configured === true, JSON.stringify(saude));
  checar('tem token do Notion', saude.hasToken === true);
  checar('tem base do Notion', saude.hasDb === true);
  if (saude.tokenEnv) console.log(cinza(`         variáveis: token=${saude.tokenEnv} base=${saude.dbEnv}`));
  if (saude.versao) console.log(cinza(`         versão da função: ${saude.versao}`));
  else console.log(cinza('         função antiga no ar: ela ainda não grava nome e telefone'));
} catch (e) {
  checar('health check acessível', false, String(e));
}

// 2 ---------------------------------------------------------------- validação
console.log('\n2. Validação de entrada');
{
  const { status, dados } = await post({ email: 'nao-e-email' });
  checar('recusa e-mail inválido', status === 400 && dados.ok === false, `status ${status} ${JSON.stringify(dados)}`);
}
{
  const { status, dados } = await post({});
  checar('recusa corpo vazio', status === 400 && dados.ok === false, `status ${status} ${JSON.stringify(dados)}`);
}

// 3 ---------------------------------------------------------------- honeypot
console.log('\n3. Anti-spam (honeypot)');
{
  const { status, dados } = await post({
    email: `bot+${marca}@cristianocre.com`, empresa: 'preenchido por robô', material: 'Newsletter'
  });
  checar('descarta envio com honeypot preenchido', status === 200 && dados.ignorado === true,
    `status ${status} ${JSON.stringify(dados)} (se a função antiga estiver no ar, esse lead foi gravado e precisa ser apagado)`);
}

// 4 ---------------------------------------------------------------- lead completo
console.log('\n4. Lead completo do pop-up');
let resultado = {};
{
  const r = await post({
    nome: 'Teste Automatizado',
    email: emailTeste,
    telefone: '(54) 99904-7085',
    material: 'Popup Diagnóstico 360',
    origem: '/teste-automatizado'
  });
  resultado = r.dados;
  checar('grava o lead', r.status === 200 && r.dados.ok === true, `status ${r.status} ${JSON.stringify(r.dados)}`);
  checar('gravou o nome', r.dados.gravou && r.dados.gravou.nome === true,
    r.dados.gravou ? '' : 'a função no ar não retorna o campo "gravou": provavelmente é a versão antiga');
  checar('gravou o telefone', r.dados.gravou && r.dados.gravou.telefone === true);
}

// 5 ---------------------------------------------------------------- resumo
console.log('\n' + '─'.repeat(58));
console.log(`${passou} passaram, ${falhou} falharam`);
console.log(`\nConfira no Notion, na base "Leads — Materiais (Site Cristianocre.com)":`);
console.log(`  E-mail:   ${emailTeste}`);
console.log(`  Nome:     Teste Automatizado`);
console.log(`  Telefone: +55 54 99904-7085`);
console.log(`  Material: Popup Diagnóstico 360`);
console.log(`  Origem:   /teste-automatizado`);
if (resultado && resultado.id) console.log(`  Página:   ${String(resultado.id)}`);
console.log(cinza('\nApague as linhas de teste depois de conferir.\n'));

process.exit(falhou ? 1 : 0);
