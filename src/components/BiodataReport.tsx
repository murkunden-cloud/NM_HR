import React from 'react';

type Employee = any; // You can import the actual type if you want
type PromotionHistory = any;
type TransferHistory = any;

interface BiodataReportProps {
  selectedEmp: Employee;
  promotions: PromotionHistory[];
  transfers: TransferHistory[];
  onClose: () => void;
}

export default function BiodataReport({ selectedEmp, promotions, transfers, onClose }: BiodataReportProps) {
  if (!selectedEmp) return null;

  return (
    <div style={{ background: 'white', color: 'black', padding: '40px', minHeight: '100vh', fontFamily: 'Arial, sans-serif' }}>
      <style>{`
        @media print {
          .no-print { display: none !important; }
          body { background: white; }
        }
        .report-table { width: 100%; border-collapse: collapse; margin-top: 10px; font-size: 14px; }
        .report-table th, .report-table td { border: 1px solid #ddd; padding: 8px; text-align: left; }
        .report-table th { background-color: #f2f2f2; }
        .section-title { border-bottom: 2px solid #000; padding-bottom: 5px; margin-top: 30px; font-size: 18px; font-weight: bold; }
      `}</style>
      
      <div className="no-print" style={{ display: 'flex', gap: '10px', marginBottom: '20px' }}>
        <button onClick={() => window.print()} style={{ padding: '8px 16px', background: '#0056b3', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>Print / Save PDF</button>
        <button onClick={onClose} style={{ padding: '8px 16px', background: '#dc3545', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>Close Report</button>
      </div>

      <div style={{ textAlign: 'center', marginBottom: '30px' }}>
        <h2 style={{ margin: '0 0 10px 0' }}>EMPLOYEE BIODATA REPORT</h2>
        <p style={{ margin: 0, color: '#555' }}>Pune Zone HR System</p>
      </div>

      <div className="section-title">Part 1: Personal Details</div>
      <table className="report-table">
        <tbody>
          <tr>
            <td width="25%"><strong>Employee No:</strong></td>
            <td width="25%">{selectedEmp.empno}</td>
            <td width="25%"><strong>Full Name:</strong></td>
            <td width="25%">{selectedEmp.empnm}</td>
          </tr>
          <tr>
            <td><strong>Mobile No:</strong></td>
            <td>{selectedEmp.mobileno || '-'}</td>
            <td><strong>Email ID:</strong></td>
            <td>{selectedEmp.email || '-'}</td>
          </tr>
          <tr>
            <td><strong>Aadhaar No:</strong></td>
            <td>{selectedEmp.aadhaarno || '-'}</td>
            <td><strong>PAN No:</strong></td>
            <td>{selectedEmp.panno || '-'}</td>
          </tr>
          <tr>
            <td><strong>EPIC No:</strong></td>
            <td>{selectedEmp.epicno || '-'}</td>
            <td><strong>GPF / CPF No:</strong></td>
            <td>{selectedEmp.gpfno || '-'}</td>
          </tr>
          <tr>
            <td><strong>Bank A/C No:</strong></td>
            <td>{selectedEmp.bankno || '-'}</td>
            <td><strong>Bank Name:</strong></td>
            <td>{selectedEmp.banknm || '-'}</td>
          </tr>
          <tr>
            <td><strong>Caste (Main):</strong></td>
            <td>{selectedEmp.cast || '-'}</td>
            <td><strong>Category:</strong></td>
            <td>{selectedEmp.caste_category || '-'}</td>
          </tr>
        </tbody>
      </table>

      <div className="section-title">Part 2: Service Particulars</div>
      <table className="report-table">
        <tbody>
          <tr>
            <td width="25%"><strong>1st Appointment Date:</strong></td>
            <td width="25%">{selectedEmp.first_appointment_dt || '-'}</td>
            <td width="25%"><strong>Date of Joining:</strong></td>
            <td width="25%">{selectedEmp.compjoindt || '-'}</td>
          </tr>
          <tr>
            <td><strong>Current Designation:</strong></td>
            <td>{selectedEmp.desigz || '-'}</td>
            <td><strong>Current Location:</strong></td>
            <td>{selectedEmp.locnm || selectedEmp.divnm || '-'}</td>
          </tr>
          <tr>
            <td><strong>Pay Scale:</strong></td>
            <td>{selectedEmp.payscl || '-'}</td>
            <td><strong>Basic Pay:</strong></td>
            <td>₹{selectedEmp.basic || 0}</td>
          </tr>
          <tr>
            <td><strong>Retirement Date:</strong></td>
            <td>{selectedEmp.dtofretir || '-'}</td>
            <td><strong>Seniority No:</strong></td>
            <td>{selectedEmp.seniority_no || '-'}</td>
          </tr>
        </tbody>
      </table>

      <div className="section-title">Part 3: Promotion Details</div>
      {promotions && promotions.length > 0 ? (
        <table className="report-table">
          <thead>
            <tr>
              <th>Date</th>
              <th>From Designation</th>
              <th>To Designation</th>
              <th>To Scale</th>
              <th>Remarks</th>
            </tr>
          </thead>
          <tbody>
            {promotions.map(p => (
              <tr key={p.id}>
                <td>{p.prom_date}</td>
                <td>{p.from_desig || '-'}</td>
                <td>{p.to_desig || '-'}</td>
                <td>{p.to_scale || '-'}</td>
                <td>{p.remarks || '-'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : <p style={{ marginTop: '10px', fontSize: '14px', fontStyle: 'italic' }}>No promotion records found.</p>}

      <div className="section-title">Part 4: Transfer Details</div>
      {transfers && transfers.length > 0 ? (
        <table className="report-table">
          <thead>
            <tr>
              <th>Date</th>
              <th>Type</th>
              <th>From Location</th>
              <th>To Location</th>
              <th>Designation</th>
            </tr>
          </thead>
          <tbody>
            {transfers.map(t => (
              <tr key={t.id}>
                <td>{t.transfer_date}</td>
                <td>{t.transfer_type || '-'}</td>
                <td>{t.from_location || '-'}</td>
                <td>{t.to_location || '-'}</td>
                <td>{t.to_desig || '-'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : <p style={{ marginTop: '10px', fontSize: '14px', fontStyle: 'italic' }}>No transfer records found.</p>}
    </div>
  );
}
