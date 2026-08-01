// test/testar-inscrever-local.mjs
// Testa a lógica de api/inscrever.js sem rede e sem tocar no Notion.
// Substitui o fetch por um espião e confere o que seria enviado.
//
// Uso: node test/testar-inscrever-local.mjs

import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const handler = require('../api/inscrever.js');

process.env.NOTION_TOKEN = 'ntn_token_de_teste_com_50_caracteres_aaaaaaaaaaaa';
process.env.NOTION_DB = 'cccc23073eb6453bb5165a882ac78062';

const verde = (s) => `\x1b[32m${s}\x1b[0m`;
const vermelho = (s) => `\x1b[31m${s}\x1b[0m`;
const cinza = (s) => `\x1b[90m${s}\x1b[0m`;

let passou = 0, falhou = 0;
function checar(nome, condicao, detalhe) {
  if (condicao) { passou++; console.log(`  ${verde('PASSOU')}  ${nome}`); }
  else { falhou++; console.log(`  ${vermelho('FALHOU')}  ${nome}${detalhe ? cinza('  ' + detalhe) : ''}`); }
}

let enviado = null;
globalThis.fetch = async (url, opcoes) => {
  enviado = { url, corpo: JSON.parse(opcoes.body), headers: opcoes.headers };
  return { ok: true, status: 200, json: async () => ({ id: 'pagina-fake-123' }) };
};

function chamar(metodo, corpo) {
  enviado = null;
  const req = { method: metodo, body: corpo, headers: {} };
  let saida = { status: 0, json: null };
  const res = {
    setHeader() {},
    status(s) { saida.status = s; return this; },
    json(j) { saida.json = j; return this; },
    end() { return this; }
  };
  return handler(req, res).then(() => saida);
}

console.log('\nTeste local de api/inscrever.js (sem rede)\n');

console.log('1. Health check');
{
  const r = await chamar('GET');
  checar('responde 200', r.status === 200);
  checar('reporta configurado', r.json.configured === true);
  checar('mostra o nome das variáveis', r.json.tokenEnv === 'NOTION_TOKEN' && r.json.dbEnv === 'NOTION_DB');
}

console.log('\n2. Validação');
{
  const r = await chamar('POST', { email: 'invalido' });
  checar('recusa e-mail inválido', r.status === 400 && r.json.error === 'email_invalido');
}
{
  const r = await chamar('POST', {});
  checar('recusa corpo vazio', r.status === 400);
}
{
  const r = await chamar('PUT', {});
  checar('recusa método errado', r.status === 405);
}

console.log('\n3. Honeypot');
{
  const r = await chamar('POST', { email: 'bot@teste.com', empresa: 'robo' });
  checar('descarta e não chama o Notion', r.status === 200 && r.json.ignorado === true && enviado === null);
}

console.log('\n4. Lead completo');
{
  const r = await chamar('POST', {
    nome: '  Cristiano   Creczyenski ',
    email: 'CRISTIANO@Metris.Digital',
    telefone: '(54) 99904-7085',
    material: 'Popup Diagnóstico 360',
    origem: '/mentoria'
  });
  const p = enviado ? enviado.corpo.properties : {};
  checar('responde ok', r.status === 200 && r.json.ok === true);
  checar('chama a API do Notion', enviado && enviado.url === 'https://api.notion.com/v1/pages');
  checar('usa a base certa', enviado && enviado.corpo.parent.database_id === process.env.NOTION_DB);
  checar('e-mail em minúsculo no título', p['E-mail'] && p['E-mail'].title[0].text.content === 'cristiano@metris.digital');
  checar('nome limpo de espaços', p['Nome'] && p['Nome'].rich_text[0].text.content === 'Cristiano Creczyenski');
  checar('telefone normalizado', p['Telefone'] && p['Telefone'].phone_number === '+55 54 99904-7085',
    p['Telefone'] ? p['Telefone'].phone_number : 'ausente');
  checar('material correto', p['Material'] && p['Material'].select.name === 'Popup Diagnóstico 360');
  checar('origem gravada', p['Origem'] && p['Origem'].rich_text[0].text.content === '/mentoria');
  checar('status Novo', p['Status'] && p['Status'].select.name === 'Novo');
  checar('retorna o que gravou', r.json.gravou && r.json.gravou.nome === true && r.json.gravou.telefone === true);
}

console.log('\n5. Lead só com e-mail (formulário antigo)');
{
  const r = await chamar('POST', { email: 'so-email@teste.com' });
  const p = enviado ? enviado.corpo.properties : {};
  checar('grava mesmo assim', r.status === 200 && r.json.ok === true);
  checar('material default Newsletter', p['Material'] && p['Material'].select.name === 'Newsletter');
  checar('não cria Nome vazio', !('Nome' in p));
  checar('não cria Telefone vazio', !('Telefone' in p));
}

console.log('\n6. Telefone em formatos diferentes');
for (const [entrada, esperado] of [
  ['5554999047085', '+55 54 99904-7085'],
  ['54 3333-4444', '+55 54 3333-4444'],
  ['999', ''],
]) {
  await chamar('POST', { email: 'a@b.com', telefone: entrada });
  const p = enviado.corpo.properties;
  const obtido = p['Telefone'] ? p['Telefone'].phone_number : '';
  checar(`"${entrada}" vira "${esperado || 'nada'}"`, obtido === esperado, `obtido "${obtido}"`);
}

console.log('\n7. Erro do Notion');
{
  globalThis.fetch = async () => ({ ok: false, status: 400, json: async () => ({ message: 'property does not exist' }) });
  const r = await chamar('POST', { email: 'a@b.com' });
  checar('devolve erro tratado', r.status === 502 && r.json.error === 'notion_recusou');
  checar('inclui o detalhe do Notion', String(r.json.detalhe).includes('property does not exist'));
}

console.log('\n' + '─'.repeat(58));
console.log(`${passou} passaram, ${falhou} falharam\n`);
process.exit(falhou ? 1 : 0);
