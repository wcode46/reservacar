import fs from 'fs';

const logPath = 'C:\\Users\\Wollace\\.gemini\\antigravity\\brain\\fa9278a9-2340-4b74-b59e-d6a64d1b4023\\.system_generated\\logs\\transcript.jsonl';
const outputPath = 'C:\\Users\\Wollace\\Downloads\\reservacar\\itens_funcionais_early.md';

const fileContent = fs.readFileSync(logPath, 'utf8');
const lines = fileContent.split('\n');

let foundContent = '';

// Vamos percorrer as primeiras 500 linhas
for (let i = 0; i < 500; i++) {
  const line = lines[i];
  if (!line || !line.trim()) continue;
  try {
    const json = JSON.parse(line);
    if (json.content && (json.content.includes('F1') || json.content.includes('F2') || json.content.includes('CNPJ'))) {
      foundContent += `--- PASSO ${json.step_index} (${json.type}) ---\n${json.content}\n\n`;
    }
  } catch (e) {
    //
  }
}

if (foundContent) {
  fs.writeFileSync(outputPath, foundContent, 'utf8');
  console.log('Arquivo das primeiras linhas gravado com sucesso.');
} else {
  console.log('Nada encontrado nas primeiras linhas.');
}
