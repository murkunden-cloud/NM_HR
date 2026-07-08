import React from 'react';
import './payslip.css';

export interface PayslipData {
  employeeDetails: {
    costCenterCode: string;
    orgUnitName: string;
    accountingUnitName: string;
    accountingUnitCode: string;
    empNo: string;
    cpfNo: string;
    panNo: string;
    epsNo: string;
    epfoNo: string;
    empName: string;
    dateOfJoining: string;
    dateOfBirth: string;
    nextIncrementDue: string;
    designation: string;
    quarterType: string;
    payscale: string;
    dateOfRetirement: string;
    basicRate: string;
    paymentMode: string;
    contactNo: string;
    email: string;
  };
  earnings: Array<{ name: string; amount: number; adjust?: number }>;
  deductions: Array<{ name: string; amount: number; adjust?: number }>;
  totals: {
    totalEarnings: number;
    totalDeduction: number;
    netPayable: number;
    netPayableWords: string;
  };
  eps: number;
  compContrCpf: number;
  compContrArrs: number;
  totalCompContr: number;
  creditSociety: Array<{ name: string; no: string; amount: number }>;
  licPremium: Array<{ policyNo: string; amount: number }>;
  pliDetail: Array<{ pliNo: string; amount: number }>;
  nominees: Array<{ srNo: string; regNo: string; name: string; share: string; relation: string }>;
  incomeTax: {
    projected: number;
    recovered: number;
    balance: number;
  };
  message: string;
  payMonth: string;
  payYear: string;
  printedDate: string;
}

interface Props {
  data: PayslipData;
}

