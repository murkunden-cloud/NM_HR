const express = require('express');
const { exec } = require('child_process');
const path = require('path');
const cors = require('cors');
const fs = require('fs');
const XLSX = require('xlsx');

// Install chokidar for file watching if not present
let chokidar;
try {
  chokidar = require('chokidar');
} catch (e) {
  console.log('⚠️  chokidar not installed. File watching disabled. Install with: npm install chokidar');
}

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

// File paths
const SANCTION_PATH = path.join(__dirname, '..', 'sanction.xlsx');
const FILLED_PATH = path.join(__dirname, '..', 'filled.xlsx');
const DATA_JS_PATH = path.join(__dirname, 'src', 'data.js');
const BACKUP_DIR = path.join(__dirname, 'backups');
const BACKLOG_OUTPUT_PATH = path.join(__dirname, '..', 'Backlog_Proforma_A_Output.xlsx');

// Create backup directory if it doesn't exist
if (!fs.existsSync(BACKUP_DIR)) {
  fs.mkdirSync(BACKUP_DIR, { recursive: true });
}

// Get file modification timestamp
function getFileModTime(filePath) {
  try {
    const stats = fs.statSync(filePath);
    return stats.mtimeMs;
  } catch (error) {
    return 0;
  }
}

// Create backup of data.js
function createBackup() {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const backupPath = path.join(BACKUP_DIR, `data.js.backup.${timestamp}`);
  
  try {
    fs.copyFileSync(DATA_JS_PATH, backupPath);
    console.log(`💾 Backup created: ${backupPath}`);
    
    // Keep only last 10 backups
    const backups = fs.readdirSync(BACKUP_DIR)
      .filter(f => f.startsWith('data.js.backup.'))
      .map(f => ({ name: f, path: path.join(BACKUP_DIR, f), time: fs.statSync(path.join(BACKUP_DIR, f)).mtimeMs }))
      .sort((a, b) => b.time - a.time);
    
    if (backups.length > 10) {
      backups.slice(10).forEach(b => {
        fs.unlinkSync(b.path);
        console.log(`🗑️ Deleted old backup: ${b.name}`);
      });
    }
    
    return true;
  } catch (error) {
    console.error(`❌ Backup failed: ${error.message}`);
    return false;
  }
}

// Store last known modification times
let lastSanctionModTime = getFileModTime(SANCTION_PATH);
let lastFilledModTime = getFileModTime(FILLED_PATH);

// Check if Excel files have been modified
function checkExcelFilesModified() {
  const currentSanctionModTime = getFileModTime(SANCTION_PATH);
  const currentFilledModTime = getFileModTime(FILLED_PATH);
  
  const sanctionModified = currentSanctionModTime > lastSanctionModTime;
  const filledModified = currentFilledModTime > lastFilledModTime;
  
  if (sanctionModified || filledModified) {
    console.log(`📝 Excel files modified:`, {
      sanction: sanctionModified ? 'Yes' : 'No',
      filled: filledModified ? 'Yes' : 'No'
    });
    
    lastSanctionModTime = currentSanctionModTime;
    lastFilledModTime = currentFilledModTime;
    
    return true;
  }
  
  return false;
}

// Verify data integrity after regeneration
function verifyDataIntegrity() {
  return new Promise((resolve, reject) => {
    console.log('🔍 Verifying data integrity...');
    
    exec('node verify-data.js', { cwd: __dirname }, (error, stdout, stderr) => {
      if (error) {
        console.error(`❌ Verification error: ${error.message}`);
        return reject(error);
      }
      
      const output = stdout || stderr;
      
      // Check if verification passed
      if (output.includes('ALL DATA IS ACCURATE') || output.includes('No discrepancies found')) {
        console.log('✅ Data integrity verified - no discrepancies found');
        resolve({ success: true, output });
      } else {
        console.warn('⚠️  Data integrity check found discrepancies');
        resolve({ success: false, output, hasDiscrepancies: true });
      }
    });
  });
}

