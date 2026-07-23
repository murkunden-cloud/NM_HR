'use client';

import React, { useRef, useState } from 'react';
import * as XLSX from 'xlsx';

interface ExcelUploadProps {
  onUploadComplete?: () => void;
}

export default function ExcelUpload({ onUploadComplete }: ExcelUploadProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isUploadingExcel, setIsUploadingExcel] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<{ current: number, total: number } | null>(null);

  const handleExcelUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploadingExcel(true);
    const reader = new FileReader();
    reader.onload = async (evt) => {
      try {
        const bstr = evt.target?.result;
        const wb = XLSX.read(bstr, { type: 'binary' });
        const wsname = wb.SheetNames[0];
        const ws = wb.Sheets[wsname];
        const data = XLSX.utils.sheet_to_json(ws);
        
        if (!data || data.length === 0) {
          alert('No data found in Excel file.');
          setIsUploadingExcel(false);
          return;
        }

        const bulkPayload = data
          .map((row: any) => {
            const rowEmpno = row.empno || row.EMPNO || row.EmpNo || row['Employee No'];
            if (!rowEmpno) return null;
            
            const empData = { ...row };
            delete empData.empno;
            delete empData.EMPNO;
            delete empData.EmpNo;
            delete empData['Employee No'];

            Object.keys(empData).forEach(key => {
              if (empData[key] === null || empData[key] === undefined || empData[key] === '') {
                delete empData[key];
              }
            });

            return {
              empno: String(rowEmpno),
              data: empData
            };
          })
          .filter(Boolean);

        if (bulkPayload.length === 0) {
          alert('No valid rows found. Please ensure there is a column named "empno" or "Employee No".');
          setIsUploadingExcel(false);
          return;
        }

        const totalRecords = bulkPayload.length;
        setUploadProgress({ current: 0, total: totalRecords });
        let successCount = 0;
        const chunkSize = 200;

        for (let i = 0; i < totalRecords; i += chunkSize) {
          const chunk = bulkPayload.slice(i, i + chunkSize);
          const response = await fetch('/api/employees', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ bulk: chunk })
          });
          
          const result = await response.json();
          if (result.success) {
            successCount += result.count || chunk.length;
          }
          
          setUploadProgress({ current: Math.min(i + chunkSize, totalRecords), total: totalRecords });
        }
        
        alert(`Successfully updated ${successCount} employee records!`);
        if (onUploadComplete) {
          onUploadComplete();
        }
      } catch (error) {
        console.error('Error processing Excel file:', error);
        alert('Failed to process Excel file.');
      } finally {
        setIsUploadingExcel(false);
        setUploadProgress(null);
        if (fileInputRef.current) {
          fileInputRef.current.value = '';
        }
      }
    };
    reader.readAsBinaryString(file);
  };

  return (
    <div>
      <input 
        type="file" 
        accept=".xlsx, .xls" 
        ref={fileInputRef}
        style={{ display: 'none' }}
        onChange={handleExcelUpload}
      />
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
        {uploadProgress && (
          <span style={{ fontSize: '0.85rem', color: 'var(--yellow-accent)', fontWeight: 'bold', padding: '0.4rem 0.8rem', background: 'rgba(255,255,255,0.1)', borderRadius: '0.25rem' }}>
            Uploading: {uploadProgress.current} / {uploadProgress.total}
          </span>
        )}
        <button 
          onClick={() => fileInputRef.current?.click()}
          disabled={isUploadingExcel}
          style={{ padding: '0.4rem 0.8rem', fontSize: '0.85rem', background: '#10b981', border: 'none', borderRadius: '0.25rem', color: 'white', cursor: 'pointer', fontWeight: 'bold', opacity: isUploadingExcel ? 0.6 : 1 }}
        >
          {isUploadingExcel ? 'Processing...' : '📁 Bulk Update (Excel)'}
        </button>
      </div>
    </div>
  );
}
