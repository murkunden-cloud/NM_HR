const fs = require('fs');
const path = require('path');
const p1 = path.join(process.cwd(), 'src/components/Roster/sanction.xlsx');
console.log('Path 1:', p1, 'Exists:', fs.existsSync(p1));
const p2 = path.join(__dirname, 'src/components/Roster/sanction.xlsx');
console.log('__dirname:', __dirname);