// Regenerate data from Excel files with backup
function regenerateData() {
  return new Promise((resolve, reject) => {
    console.log('🔄 Regenerating data from Excel files...');
    
    // Create backup before regeneration
    const backupSuccess = createBackup();
    if (!backupSuccess) {
      return reject(new Error('Backup failed - aborting regeneration'));
    }
    
    exec('node generate-data.js', { cwd: __dirname }, (error, stdout, stderr) => {
      if (error) {
        console.error(`❌ Error: ${error.message}`);
        return reject(error);
      }
      
      if (stderr) {
        console.error(`❌ Stderr: ${stderr}`);
        return reject(new Error(stderr));
      }
      
      console.log(`✅ ${stdout}`);
      
      // Verify data integrity after regeneration
      verifyDataIntegrity()
        .then(verification => {
          resolve({ success: true, output: stdout, verification });
        })
        .catch(verificationError => {
          console.warn('⚠️  Data integrity verification failed, but regeneration succeeded');
          resolve({ success: true, output: stdout, verificationError: verificationError.message });
        });
    });
  });
}

// Endpoint to regenerate data from Excel files
app.post('/api/refresh-data', (req, res) => {
  regenerateData()
    .then(result => {
      res.json({ 
        success: true, 
        message: 'Data regenerated successfully',
        output: result.output 
      });
    })
    .catch(error => {
      res.status(500).json({ 
        success: false, 
        message: 'Failed to regenerate data',
        error: error.message 
      });
    });
});

// Endpoint to check if Excel files have been modified
app.get('/api/check-modifications', (req, res) => {
  const modified = checkExcelFilesModified();
  res.json({ 
    modified,
    sanctionModTime: lastSanctionModTime,
    filledModTime: lastFilledModTime,
    sanctionPath: SANCTION_PATH,
    filledPath: FILLED_PATH
  });
});

// Auto-refresh endpoint - checks timestamps and updates if needed
app.post('/api/auto-refresh', (req, res) => {
  const modified = checkExcelFilesModified();
  
  if (modified) {
    console.log('🔄 Auto-refresh triggered: Excel files modified');
    regenerateData()
      .then(result => {
        res.json({ 
          success: true, 
          message: 'Auto-refresh completed successfully',
          autoTriggered: true,
          output: result.output 
        });
      })
      .catch(error => {
        res.status(500).json({ 
          success: false, 
          message: 'Auto-refresh failed',
          error: error.message 
        });
      });
  } else {
    res.json({ 
      success: true, 
      message: 'No modifications detected - no refresh needed',
      autoTriggered: false 
    });
  }
});

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    message: 'Server is running',
    excelFiles: {
      sanction: { exists: fs.existsSync(SANCTION_PATH), modTime: lastSanctionModTime },
      filled: { exists: fs.existsSync(FILLED_PATH), modTime: lastFilledModTime }
    }
  });
});

