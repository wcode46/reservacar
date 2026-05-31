const fs = require('fs');
const path = 'C:\\Users\\Wollace\\.gemini\\antigravity\\brain\\fa9278a9-2340-4b74-b59e-d6a64d1b4023\\.system_generated\\logs\\transcript.jsonl';
if (fs.existsSync(path)) {
  const content = fs.readFileSync(path, 'utf8');
  const lines = content.split('\n');
  lines.forEach(line => {
    if (!line.trim()) return;
    try {
      const data = JSON.parse(line);
      const str = JSON.stringify(data).toLowerCase();
      if (str.includes('máscara') || str.includes('mascara') || str.includes('mask')) {
        console.log(`=== Step ${data.step_index} (${data.type}) ===`);
        if (data.content && data.content.length < 500) {
          console.log(data.content);
        } else if (data.content) {
          console.log(data.content.substring(0, 300) + '... [TRUNCATED]');
        }
        if (data.tool_calls) {
          console.log('Tool_calls length:', JSON.stringify(data.tool_calls).length);
        }
      }
    } catch (e) {
      // ignore
    }
  });
} else {
  console.log('File does not exist');
}
