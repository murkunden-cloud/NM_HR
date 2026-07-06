const XLSX = require('xlsx');
const fs = require('fs');
const wb = XLSX.read(fs.readFileSync('test_download.xlsx'), { type: 'buffer' });
const ws = wb.Sheets[wb.SheetNames[0]];
const data = XLSX.utils.sheet_to_json(ws, { header: 1 });
console.log("test_download.xlsx Headers:", data[0]);