// List backups endpoint
app.get('/api/backups', (req, res) => {
  try {
    const backups = fs.readdirSync(BACKUP_DIR)
      .filter(f => f.startsWith('data.js.backup.'))
      .map(f => {
        const filePath = path.join(BACKUP_DIR, f);
        const stats = fs.statSync(filePath);
        return {
          name: f,
          size: stats.size,
          created: stats.birthtime,
          modified: stats.mtime
        };
      })
      .sort((a, b) => b.modified - a.modified);
    
    res.json({ backups });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Restore from backup endpoint
app.post('/api/restore-backup', (req, res) => {
  const { backupName } = req.body;
  
  if (!backupName) {
    return res.status(400).json({ error: 'backupName is required' });
  }
  
  const backupPath = path.join(BACKUP_DIR, backupName);
  
  if (!fs.existsSync(backupPath)) {
    return res.status(404).json({ error: 'Backup not found' });
  }
  
  try {
    // Create backup of current data.js before restoring
    createBackup();
    
    // Restore from backup
    fs.copyFileSync(backupPath, DATA_JS_PATH);
    
    console.log(`✅ Restored from backup: ${backupName}`);
    res.json({ 
      success: true, 
      message: `Restored from ${backupName}` 
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Generate Backlog Proforma_A report endpoint
app.post('/api/generate-backlog-report', (req, res) => {
  try {
    console.log('🔄 Generating Backlog Proforma_A report...');
    
    // Read Excel files
    const sanctionWb = XLSX.readFile(SANCTION_PATH);
    const filledWb = XLSX.readFile(FILLED_PATH);
    
    // Helper function to filter internal notification
    function filterInternalNotification(data) {
      return data.filter(row => {
        const sanctionType = row[3];
        return sanctionType && !sanctionType.includes("Internal Notification");
      });
    }
    
    // Helper function to map recruitment type
    function mapRecruitmentType(sanctionType) {
      if (sanctionType.includes("Direct Recruitment")) return "DIRECT";
      if (sanctionType.includes("Promotion")) return "PROMOTION";
      return "OTHER";
    }
    
    // Helper function to aggregate by circle
    function aggregateByCircle(data, isFilled = false) {
      const circles = {};
      
      data.forEach(row => {
        const circle = row[0];
        const sanctionType = row[3];
        const recruitType = mapRecruitmentType(sanctionType);
        
        if (!circle || recruitType === "OTHER") return;
        
        const categories = {
          SC: row[4] || 0, ST: row[5] || 0, VJA: row[6] || 0,
          NTB: row[7] || 0, NTC: row[8] || 0, NTD: row[9] || 0,
          SBC: row[10] || 0, OBC: row[11] || 0, SEBC: row[12] || 0,
          EWS: row[13] || 0, OPEN: row[14] || 0
        };
        
        const total = isFilled ? (row[16] || 0) : (row[15] || 0);
        
        if (!circles[circle]) {
          circles[circle] = {
            DIRECT: { SC: 0, ST: 0, VJA: 0, NTB: 0, NTC: 0, NTD: 0, SBC: 0, OBC: 0, SEBC: 0, EWS: 0, OPEN: 0, TOTAL: 0 },
            PROMOTION: { SC: 0, ST: 0, VJA: 0, NTB: 0, NTC: 0, NTD: 0, SBC: 0, OBC: 0, SEBC: 0, EWS: 0, OPEN: 0, TOTAL: 0 }
          };
        }
        
        if (recruitType === "DIRECT" || recruitType === "PROMOTION") {
          Object.keys(categories).forEach(cat => {
            circles[circle][recruitType][cat] += categories[cat];
          });
          circles[circle][recruitType].TOTAL += total;
        }
      });
      
      return circles;
    }
    
    // Helper function to calculate zone totals
    function calculateZone_totels(circles) {
      const zoneTotal = {
        DIRECT: { SC: 0, ST: 0, VJA: 0, NTB: 0, NTC: 0, NTD: 0, SBC: 0, OBC: 0, SEBC: 0, EWS: 0, OPEN: 0, TOTAL: 0 },
        PROMOTION: { SC: 0, ST: 0, VJA: 0, NTB: 0, NTC: 0, NTD: 0, SBC: 0, OBC: 0, SEBC: 0, EWS: 0, OPEN: 0, TOTAL: 0 }
      };
      
      Object.keys(circles).forEach(circle => {
        ["DIRECT", "PROMOTION"].forEach(type => {
          Object.keys(circles[circle][type]).forEach(cat => {
            zoneTotal[type][cat] += circles[circle][type][cat];
          });
        });
      });
      
      return zoneTotal;
    }
    
    // Read and process data
    const sanctionIII = XLSX.utils.sheet_to_json(sanctionWb.Sheets["III"], { header: 1 });
    const sanctionIV = XLSX.utils.sheet_to_json(sanctionWb.Sheets["IV"], { header: 1 });
    const filledIII = XLSX.utils.sheet_to_json(filledWb.Sheets["III"], { header: 1 });
    const filledIV = XLSX.utils.sheet_to_json(filledWb.Sheets["IV"], { header: 1 });
    
    const sanctionIIIFiltered = filterInternalNotification(sanctionIII.slice(1));
    const sanctionIVFiltered = filterInternalNotification(sanctionIV.slice(1));
    const filledIIIFiltered = filterInternalNotification(filledIII.slice(1));
    const filledIVFiltered = filterInternalNotification(filledIV.slice(1));
    
    const sanctionIIICircles = aggregateByCircle(sanctionIIIFiltered, false);
    const sanctionIVCircles = aggregateByCircle(sanctionIVFiltered, false);
    const filledIIICircles = aggregateByCircle(filledIIIFiltered, true);
    const filledIVCircles = aggregateByCircle(filledIVFiltered, true);
    
    const sanctionIIIZone = calculateZone_totels(sanctionIIICircles);
    const sanctionIVZone = calculateZone_totels(sanctionIVCircles);
    const filledIIIZone = calculateZone_totels(filledIIICircles);
    const filledIVZone = calculateZone_totels(filledIVCircles);
    
    // Create output data
    const outputData = [];
    
    function createRow(payGroup, recruitType, sanction, filled, circleName = "") {
      const vacant = Math.max(0, sanction.TOTAL - filled.TOTAL);
      const vacantOpen = Math.max(0, sanction.OPEN - filled.OPEN);
      
      return [
        payGroup, recruitType, sanction.TOTAL, filled.TOTAL, vacant, vacantOpen, 0, 0,
        filled.SC, filled.ST, filled.VJA, filled.NTB, filled.NTC, filled.NTD, filled.SBC, filled.OBC, filled.SEBC, filled.EWS, filled.OPEN, filled.TOTAL,
        sanction.SC, sanction.ST, sanction.VJA, sanction.NTB, sanction.NTC, sanction.NTD, sanction.SBC, sanction.OBC, sanction.SEBC, sanction.EWS, sanction.TOTAL,
        0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
        0, circleName
      ];
    }
    
    // Class 3 data by circle
    Object.keys(sanctionIIICircles).sort().forEach(circle => {
      outputData.push(createRow(3, "DIRECT", sanctionIIICircles[circle].DIRECT, filledIIICircles[circle]?.DIRECT || {SC:0,ST:0,VJA:0,NTB:0,NTC:0,NTD:0,SBC:0,OBC:0,SEBC:0,EWS:0,OPEN:0,TOTAL:0}, circle));
      outputData.push(createRow(3, "PROMOTION", sanctionIIICircles[circle].PROMOTION, filledIIICircles[circle]?.PROMOTION || {SC:0,ST:0,VJA:0,NTB:0,NTC:0,NTD:0,SBC:0,OBC:0,SEBC:0,EWS:0,OPEN:0,TOTAL:0}, circle));
    });
    
    // Class 3 zone total
    outputData.push(["TOTAL (3)", "DIRECT", ...createRow(null, "DIRECT", sanctionIIIZone.DIRECT, filledIIIZone.DIRECT, "ZONE TOTAL").slice(2)]);
    outputData.push([null, "PROMOTION", ...createRow(null, "PROMOTION", sanctionIIIZone.PROMOTION, filledIIIZone.PROMOTION, "ZONE TOTAL").slice(2)]);
    
    // Class 4 data by circle
    Object.keys(sanctionIVCircles).sort().forEach(circle => {
      outputData.push(createRow(4, "DIRECT", sanctionIVCircles[circle].DIRECT, filledIVCircles[circle]?.DIRECT || {SC:0,ST:0,VJA:0,NTB:0,NTC:0,NTD:0,SBC:0,OBC:0,SEBC:0,EWS:0,OPEN:0,TOTAL:0}, circle));
      outputData.push(createRow(4, "PROMOTION", sanctionIVCircles[circle].PROMOTION, filledIVCircles[circle]?.PROMOTION || {SC:0,ST:0,VJA:0,NTB:0,NTC:0,NTD:0,SBC:0,OBC:0,SEBC:0,EWS:0,OPEN:0,TOTAL:0}, circle));
    });
    
    // Class 4 zone total
    outputData.push(["TOTAL (4)", "DIRECT", ...createRow(null, "DIRECT", sanctionIVZone.DIRECT, filledIVZone.DIRECT, "ZONE TOTAL").slice(2)]);
    outputData.push([null, "PROMOTION", ...createRow(null, "PROMOTION", sanctionIVZone.PROMOTION, filledIVZone.PROMOTION, "ZONE TOTAL").slice(2)]);
    
    // Create workbook with template structure
    const wb = XLSX.utils.book_new();
    
    const header1 = [
      "PAYGROUP CAT", "RECRUIT TYPE", "TOT SANC", "TOT FILLED POST", "TOT VACANT POST",
      "VACANT  POST ONLY FOR OPEN", "CURRENT RESERVATION POST AMONG VACANT", "RESERV POST AMONG VACANT POST",
      "FILEED POST BIFURGATION", null, null, null, null, null, null, null, null, null, null, null,
      "BIFURGATION OF RESERVATION", null, null, null, null, null, null, null, null, null, null,
      "BIFURGATION CURRENT RESERVATION", null, null, null, null, null, null, null, null, null, null,
      "SUPERNUMRY", "REMARKS"
    ];
    
    const header2 = [
      null, null, null, null, null, null, null, null,
      "SC", "ST", "VJA", "NTB", "NTC", "NTD", "SBC", "OBC", "EWS", "SEBC", "OPEN", "TOTAL",
      "SC", "ST", "VJA", "NTB", "NTC", "NTD", "SBC", "OBC", "EWS", "SEBC", "TOTAL",
      "SC", "ST", "VJA", "NTB", "NTC", "NTD", "SBC", "OBC", "EWS", "SEBC", "TOTAL"
    ];
    
    const header3 = Array.from({ length: 44 }, (_, i) => i + 1);
    
    const finalData = [header1, header2, header3, ...outputData];
    
    const ws = XLSX.utils.aoa_to_sheet(finalData);
    XLSX.utils.book_append_sheet(wb, ws, "Proforma A");
    
    // Write output file
    XLSX.writeFile(wb, BACKLOG_OUTPUT_PATH);
    
    console.log(`✅ Backlog Proforma_A report generated: ${BACKLOG_OUTPUT_PATH}`);
    
    res.json({
      success: true,
      message: 'Backlog Proforma_A report generated successfully',
      filePath: BACKLOG_OUTPUT_PATH,
      downloadUrl: '/api/download-backlog-report'
    });
    
  } catch (error) {
    console.error('❌ Error generating backlog report:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to generate backlog report',
      error: error.message
    });
  }
});

// Download Backlog Proforma_A report endpoint
app.get('/api/download-backlog-report', (req, res) => {
  if (!fs.existsSync(BACKLOG_OUTPUT_PATH)) {
    return res.status(404).json({ error: 'Report not found. Generate it first.' });
  }
  
  res.download(BACKLOG_OUTPUT_PATH, 'Backlog_Proforma_A.xlsx', (err) => {
    if (err) {
      console.error('Error downloading file:', err);
      res.status(500).json({ error: 'Failed to download file' });
    }
  });
});

// Exit endpoint — shuts down all processes (used by React app Exit button)
app.get('/exit', (req, res) => {
  res.json({ ok: true, message: 'Shutting down...' });
  console.log('\n🛑 Exit requested from browser. Stopping server...');
  setTimeout(() => {
    exec('for /f "tokens=5" %a in (\'netstat -aon ^| findstr :3000\') do taskkill /F /PID %a', ()=>{});
    setTimeout(() => process.exit(0), 500);
  }, 300);
});

// Ping endpoint — used by batch file to check if server is ready
app.get('/ping', (req, res) => {
  res.json({ ok: true });
});

app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
  console.log(`📡 Refresh endpoint: http://localhost:${PORT}/api/refresh-data`);
  console.log(`🔍 Auto-refresh endpoint: http://localhost:${PORT}/api/auto-refresh`);
  console.log(`📋 Check modifications: http://localhost:${PORT}/api/check-modifications`);
  console.log(`💾 Backups directory: ${BACKUP_DIR}`);
  console.log(`📝 Monitoring Excel files for modifications...`);
  
  // Start file watcher if chokidar is available
  if (chokidar) {
    const watcher = chokidar.watch([SANCTION_PATH, FILLED_PATH], {
      persistent: true,
      ignoreInitial: true,
      awaitWriteFinish: {
        stabilityThreshold: 2000,
        pollInterval: 100
      }
    });
    
    watcher.on('change', (filePath) => {
      const fileName = path.basename(filePath);
      console.log(`📝 File modified: ${fileName}`);
      
      // Debounce to avoid multiple rapid triggers
      setTimeout(() => {
        console.log('🔄 Auto-regenerating data due to Excel file modification...');
        regenerateData()
          .then(() => {
            console.log('✅ Auto-regeneration completed successfully');
          })
          .catch((error) => {
            console.error('❌ Auto-regeneration failed:', error.message);
          });
      }, 3000);
    });
    
    watcher.on('error', (error) => {
      console.error('❌ File watcher error:', error);
    });
    
    console.log('👀 File watcher active - monitoring Excel files for changes');
  } else {
    console.log('⚠️  File watching disabled - install chokidar for automatic updates');
  }
});
