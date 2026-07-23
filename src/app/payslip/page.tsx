'use client';

import React, { useState, useEffect, Suspense } from 'react';
import PayslipTemplate, { PayslipData } from '@/components/PayslipTemplate';
import { Search, Plus, Trash2, Printer } from 'lucide-react';
import { useSearchParams } from 'next/navigation';

const ALLOWANCE_LIST = [
  'Basic Salary',
  'Dearness Allowance',
  'House Rent Allowance',
  'Special Compensatory Allowance',
  'Heavy Duty Allowance',
  'Night Shift Allowance',
  'Transport Assistance Allowance',
  'Electricity Charges Allowance',
  'Entertainment Allowance',
  'Technical Journal Allowance',
  'Book Allowance',
  'Risk Allowance',
  'E.D.P. Allowance',
  'Education Assistance (One Child)',
  'Education Assistance (Two Children)',
  'Orderly Allowances',
  'Special Duty Allowance',
  'System Allowance for Management Cadre',
  'Professional Persuit Allowance',
  'Fringe Admin: Energy/Elec.Sup',
  'Fringe Admin: Typing',
  'Fringe Admin: Punch Optr',
  'Fringe Admin: Cash',
  'Fringe Admin: Store',
  'Fringe Field: SCA-II/PJTA-II',
  'Fringe Field: Field',
  'Fringe Field: Store',
  'Fringe Field: Training'
];

