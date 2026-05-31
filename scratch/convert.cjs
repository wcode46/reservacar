const fs = require('fs');
const content = fs.readFileSync('C:\\Users\\Wollace\\Downloads\\reservacar\\original_reservacar.tsx', 'utf16le');
fs.writeFileSync('C:\\Users\\Wollace\\Downloads\\reservacar\\original_reservacar.tsx', content, 'utf8');
console.log('Conversion successful!');