export default function PayslipTemplate({ data }: Props) {
  const d = data.employeeDetails;
  
  return (
    <div className="payslip-container payslip-print-section">
      <div className="payslip-outer-border">
        {/* Header */}
        <div className="payslip-header">
          <div className="payslip-logo">
            <div className="payslip-logo-inner">
              <div className="payslip-logo-tri"></div>
              <h1>MAHA<span>VITARAN</span></h1>
            </div>
            <p>Maharashtra State Electricity Distribution Co. Ltd.</p>
          </div>
          <div className="payslip-title">
            <h2>MAHARASHTRA STATE ELECTRICITY DISTRIBUTION COMPANY LTD.</h2>
            <h3>PAY SLIP FOR {data.payMonth} {data.payYear}</h3>
          </div>
          <div className="payslip-meta">
            <span>Page 1 of 1</span>
            <span>{data.printedDate}</span>
          </div>
        </div>

        {/* Employee Info */}
        <table className="payslip-table">
          <tbody>
            {(() => {
              const items = [
                { label: 'COST CENTER CODE', value: d.costCenterCode },
                { label: 'ORG. UNIT NAME', value: d.orgUnitName },
                { label: 'ACCOUNTING UNIT NAME', value: d.accountingUnitName },
                { label: 'ACCOUNTING UNIT CODE', value: d.accountingUnitCode },
                { label: 'Employee No / CPF No', value: `${d.empNo || ''}${d.empNo && d.cpfNo ? ' / ' : ''}${d.cpfNo || ''}` },
                { label: 'PAN No', value: d.panNo },
                { label: 'EPS No', value: d.epsNo },
                { label: 'EPFO Universal A/c No', value: d.epfoNo },
                { label: 'Employee Name', value: d.empName },
                { label: 'Date of Joining', value: d.dateOfJoining },
                { label: 'Date of Birth', value: d.dateOfBirth },
                { label: 'Next Increment Due on', value: d.nextIncrementDue },
                { label: 'Designation', value: d.designation },
                { label: 'Quarter Type', value: d.quarterType },
                { label: 'Payscale', value: d.payscale },
                { label: 'Date of Retirement', value: d.dateOfRetirement },
                { label: 'Basic Rate', value: d.basicRate },
                { label: 'Payment Mode', value: d.paymentMode },
                { label: 'Contact No', value: d.contactNo },
                { label: 'Email Address', value: d.email }
              ].filter(item => {
                if (!item.value) return false;
                const strVal = String(item.value).trim();
                return strVal !== '' && strVal !== 'N/A' && strVal !== '/';
              });

              const rows = [];
              for (let i = 0; i < items.length; i += 2) {
                const item1 = items[i];
                const item2 = items[i + 1];
                
                if (item2) {
                  rows.push(
                    <tr key={i}>
                      <td><strong>{item1.label}:</strong></td>
                      <td>{item1.value}</td>
                      <td><strong>{item2.label}:</strong></td>
                      <td>{item2.value}</td>
                    </tr>
                  );
                } else {
                  rows.push(
                    <tr key={i}>
                      <td><strong>{item1.label}:</strong></td>
                      <td colSpan={3}>{item1.value}</td>
                    </tr>
                  );
                }
              }
              return rows.length > 0 ? rows : (
                <tr>
                  <td colSpan={4} style={{textAlign: 'center', fontStyle: 'italic', color: '#666'}}>
                    No biodata available
                  </td>
                </tr>
              );
            })()}
          </tbody>
        </table>

        {/* Earnings & Deductions */}
        <div className="earnings-deductions-container">
          <div className="earnings-side">
            <table className="ed-table">
              <thead>
                <tr>
                  <th>Earnings</th>
                  <th style={{ textAlign: 'right' }}>Regulars</th>
                  <th style={{ textAlign: 'right' }}>Adjustments</th>
                </tr>
              </thead>
              <tbody>
                {data.earnings.map((e, i) => (
                  <tr key={i}>
                    <td>{e.name}</td>
                    <td style={{ textAlign: 'right' }}>{e.amount}</td>
                    <td style={{ textAlign: 'right' }}>{e.adjust || ''}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="deductions-side">
            <table className="ed-table">
              <thead>
                <tr>
                  <th>Deductions</th>
                  <th style={{ textAlign: 'right' }}>RS</th>
                  <th style={{ textAlign: 'right' }}>Adjustments</th>
                </tr>
              </thead>
              <tbody>
                {data.deductions.map((e, i) => (
                  <tr key={i}>
                    <td>{e.name}</td>
                    <td style={{ textAlign: 'right' }}>{e.amount}</td>
                    <td style={{ textAlign: 'right' }}>{e.adjust || ''}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Totals */}
        <table className="payslip-table" style={{ borderTop: 'none', borderBottom: 'none' }}>
          <tbody>
            <tr>
              <td style={{ width: '50%', borderTop: 'none', borderRight: '1px solid #000' }}>
                <strong>Total Earnings:</strong> <span style={{ float: 'right', fontWeight: 'bold' }}>{data.totals.totalEarnings}</span>
              </td>
              <td style={{ width: '50%', borderTop: 'none' }}>
                <strong>Total Deduction:</strong> <span style={{ float: 'right', fontWeight: 'bold' }}>{data.totals.totalDeduction}</span>
              </td>
            </tr>
          </tbody>
        </table>

        {/* Net Payable */}
        <div className="net-payable-row">
          NET PAYABLE: <span style={{ marginLeft: '40px' }}>{data.totals.netPayable} ( {data.totals.netPayableWords} )</span>
        </div>

        {/* EPS / COMP CONTR */}
        <table className="payslip-table" style={{ borderTop: 'none' }}>
          <tbody>
            <tr>
              <td style={{ width: '25%', border: 'none' }}>E.P.S :</td>
              <td style={{ width: '25%', border: 'none' }}>{data.eps}</td>
              <td style={{ width: '50%', border: 'none' }} rowSpan={4}></td>
            </tr>
            <tr>
              <td style={{ border: 'none' }}>COMP CONTR. CPF :</td>
              <td style={{ border: 'none' }}>{data.compContrCpf}</td>
            </tr>
            <tr>
              <td style={{ border: 'none' }}>COMP CONTR. ARRS :</td>
              <td style={{ border: 'none' }}>{data.compContrArrs}</td>
            </tr>
            <tr>
              <td style={{ border: 'none', borderBottom: '1px solid #000', fontWeight: 'bold' }}>TOTAL:</td>
              <td style={{ border: 'none', borderBottom: '1px solid #000', fontWeight: 'bold' }}>{data.totalCompContr}</td>
            </tr>
            <tr>
              <td colSpan={3} style={{ borderTop: '1px solid #000' }}>No leaves availed by employee</td>
            </tr>
          </tbody>
        </table>

        {/* Breakups */}
        <div className="breakup-container">
          <div className="breakup-col">
            <div className="breakup-title">CREDIT SOCIETY BREAK-UP</div>
            <table className="ed-table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>No.</th>
                  <th style={{ textAlign: 'right' }}>Amount</th>
                </tr>
              </thead>
              <tbody>
                {data.creditSociety.map((c, i) => (
                  <tr key={i}>
                    <td>{c.name}</td>
                    <td>{c.no}</td>
                    <td style={{ textAlign: 'right' }}>{c.amount}</td>
                  </tr>
                ))}
                <tr>
                  <td colSpan={2} style={{ fontWeight: 'bold' }}>Total:</td>
                  <td style={{ textAlign: 'right', fontWeight: 'bold' }}>
                    {data.creditSociety.reduce((sum, item) => sum + item.amount, 0)}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
          <div className="breakup-col">
            <div className="breakup-title">LIC PREMIUM BREAK UP</div>
            <table className="ed-table">
              <thead>
                <tr>
                  <th>Policy No.</th>
                  <th style={{ textAlign: 'right' }}>Amount</th>
                </tr>
              </thead>
              <tbody>
                {data.licPremium.length > 0 ? data.licPremium.map((c, i) => (
                  <tr key={i}>
                    <td>{c.policyNo}</td>
                    <td style={{ textAlign: 'right' }}>{c.amount}</td>
                  </tr>
                )) : <tr><td colSpan={2}>&nbsp;</td></tr>}
              </tbody>
            </table>
          </div>
          <div className="breakup-col">
            <div className="breakup-title">PLI DETAIL</div>
            <table className="ed-table">
              <thead>
                <tr>
                  <th>PLI No.</th>
                  <th style={{ textAlign: 'right' }}>Amount</th>
                </tr>
              </thead>
              <tbody>
                {data.pliDetail.length > 0 ? data.pliDetail.map((c, i) => (
                  <tr key={i}>
                    <td>{c.pliNo}</td>
                    <td style={{ textAlign: 'right' }}>{c.amount}</td>
                  </tr>
                )) : <tr><td colSpan={2}>&nbsp;</td></tr>}
              </tbody>
            </table>
          </div>
        </div>

        {/* Nominee */}
        <table className="payslip-table">
          <thead>
            <tr>
              <th style={{ width: '50px', textAlign: 'center' }}>Sr. No.</th>
              <th>Registration No.</th>
              <th>CPF Nominee Name</th>
              <th>Nominee Share</th>
              <th>Relation</th>
            </tr>
          </thead>
          <tbody>
            {data.nominees.length > 0 ? data.nominees.map((n, i) => (
              <tr key={i}>
                <td style={{ textAlign: 'center' }}>{n.srNo}</td>
                <td>{n.regNo}</td>
                <td>{n.name}</td>
                <td style={{ textAlign: 'center' }}>{n.share}</td>
                <td>{n.relation}</td>
              </tr>
            )) : (
              <tr>
                <td colSpan={5} style={{ textAlign: 'center' }}>-</td>
              </tr>
            )}
          </tbody>
        </table>

        {/* Footer info */}
        <table className="payslip-table" style={{ borderTop: 'none' }}>
          <tbody>
            <tr>
              <td style={{ border: 'none', width: '200px' }}><strong>Projected Income Tax :</strong></td>
              <td style={{ border: 'none' }}>{data.incomeTax.projected}</td>
            </tr>
            <tr>
              <td style={{ border: 'none' }}><strong>Recovered Income Tax :</strong></td>
              <td style={{ border: 'none' }}>{data.incomeTax.recovered}</td>
            </tr>
            <tr>
              <td style={{ border: 'none', borderBottom: '1px solid #000' }}><strong>Balance Income Tax:</strong></td>
              <td style={{ border: 'none', borderBottom: '1px solid #000' }}>{data.incomeTax.balance}</td>
            </tr>
            <tr>
              <td colSpan={2} style={{ border: 'none', paddingBottom: '30px', paddingTop: '10px' }}>
                <strong>MESSAGE OF THE MONTH:</strong><br />
                {data.message}
              </td>
            </tr>
          </tbody>
        </table>

      </div>
    </div>
  );
}