function PayslipContent() {
  const searchParams = useSearchParams();
  const initialEmpNo = searchParams.get('empno') || '';
  const [empNo, setEmpNo] = useState(initialEmpNo);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [hraRate, setHraRate] = useState<number>(0.10);
  
  // Default structure mimicking the format
  const [data, setData] = useState<PayslipData>({
    employeeDetails: {
      costCenterCode: '0010010023',
      orgUnitName: 'Pune-H.R. Section',
      accountingUnitName: 'RASTAPETH URBAN CIRCLE',
      accountingUnitCode: '5576',
      empNo: '',
      cpfNo: '',
      panNo: 'APPPM0448A',
      epsNo: '226608',
      epfoNo: '100382618446',
      empName: '',
      dateOfJoining: '',
      dateOfBirth: '',
      nextIncrementDue: '10.04.2026',
      designation: '',
      quarterType: '',
      payscale: '',
      dateOfRetirement: '30.06.2035',
      basicRate: '0',
      paymentMode: 'Bank Transfer',
      contactNo: '',
      email: ''
    },
    earnings: [
      { name: 'Basic Salary', amount: 55850 },
      { name: 'Dearness Allowance', amount: 32393 },
      { name: 'House Rent Allowance', amount: 16755 }
    ],
    deductions: [
      { name: 'Employee CPF Contribution', amount: 10589 },
      { name: 'Prof Tax - Full period', amount: 200 },
      { name: 'Income Tax', amount: 1648 }
    ],
    totals: {
      totalEarnings: 0,
      totalDeduction: 0,
      netPayable: 0,
      netPayableWords: 'ZERO Rupees'
    },
    eps: 1250,
    compContrCpf: 9339,
    compContrArrs: 0,
    totalCompContr: 10589,
    creditSociety: [
      { name: 'C377 - Vij Kamgar Co-Op Credit Society Nanded', no: '', amount: 2000 }
    ],
    licPremium: [],
    pliDetail: [],
    nominees: [
      { srNo: '01', regNo: '0202208449', name: 'Sandhya Nagesh Markunde', share: '100', relation: 'Wife:WF' }
    ],
    incomeTax: { projected: 20571, recovered: 1714, balance: 18857 },
    message: '',
    payMonth: 'APR',
    payYear: '2026',
    printedDate: new Date().toLocaleString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', second: '2-digit' }).toUpperCase().replace(/,/g, '')
  });

  // Calculate totals whenever earnings or deductions change
  useEffect(() => {
    const totalE = data.earnings.reduce((sum, item) => sum + (Number(item.amount) || 0), 0);
    const totalD = data.deductions.reduce((sum, item) => sum + (Number(item.amount) || 0), 0);
    const net = totalE - totalD;
    
    // Simple number to words converter for English
    const toWords = (num: number) => {
      // Very basic mock - in production use a library like number-to-words
      if (num === 91667) return "NINETY ONE THOUSAND SIX HUNDRED SIXTY SEVEN Rupees";
      return num + " Rupees";
    };

    setData(prev => ({
      ...prev,
      totals: {
        totalEarnings: totalE,
        totalDeduction: totalD,
        netPayable: net,
        netPayableWords: toWords(net)
      }
    }));
  }, [data.earnings, data.deductions]);

  const handleSearch = async () => {
    if (!empNo) return;
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`/api/employees?empno=${empNo}`);
      const json = await res.json();
      if (json.success && json.employee) {
        const emp = json.employee;
        
        // Format dates correctly from YYYY-MM-DD to DD.MM.YYYY
        const formatDate = (dateStr: string) => {
          if (!dateStr) return '';
          const parts = dateStr.split('-');
          if (parts.length === 3) return `${parts[2]}.${parts[1]}.${parts[0]}`;
          return dateStr;
        };

        setData(prev => {
          const newEarnings = [...prev.earnings];
          const basicIndex = newEarnings.findIndex(e => e.name === 'Basic Salary');
          const empBasic = Number(emp.basic) || 0;
          
          if (basicIndex >= 0) {
            newEarnings[basicIndex] = { ...newEarnings[basicIndex], amount: empBasic };
          } else {
            newEarnings.unshift({ name: 'Basic Salary', amount: empBasic });
          }

          // Calculate Dearness Allowance (58% of Basic)
          const daRate = 0.58;
          const daAmount = Math.round(empBasic * daRate);
          const daIndex = newEarnings.findIndex(e => e.name === 'Dearness Allowance');
          
          if (daIndex >= 0) {
            newEarnings[daIndex] = { ...newEarnings[daIndex], amount: daAmount };
          } else {
            newEarnings.splice(1, 0, { name: 'Dearness Allowance', amount: daAmount });
          }

          // Calculate House Rent Allowance
          const hraAmount = Math.round(empBasic * hraRate);
          const hraIndex = newEarnings.findIndex(e => e.name === 'House Rent Allowance');
          if (hraRate > 0) {
            if (hraIndex >= 0) {
              newEarnings[hraIndex] = { ...newEarnings[hraIndex], amount: hraAmount };
            } else {
              newEarnings.splice(2, 0, { name: 'House Rent Allowance', amount: hraAmount });
            }
          } else if (hraIndex >= 0) {
            newEarnings.splice(hraIndex, 1);
          }

          return {
            ...prev,
            earnings: newEarnings,
            employeeDetails: {
              ...prev.employeeDetails,
              empNo: emp.empno || '',
              cpfNo: emp.empno ? emp.empno + '3' : '', 
              empName: emp.empnm || '',
              dateOfJoining: formatDate(emp.compjoindt),
              dateOfBirth: formatDate(emp.brthdt),
              designation: emp.desigz || '',
              payscale: emp.fullPayscale || emp.payscl || '',
              basicRate: emp.basic?.toString() || '0',
              contactNo: emp.mobileno || '',
              email: emp.email || '',
              panNo: emp.panno || '',
              epsNo: '',
              epfoNo: emp.gpfno || '',
              accountingUnitName: emp.circl || emp.divnm || '',
              orgUnitName: emp.locnm || '',
              costCenterCode: '',
              accountingUnitCode: '',
              quarterType: emp.qtrtype || '',
              dateOfRetirement: formatDate(emp.dtofretir) || '',
              paymentMode: emp.banknm ? `Bank Transfer - ${emp.banknm}` : 'Bank Transfer',
            }
          };
        });
      } else {
        setError('Employee not found');
      }
    } catch (err) {
      setError('Failed to fetch employee details');
    } finally {
      setLoading(false);
    }
  };

  const handleHraChange = (newRate: number) => {
    setHraRate(newRate);
    setData(prev => {
      const newEarnings = [...prev.earnings];
      const basicIndex = newEarnings.findIndex(e => e.name === 'Basic Salary');
      const empBasic = basicIndex >= 0 ? Number(newEarnings[basicIndex].amount) || 0 : 0;
      
      const hraAmount = Math.round(empBasic * newRate);
      const hraIndex = newEarnings.findIndex(e => e.name === 'House Rent Allowance');
      
      if (newRate === 0) {
        if (hraIndex >= 0) newEarnings.splice(hraIndex, 1);
      } else {
        if (hraIndex >= 0) {
          newEarnings[hraIndex] = { ...newEarnings[hraIndex], amount: hraAmount };
        } else {
          const daIndex = newEarnings.findIndex(e => e.name === 'Dearness Allowance');
          const insertIdx = daIndex >= 0 ? daIndex + 1 : 1;
          newEarnings.splice(insertIdx, 0, { name: 'House Rent Allowance', amount: hraAmount });
        }
      }
      return { ...prev, earnings: newEarnings };
    });
  };

  useEffect(() => {
    if (initialEmpNo && !data.employeeDetails.empName) {
      handleSearch();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialEmpNo]);

  const handlePrint = () => {
    window.print();
  };

  // Helpers to add/remove lines
  const addEarning = () => {
    setData(prev => ({ ...prev, earnings: [...prev.earnings, { name: '', amount: 0 }] }));
  };
  const addDeduction = () => {
    setData(prev => ({ ...prev, deductions: [...prev.deductions, { name: '', amount: 0 }] }));
  };
  
  const updateEarning = (index: number, field: string, value: string | number) => {
    const newEarnings = [...data.earnings];
    newEarnings[index] = { ...newEarnings[index], [field]: value };
    setData(prev => ({ ...prev, earnings: newEarnings }));
  };

  const updateDeduction = (index: number, field: string, value: string | number) => {
    const newDeductions = [...data.deductions];
    newDeductions[index] = { ...newDeductions[index], [field]: value };
    setData(prev => ({ ...prev, deductions: newDeductions }));
  };

  const removeEarning = (index: number) => {
    setData(prev => ({ ...prev, earnings: prev.earnings.filter((_, i) => i !== index) }));
  };
  const removeDeduction = (index: number) => {
    setData(prev => ({ ...prev, deductions: prev.deductions.filter((_, i) => i !== index) }));
  };

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      {/* Settings Panel - Hidden when printing */}
      <div className="max-w-5xl mx-auto pt-8 px-4 no-print mb-8">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
          <div className="flex justify-between items-center mb-6">
            <h1 className="text-2xl font-bold text-gray-800">Payslip Generator</h1>
            
            <div className="flex items-center gap-4 bg-gray-50 px-4 py-2 rounded-md border border-gray-200">
              <div className="flex items-center gap-2">
                <label className="text-sm font-medium text-gray-600">Month:</label>
                <select 
                  className="bg-white border border-gray-300 rounded px-2 py-1 text-sm text-gray-700 focus:outline-none focus:border-blue-500"
                  value={data.payMonth}
                  onChange={(e) => setData({...data, payMonth: e.target.value})}
                >
                  {['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'].map(m => (
                    <option key={m} value={m}>{m}</option>
                  ))}
                </select>
              </div>
              <div className="flex items-center gap-2">
                <label className="text-sm font-medium text-gray-600">Year:</label>
                <select 
                  className="bg-white border border-gray-300 rounded px-2 py-1 text-sm text-gray-700 focus:outline-none focus:border-blue-500"
                  value={data.payYear}
                  onChange={(e) => setData({...data, payYear: e.target.value})}
                >
                  {['2024', '2025', '2026', '2027'].map(y => (
                    <option key={y} value={y}>{y}</option>
                  ))}
                </select>
              </div>
              <div className="flex items-center gap-2">
                <label className="text-sm font-medium text-gray-600">HRA %:</label>
                <select 
                  className="bg-white border border-gray-300 rounded px-2 py-1 text-sm text-gray-700 focus:outline-none focus:border-blue-500"
                  value={hraRate}
                  onChange={(e) => handleHraChange(Number(e.target.value))}
                >
                  <option value={0.10}>10%</option>
                  <option value={0.20}>20%</option>
                  <option value={0.30}>30%</option>
                  <option value={0}>None</option>
                </select>
              </div>
            </div>

            <button 
              onClick={handlePrint}
              className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md font-medium transition-colors"
            >
              <Printer size={18} />
              Print / Save PDF
            </button>
          </div>

          <div className="flex items-end gap-4 mb-8">
            <div className="flex-1 max-w-sm">
              <label className="block text-sm font-medium text-gray-700 mb-1">Search Employee (CPF/Emp No)</label>
              <div className="relative">
                <input
                  type="text"
                  value={empNo}
                  onChange={(e) => setEmpNo(e.target.value)}
                  placeholder="e.g. 2266083"
                  className="w-full pl-3 pr-10 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                  onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                />
              </div>
            </div>
            <button 
              onClick={handleSearch}
              disabled={loading}
              className="bg-gray-800 hover:bg-gray-900 text-white px-4 py-2 rounded-md flex items-center gap-2 transition-colors disabled:opacity-50"
            >
              <Search size={18} />
              {loading ? 'Searching...' : 'Search'}
            </button>
            {error && <span className="text-red-600 text-sm">{error}</span>}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* Earnings Input */}
            <div>
              <div className="flex justify-between items-center mb-3">
                <h3 className="text-lg font-semibold text-gray-800">Earnings</h3>
                <button onClick={addEarning} className="text-blue-600 hover:text-blue-800 flex items-center gap-1 text-sm font-medium">
                  <Plus size={16} /> Add Row
                </button>
              </div>
              <div className="space-y-3">
                <datalist id="allowances">
                  {ALLOWANCE_LIST.map((allowance, idx) => (
                    <option key={idx} value={allowance} />
                  ))}
                </datalist>
                {data.earnings.map((e, i) => (
                  <div key={i} className="flex gap-2 items-center">
                    <input 
                      type="text" 
                      list="allowances"
                      value={e.name}
                      onChange={(e) => updateEarning(i, 'name', e.target.value)}
                      placeholder="Earning Name"
                      className="flex-1 border border-gray-300 rounded px-3 py-1.5 text-sm"
                    />
                    <input 
                      type="number" 
                      value={e.amount || ''}
                      onChange={(e) => updateEarning(i, 'amount', Number(e.target.value))}
                      placeholder="Amount"
                      className="w-24 border border-gray-300 rounded px-3 py-1.5 text-sm text-right"
                    />
                    <button onClick={() => removeEarning(i)} className="text-red-500 hover:text-red-700 p-1">
                      <Trash2 size={16} />
                    </button>
                  </div>
                ))}
              </div>
              <div className="mt-3 text-right font-semibold text-gray-700">
                Total: ₹{data.totals.totalEarnings.toLocaleString()}
              </div>
            </div>

            {/* Deductions Input */}
            <div>
              <div className="flex justify-between items-center mb-3">
                <h3 className="text-lg font-semibold text-gray-800">Deductions</h3>
                <button onClick={addDeduction} className="text-blue-600 hover:text-blue-800 flex items-center gap-1 text-sm font-medium">
                  <Plus size={16} /> Add Row
                </button>
              </div>
              <div className="space-y-3">
                {data.deductions.map((e, i) => (
                  <div key={i} className="flex gap-2 items-center">
                    <input 
                      type="text" 
                      value={e.name}
                      onChange={(e) => updateDeduction(i, 'name', e.target.value)}
                      placeholder="Deduction Name"
                      className="flex-1 border border-gray-300 rounded px-3 py-1.5 text-sm"
                    />
                    <input 
                      type="number" 
                      value={e.amount || ''}
                      onChange={(e) => updateDeduction(i, 'amount', Number(e.target.value))}
                      placeholder="Amount"
                      className="w-24 border border-gray-300 rounded px-3 py-1.5 text-sm text-right"
                    />
                    <button onClick={() => removeDeduction(i)} className="text-red-500 hover:text-red-700 p-1">
                      <Trash2 size={16} />
                    </button>
                  </div>
                ))}
              </div>
              <div className="mt-3 text-right font-semibold text-gray-700">
                Total: ₹{data.totals.totalDeduction.toLocaleString()}
              </div>
            </div>
          </div>
          
          <div className="mt-6 border-t pt-4">
             <div className="flex flex-col gap-4">
               <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Message of the Month</label>
                  <textarea 
                    className="w-full border border-gray-300 rounded p-2 text-sm"
                    rows={2}
                    value={data.message}
                    onChange={(e) => setData({...data, message: e.target.value})}
                  />
               </div>
             </div>
          </div>

        </div>
        
        <div className="text-center text-gray-500 text-sm mb-4">
          Preview Below (What you see is exactly what prints). Click "Print / Save PDF" to generate.
        </div>
      </div>

      {/* Preview Section - Will be printed */}
      <PayslipTemplate data={data} />
      
    </div>
  );
}

export default function PayslipPage() {
  return (
    <Suspense fallback={<div className="flex justify-center items-center h-screen">Loading Payslip...</div>}>
      <PayslipContent />
    </Suspense>
  );
}
