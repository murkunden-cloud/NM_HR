'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import * as XLSX from 'xlsx';
import RosterView from '@/components/Roster/RosterView';
import VacancyView from '@/components/Vacancy/Vacancy';
import UserManagementView from '@/components/Users/UserManagementView';
import './admin.css';

// Type declarations matching the schema
interface Employee {
  empno: string;
  loccode: string | null;
  empnm: string | null;
  desigz: string | null;
  locnm: string | null;
  divnm: string | null;
  basic: number;
  payscl: string | null;
  compjoindt: string | null;
  brthdt: string | null;
  dtofretir: string | null;
  caste_category: string | null;
  aadhaarno: string | null;
  gpfno: string | null;
  spousenm: string | null;
  suspension_days: number;
  exleave_nopay_days: number;
  last_increment_dt: string | null;
  next_increment_dt: string | null;
  istgodt: string | null;
  iindgodt: string | null;
  iiirdgodt: string | null;
  deem_date_prom: string | null;
  address: string | null;
  stay_details: string | null;
  prom_refused_dt: string | null;
  prom_refused_reason: string | null;
  prom_refused_note: string | null;
  first_appointment_dt?: string | null;
  reappointment_dt?: string | null;
  reappointment_type?: string | null;
  absorption_dt?: string | null;
  epicno?: string | null;
  mobileno?: string | null;
  email?: string | null;
  panno?: string | null;
  bankno?: string | null;
  banknm?: string | null;
  cast?: string | null;
  subcast?: string | null;
  caste_validity_status?: string | null;
  caste_validity_no?: string | null;
  caste_validity_dt?: string | null;
  seniority_no?: string | null;
}

interface PayScale {
  scaleno: string;
  payscl: string | null;
  stage1: number;
  incri1: number;
  stage2: number;
  incri2: number;
  stage3: number;
  incri3: number;
  stage4: number;
  incri4: number;
  category: string | null;
}

interface Location {
  loccode: string;
  locnm: string | null;
}

interface Designation {
  dez_id: string;
  desigz: string | null;
  paygrp: string | null;
  payscl: string | null;
  cat: string | null;
  types: string | null;
}

interface Post {
  dez_id: string;
  desigz: string | null;
  paygrp: string | null;
  payscl: string | null;
  cat: string | null;
  types: string | null;
}

interface LeaveRecord {
  id: number;
  empno: string;
  leave_type: string;
  from_dt: string;
  to_dt: string;
  days: number;
  sanction_order: string | null;
  remarks: string | null;
}

interface PromotionHistory {
  id?: string;
  empno: string;
  prom_date: string;
  from_desig: string;
  to_desig: string;
  from_scale: string;
  to_scale: string;
  pay_before: number;
  pay_after: number;
  remarks?: string;
}

interface TransferHistory {
  id?: string;
  empno: string;
  transfer_date: string;
  from_date: string;
  to_date: string;
  from_location: string;
  to_location: string;
  from_desig: string;
  to_desig: string;
  transfer_type: string;
}

type TabType = 'dashboard' | 'employees' | 'go74' | 'increment' | 'seniority' | 'leaves' | 'retirement' | 'payscales' | 'maintain_da' | 'roster' | 'vacancy' | 'users';

export default function AdminWorkspace() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<TabType>('dashboard');
  
  // Excel Upload State
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isUploadingExcel, setIsUploadingExcel] = useState(false);
  
  // Database States
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [payScales, setPayScales] = useState<PayScale[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [selectedEmp, setSelectedEmp] = useState<Employee | null>(null);
  const [biodataPrintMode, setBiodataPrintMode] = useState(false);
  const [retirementPrintMode, setRetirementPrintMode] = useState(false);
  const [retLAPDays, setRetLAPDays] = useState('300');
  const [retCOMDays, setRetCOMDays] = useState('180');
  
  // Sub-tab selection state inside Employee Master detail panel
  const [subTab, setSubTab] = useState<'biodata' | 'service' | 'increment' | 'career'>('biodata');

  // Sub-table transaction states
  const [leaves, setLeaves] = useState<LeaveRecord[]>([]);
  const [newLeaveType, setNewLeaveType] = useState('LAP');
  const [newLeaveFrom, setNewLeaveFrom] = useState('');
  const [newLeaveTo, setNewLeaveTo] = useState('');
  const [newLeaveDays, setNewLeaveDays] = useState('0');
  const [leaveError, setLeaveError] = useState('');
  const [leaveSuccess, setLeaveSuccess] = useState('');

  // Career log states
  const [promotions, setPromotions] = useState<PromotionHistory[]>([]);
  const [transfers, setTransfers] = useState<TransferHistory[]>([]);
  const [editingPromId, setEditingPromId] = useState<string | null>(null);
  const [editingTransferId, setEditingTransferId] = useState<string | null>(null);
  
  // Form states for adding/editing promotions
  const [newPromDate, setNewPromDate] = useState('');
  const [newPromJoinDate, setNewPromJoinDate] = useState('');
  const [newPromFromDesig, setNewPromFromDesig] = useState('');
  const [newPromToDesig, setNewPromToDesig] = useState('');
  const [newPromFromScale, setNewPromFromScale] = useState('');
  const [newPromToScale, setNewPromToScale] = useState('');
  const [newPromPayBefore, setNewPromPayBefore] = useState('0');
  const [newPromPayAfter, setNewPromPayAfter] = useState('0');
  const [newPromPostLocation, setNewPromPostLocation] = useState('');
  const [promSuccess, setPromSuccess] = useState('');

  // Form states for adding transfers
  const [newTransDate, setNewTransDate] = useState('');
  const [newTransFromDate, setNewTransFromDate] = useState('');
  const [newTransToDate, setNewTransToDate] = useState('');
  const [newTransFromLoc, setNewTransFromLoc] = useState('');
  const [newTransToLoc, setNewTransToLoc] = useState('');
  const [newTransFromDesig, setNewTransFromDesig] = useState('');
  const [newTransToDesig, setNewTransToDesig] = useState('');
  const [newTransType, setNewTransType] = useState('Regular');
  const [transSuccess, setTransSuccess] = useState('');

  // Seniority Generator states
  const [seniorityClass, setSeniorityClass] = useState<'III' | 'IV'>('III');
  const [seniorityCategory, setSeniorityCategory] = useState<string>('');
  const [seniorityTypes, setSeniorityTypes] = useState<string>('');
  const [seniorityZone, setSeniorityZone] = useState('');
  const [seniorityCircle, setSeniorityCircle] = useState('');
  const [seniorityDivision, setSeniorityDivision] = useState('');
  const [seniorityPost, setSeniorityPost] = useState('');
  const [seniorityReport, setSeniorityReport] = useState<any[]>([]);
  const [seniorityLoading, setSeniorityLoading] = useState(false);
  const [hierarchyData, setHierarchyData] = useState<any>({});
  const [senioritySuccess, setSenioritySuccess] = useState('');

  // Loaded metadata lists for drop-downs
  const [locations, setLocations] = useState<Location[]>([]);
  const [designations, setDesignations] = useState<Designation[]>([]);
  const [posts, setPosts] = useState<Post[]>([]);

  // Historical DA state (Maharashtra state historical DA rates) - up to date!
  const [daRates, setDaRates] = useState<Array<{ from_dt: string; to_dt: string; da_pct: number }>>([
    { from_dt: '2026-01-01', to_dt: '2026-12-31', da_pct: 54 },
    { from_dt: '2025-07-01', to_dt: '2025-12-31', da_pct: 52 },
    { from_dt: '2025-01-01', to_dt: '2025-06-30', da_pct: 50 },
    { from_dt: '2024-01-01', to_dt: '2024-12-31', da_pct: 50 },
    { from_dt: '2023-07-01', to_dt: '2023-12-31', da_pct: 46 },
    { from_dt: '2023-01-01', to_dt: '2023-06-30', da_pct: 42 },
    { from_dt: '2022-07-01', to_dt: '2022-12-31', da_pct: 38 },
    { from_dt: '2022-01-01', to_dt: '2022-06-30', da_pct: 34 }
  ]);
  const [newDaFrom, setNewDaFrom] = useState('');
  const [newDaTo, setNewDaTo] = useState('');
  const [newDaPct, setNewDaPct] = useState('50');

  // Revision fixation simulator state
  const [simRevisionYear, setSimRevisionYear] = useState('2019');
  const [simSelectedScale, setSimSelectedScale] = useState('');
  const [simCurrentPay, setSimCurrentPay] = useState('0');

  // Calculations states
  const [daPercentage, setDaPercentage] = useState(50);
  const [statutoryLimit, setStatutoryLimit] = useState(2000000);
  
  // Dashboard stats
  const [totalEmployees, setTotalEmployees] = useState(58417);
  const [locationsCount, setLocationsCount] = useState(194);
  const [scalesCount, setScalesCount] = useState(105);

  // Fetch pay scales and initial stats on mount
  useEffect(() => {
    async function loadInitialData() {
      try {
        const scaleRes = await fetch('/api/pay_scales');
        if (scaleRes.ok) {
          const data = await scaleRes.json();
          setPayScales(data.payScales || []);
          setScalesCount(data.payScales?.length || 105);
        }

        // Fetch metadata dropdown lists
        const metaRes = await fetch('/api/metadata');
        if (metaRes.ok) {
          const data = await metaRes.json();
          setLocations(data.locations || []);
          setDesignations(data.designations || []);
          setPosts(data.posts || []);
        }

        // Fetch hierarchy list for Seniority tool
        const hierRes = await fetch('/api/hierarchy');
        if (hierRes.ok) {
          const data = await hierRes.json();
          setHierarchyData(data.hierarchy || {});
        }
        
        // Fetch matching initial employees list
        const empRes = await fetch('/api/employees?limit=15');
        if (empRes.ok) {
          const data = await empRes.json();
          setEmployees(data.employees || []);
        }
      } catch (err) {
        console.error('Failed to load initial data:', err);
      }
    }
    loadInitialData();
  }, []);

  // Search trigger
  const handleSearch = async () => {
    if (!searchQuery.trim()) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/employees?query=${encodeURIComponent(searchQuery)}&limit=50`);
      if (res.ok) {
        const data = await res.json();
        setEmployees(data.employees || []);
        setActiveTab('employees');
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateSeniority = async () => {
    if (!seniorityPost || !seniorityCircle) return;
    setSeniorityLoading(true);
    setSenioritySuccess('');
    try {
      const params = new URLSearchParams();
      params.append('desigz', seniorityPost);
      params.append('circl', seniorityCircle);
      params.append('isClass3', seniorityClass === 'III' ? 'true' : 'false');
      if (seniorityDivision && seniorityDivision !== '(All Divisions)') {
        params.append('divnm', seniorityDivision);
      }

      const res = await fetch(`/api/seniority?${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        setSeniorityReport(data.data || []);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setSeniorityLoading(false);
    }
  };

  const handleBulkUpdateSeniority = async () => {
    if (seniorityReport.length === 0) return;
    setSeniorityLoading(true);
    setSenioritySuccess('');
    try {
      const updates = seniorityReport.map((emp) => {
        return {
          empNo: emp.empNo,
          seniorityNo: parseInt((document.getElementById(`sen_no_${emp.empNo}`) as HTMLInputElement)?.value || emp.seniorityNo || '0'),
          remarks: (document.getElementById(`sen_remarks_${emp.empNo}`) as HTMLTextAreaElement)?.value || emp.remarks || '',
          employeeName: (document.getElementById(`sen_empnm_${emp.empNo}`) as HTMLInputElement)?.value || emp.employeeName || '',
          casteCategory: (document.getElementById(`sen_castcat_${emp.empNo}`) as HTMLSelectElement)?.value || emp.casteCategory || '',
          subCaste: (document.getElementById(`sen_subcast_${emp.empNo}`) as HTMLInputElement)?.value || emp.subCaste || '',
          casteValidityStatus: (document.getElementById(`sen_castvalstat_${emp.empNo}`) as HTMLInputElement)?.value || emp.casteValidityStatus || '',
          casteValidityCertNo: (document.getElementById(`sen_castvalno_${emp.empNo}`) as HTMLInputElement)?.value || emp.casteValidityCertNo || '',
          casteValidityDate: (document.getElementById(`sen_castvaldt_${emp.empNo}`) as HTMLInputElement)?.value || emp.casteValidityDate || '',
          transferDate: (document.getElementById(`sen_transdt_${emp.empNo}`) as HTMLInputElement)?.value || emp.transferDate || '',
          transferType: (document.getElementById(`sen_transtype_${emp.empNo}`) as HTMLInputElement)?.value || emp.transferType || '',
          dateJoinedCompany: (document.getElementById(`sen_compjoindt_${emp.empNo}`) as HTMLInputElement)?.value || emp.dateJoinedCompany || '',
          presentPostJoiningDate: (document.getElementById(`sen_ppljoindt_${emp.empNo}`) as HTMLInputElement)?.value || emp.presentPostJoiningDate || '',
          dateOfBirth: (document.getElementById(`sen_brthdt_${emp.empNo}`) as HTMLInputElement)?.value || emp.dateOfBirth || ''
        };
      });
      
      const res = await fetch('/api/seniority', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          updates, 
          desigz: seniorityPost,
          username: 'admin'
        })
      });
      
      if (res.ok) {
        const result = await res.json();
        setSenioritySuccess(result.message || 'Seniority updates saved successfully!');
        // Reload the seniority list
        await handleGenerateSeniority();
      } else {
        alert('Failed to save updates');
      }
    } catch (err) {
      console.error(err);
      alert('Error saving updates');
    } finally {
      setSeniorityLoading(false);
    }
  };

  const handleExportExcel = () => {
    if (seniorityReport.length === 0) return;
    
    // Create CSV content with proper headers matching the Python version
    const headers = [
      'Seniority No', 'Emp No', 'Employee Name', 'Division', 'Location', 
      'Caste Category', 'Sub-Caste', 'Caste Validity Status', 'Caste Validity Cert No', 
      'Caste Validity Date', 'Promoted From Post', 'Promotion/Joining Date', 
      'Transfer Date', 'Transfer Type', 'Transfer From Zone/Circle', 
      'Date Joined (Company)', 'Present Post Joining Date', 
      'Effective Seniority Date', 'Date of Birth', 'Remarks'
    ];
    
    const rows = seniorityReport.map(emp => [
      emp.seniorityNo || '',
      emp.empNo || '',
      emp.employeeName || '',
      emp.division || '',
      emp.location || '',
      emp.casteCategory || '',
      emp.subCaste || '',
      emp.casteValidityStatus || '',
      emp.casteValidityCertNo || '',
      emp.casteValidityDate || '',
      emp.promotedFromPost || '',
      emp.promotionJoiningDate || '',
      emp.transferDate || '',
      emp.transferType || '',
      emp.transferFromZoneCircle || '',
      emp.dateJoinedCompany || '',
      emp.presentPostJoiningDate || '',
      emp.effectiveSeniorityDate || '',
      emp.dateOfBirth || '',
      emp.remarks || ''
    ]);
    
    const csvContent = [headers, ...rows].map(row => 
      row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(',')
    ).join('\n');
    
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    const safePost = seniorityPost?.replace(/[^a-zA-Z0-9]/g, '_') || 'all';
    const safeCircle = seniorityCircle?.replace(/[^a-zA-Z0-9]/g, '_') || 'all';
    link.setAttribute('download', `seniority_${safePost}_${safeCircle}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handlePrintPDF = () => {
    window.print();
  };

  // Helper to convert display date (DD-MM-YYYY) to input date (YYYY-MM-DD)
  const convertDisplayDateToInput = (displayDate: string) => {
    if (!displayDate) return '';
    const parts = displayDate.split('-');
    if (parts.length === 3) {
      return `${parts[2]}-${parts[1]}-${parts[0]}`;
    }
    return displayDate;
  };

  // Fetch employee details (and transactions)
  const selectEmployee = async (emp: Employee) => {
    setSelectedEmp(emp);
    setLeaveError('');
    setLeaveSuccess('');
    setPromSuccess('');
    setTransSuccess('');
    // Fetch transaction logs
    try {
      const res = await fetch(`/api/transactions?empno=${emp.empno}`);
      if (res.ok) {
        const data = await res.json();
        setLeaves(data.leaves || []);
        setPromotions(data.promotions || []);
        setTransfers(data.transfers || []);
      }
    } catch (err) {
      console.error('Failed to load logs:', err);
    }
  };

  // Save employee updates
  const saveEmployeeDetails = async (updatedData: Partial<Employee>) => {
    if (!selectedEmp) return;
    try {
      const res = await fetch('/api/employees', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ empno: selectedEmp.empno, data: updatedData })
      });
      if (res.ok) {
        const data = await res.json();
        setSelectedEmp(data.employee);
        // Refresh general list
        setEmployees(prev => prev.map(e => e.empno === selectedEmp.empno ? data.employee : e));
        alert('Employee record successfully updated!');
      } else {
        alert('Failed to save employee modifications.');
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Create new Leave Record
  const handleAddLeave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedEmp || !newLeaveFrom || !newLeaveTo) return;
    setLeaveError('');
    setLeaveSuccess('');
    
    try {
      const res = await fetch('/api/transactions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'leave',
          data: {
            empno: selectedEmp.empno,
            leave_type: newLeaveType,
            from_dt: newLeaveFrom,
            to_dt: newLeaveTo,
            days: newLeaveDays
          }
        })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setLeaveSuccess('Leave record successfully registered!');
        setLeaves(prev => [data.record, ...prev]);
        setNewLeaveFrom('');
        setNewLeaveTo('');
        setNewLeaveDays('0');
      } else {
        setLeaveError(data.error || 'Failed to register leave.');
      }
    } catch (err) {
      setLeaveError('An error occurred during submission.');
    }
  };

  // Create or Update Promotion Record
  const handleAddPromotion = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedEmp || !newPromDate) return;
    setPromSuccess('');
    try {
      const method = editingPromId ? 'PUT' : 'POST';
      const bodyPayload = {
        type: 'promotion',
        id: editingPromId || undefined,
        data: {
          empno: selectedEmp.empno,
          prom_date: newPromDate,
          from_desig: selectedEmp.desigz || null,
          to_desig: newPromToDesig || null,
          from_scale: selectedEmp.payscl || null,
          to_scale: payScales.find(s => s.payscl === selectedEmp.payscl)?.scaleno || null,
          pay_before: selectedEmp.basic,
          pay_after: parseFloat(newPromPayAfter) || selectedEmp.basic,
          remarks: `Posting Location: ${newPromPostLocation} | Join Date: ${newPromJoinDate}`
        }
      };

      const res = await fetch('/api/transactions', {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(bodyPayload)
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setPromSuccess(editingPromId ? 'Promotion record updated successfully!' : 'Promotion record registered successfully!');
        if (editingPromId) {
          setPromotions(prev => prev.map(p => p.id === editingPromId ? data.record : p));
        } else {
          setPromotions(prev => [data.record, ...prev]);
        }
        setNewPromDate('');
        setNewPromJoinDate('');
        setNewPromToDesig('');
        setNewPromPostLocation('');
        setNewPromPayAfter('0');
        setEditingPromId(null);
      } else {
        alert(data.error || 'Failed to save promotion.');
      }
    } catch (err) {
      console.error(err);
    }
  };

  const startEditPromotion = (prom: PromotionHistory) => {
    setEditingPromId(prom.id || null);
    setNewPromDate(prom.prom_date || '');
    setNewPromToDesig(prom.to_desig || '');
    
    // Parse remarks for location and join date if they exist
    const remarksStr = prom.remarks || '';
    const locMatch = remarksStr.match(/Posting Location:\s*(.*?)\s*\|/);
    const joinMatch = remarksStr.match(/Join Date:\s*(.*)/);
    
    setNewPromPostLocation(locMatch ? locMatch[1].trim() : '');
    setNewPromJoinDate(joinMatch ? joinMatch[1].trim() : '');
    setNewPromPayAfter(prom.pay_after ? prom.pay_after.toString() : '0');
  };

  // Create or Update Transfer Record
  const handleAddTransfer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedEmp || !newTransDate) return;
    setTransSuccess('');
    try {
      const method = editingTransferId ? 'PUT' : 'POST';
      const res = await fetch('/api/transactions', {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'transfer',
          id: editingTransferId || undefined,
          data: {
            empno: selectedEmp.empno,
            transfer_date: newTransDate,
            from_date: newTransFromDate || null,
            to_date: newTransToDate || null,
            from_location: newTransFromLoc || selectedEmp.locnm || 'Pune',
            to_location: newTransToLoc,
            from_desig: selectedEmp.desigz || null,
            to_desig: newTransToDesig || null,
            transfer_type: newTransType
          }
        })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setTransSuccess(editingTransferId ? 'Transfer record updated successfully!' : 'Transfer record registered successfully!');
        if (editingTransferId) {
          setTransfers(prev => prev.map(t => t.id === editingTransferId ? data.record : t));
        } else {
          setTransfers(prev => [data.record, ...prev]);
        }
        setNewTransDate('');
        setNewTransFromDate('');
        setNewTransToDate('');
        setNewTransFromLoc('');
        setNewTransToLoc('');
        setNewTransToDesig('');
        setEditingTransferId(null);
      } else {
        alert(data.error || 'Failed to save transfer.');
      }
    } catch (err) {
      console.error(err);
    }
  };

  const startEditTransfer = (trans: TransferHistory) => {
    setEditingTransferId(trans.id || null);
    setNewTransDate(trans.transfer_date || '');
    setNewTransFromDate(trans.from_date || '');
    setNewTransToDate(trans.to_date || '');
    setNewTransFromLoc(trans.from_location || '');
    setNewTransToLoc(trans.to_location || '');
    setNewTransToDesig(trans.to_desig || '');
    setNewTransType(trans.transfer_type || 'Internal');
  };

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

        // Map to API format. Assuming headers exactly match the Prisma schema.
        // We ensure empno is always string.
        const bulkPayload = data
          .map((row: any) => {
            const rowEmpno = row.empno || row.EMPNO || row.EmpNo || row['Employee No'];
            if (!rowEmpno) return null; // Skip invalid rows
            
            // We just pass the row exactly as read. The API's update query will update any matching fields.
            // But let's only pick string properties or convert numbers to strings except for known float/int fields.
            // To be safe, we just pass row without empno.
            const empData = { ...row };
            delete empData.empno;
            delete empData.EMPNO;
            delete empData.EmpNo;
            delete empData['Employee No'];

            // Clean up potentially problematic fields from Excel
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

        // Send to API
        const response = await fetch('/api/employees', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ bulk: bulkPayload })
        });
        
        const result = await response.json();
        if (result.success) {
          alert(`Successfully updated ${result.count} employee records!`);
          // optionally refresh current view
          handleSearch();
        } else {
          alert('Error updating employees: ' + (result.error || 'Unknown error'));
        }
      } catch (error) {
        console.error('Error processing Excel file:', error);
        alert('Failed to process Excel file.');
      } finally {
        setIsUploadingExcel(false);
        if (fileInputRef.current) {
          fileInputRef.current.value = '';
        }
      }
    };
    reader.readAsBinaryString(file);
  };

  const handleSignOut = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
    } catch (err) {
      console.error('Logout error:', err);
    }
    localStorage.removeItem('pz_token');
    router.push('/login');
  };

  // Helper date parsing/calculation functions as per MSEDCL Rules 2005 & Gratuity Act
  const calculateQualifyingServiceYears = (startStr: string | null, endStr: string | null): { years: number; text: string } => {
    if (!startStr || !endStr) return { years: 0, text: 'N/A' };
    const start = new Date(startStr);
    const end = new Date(endStr);
    if (isNaN(start.getTime()) || isNaN(end.getTime())) return { years: 0, text: 'Invalid Dates' };

    let years = end.getFullYear() - start.getFullYear();
    let months = end.getMonth() - start.getMonth();
    let days = end.getDate() - start.getDate();

    if (days < 0) {
      months -= 1;
      const prevMonth = new Date(end.getFullYear(), end.getMonth(), 0);
      days += prevMonth.getDate();
    }
    if (months < 0) {
      years -= 1;
      months += 12;
    }

    let qualifyingYears = years;
    let roundUpText = '';
    // Rounding up per rules: >= 6 months counts as a full year
    if (months >= 6) {
      qualifyingYears += 1;
      roundUpText = ` (Rounded up to next year from ${years} years, ${months} months, ${days} days)`;
    } else {
      roundUpText = ` (${years} years, ${months} months, ${days} days)`;
    }

    return {
      years: qualifyingYears,
      text: `${qualifyingYears} Years${roundUpText}`
    };
  };

  // Calculate GO 74 Pay scale fixation preview
  const previewGoFixation = (basicPay: number, scaleNo: string | null): { newPay: number; increment: number; scaleCode: string } => {
    const scale = payScales.find(s => s.scaleno === scaleNo);
    if (!scale) return { newPay: basicPay, increment: 0, scaleCode: scaleNo || '' };
    const firstStage = scale.stage1 || 0;
    const firstIncr = scale.incri1 || 0;
    const newPay = Math.max(firstStage, basicPay + firstIncr);
    return { newPay, increment: firstIncr, scaleCode: scale.payscl || scale.scaleno };
  };

  if (biodataPrintMode && selectedEmp) {
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
          <button onClick={() => setBiodataPrintMode(false)} style={{ padding: '8px 16px', background: '#dc3545', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>Close Report</button>
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
        {promotions.length > 0 ? (
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
        {transfers.length > 0 ? (
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

  if (retirementPrintMode && selectedEmp) {
    const daAmount = Math.round(selectedEmp.basic * (daPercentage / 100));
    const totalEmoluments = selectedEmp.basic + daAmount;
    const { years: qYears, text: qYearsText } = calculateQualifyingServiceYears(selectedEmp.compjoindt, selectedEmp.dtofretir);
    const calculatedGratuity = (totalEmoluments * 15 / 26) * qYears;
    const finalGratuity = Math.min(calculatedGratuity, statutoryLimit);

    const lapDays = parseFloat(retLAPDays) || 0;
    const lapAmount = (totalEmoluments * lapDays) / 30;

    const comDays = parseFloat(retCOMDays) || 0;
    const comAmount = (totalEmoluments * comDays) / 30;

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
          <button onClick={() => setRetirementPrintMode(false)} style={{ padding: '8px 16px', background: '#dc3545', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>Close Report</button>
        </div>

        <div style={{ textAlign: 'center', marginBottom: '30px', borderBottom: '2px solid black', paddingBottom: '20px' }}>
          <h2 style={{ margin: '0 0 10px 0' }}>RETIREMENT SETTLEMENT CLAIM ORDER</h2>
          <p style={{ margin: 0, color: '#555' }}>Pune Zone HR System - Issued as per MSEDCL Rules 2005 & Gratuity Act</p>
        </div>

        <div className="section-title">1. Employee Particulars</div>
        <table className="report-table">
          <tbody>
            <tr>
              <td width="25%"><strong>Employee Name:</strong></td>
              <td width="25%">{selectedEmp.empnm}</td>
              <td width="25%"><strong>Employee No:</strong></td>
              <td width="25%">{selectedEmp.empno}</td>
            </tr>
            <tr>
              <td><strong>Designation:</strong></td>
              <td>{selectedEmp.desigz}</td>
              <td><strong>Location:</strong></td>
              <td>{selectedEmp.locnm || selectedEmp.divnm}</td>
            </tr>
            <tr>
              <td><strong>Joining Date:</strong></td>
              <td>{selectedEmp.compjoindt}</td>
              <td><strong>Retirement Date:</strong></td>
              <td>{selectedEmp.dtofretir}</td>
            </tr>
            <tr>
              <td><strong>Basic Pay:</strong></td>
              <td>₹{selectedEmp.basic.toLocaleString()}</td>
              <td><strong>Current DA ({daPercentage}%):</strong></td>
              <td>₹{daAmount.toLocaleString()}</td>
            </tr>
            <tr>
              <td colSpan={2}><strong>Total Emoluments (Basic + DA):</strong></td>
              <td colSpan={2}><strong>₹{totalEmoluments.toLocaleString()}</strong></td>
            </tr>
          </tbody>
        </table>

        <div className="section-title">2. Qualifying Service Evaluation</div>
        <p>As per the registered dates of joining and retirement, the total service span is computed below.</p>
        <ul>
          <li><strong>Actual Span:</strong> {qYearsText}</li>
          <li><strong>Qualifying Years for Gratuity:</strong> {qYears} Years</li>
        </ul>

        <div className="section-title">3. Claim Assessments</div>
        <table className="report-table">
          <thead>
            <tr>
              <th>Component</th>
              <th>Formula / Verification Notes</th>
              <th>Calculated Amount</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td><strong>Gratuity</strong></td>
              <td>
                (₹{totalEmoluments.toLocaleString()} &times; 15 / 26) &times; {qYears} years = ₹{calculatedGratuity.toLocaleString(undefined, { maximumFractionDigits: 2 })}<br />
                <em>Statutory Limit: ₹{statutoryLimit.toLocaleString()}</em>
              </td>
              <td><strong>₹{finalGratuity.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</strong></td>
            </tr>
            <tr>
              <td><strong>LAP Leave Encashment</strong></td>
              <td>
                Verified Balanced Days: {lapDays}<br />
                (₹{totalEmoluments.toLocaleString()} &times; {lapDays}) / 30
              </td>
              <td><strong>₹{lapAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</strong></td>
            </tr>
            <tr>
              <td><strong>COM Leave Encashment</strong></td>
              <td>
                Verified Balanced Days: {comDays}<br />
                (₹{totalEmoluments.toLocaleString()} &times; {comDays}) / 30
              </td>
              <td><strong>₹{comAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</strong></td>
            </tr>
          </tbody>
          <tfoot>
            <tr>
              <td colSpan={2} style={{ textAlign: 'right', fontWeight: 'bold' }}>Net Payable Amount:</td>
              <td style={{ fontSize: '18px', fontWeight: 'bold' }}>₹{(finalGratuity + lapAmount + comAmount).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
            </tr>
          </tfoot>
        </table>

        <div style={{ marginTop: '80px', display: 'flex', justifyContent: 'space-between' }}>
          <div style={{ textAlign: 'center', width: '200px' }}>
            <hr style={{ borderTop: '1px solid black' }} />
            <strong>Prepared By</strong>
          </div>
          <div style={{ textAlign: 'center', width: '200px' }}>
            <hr style={{ borderTop: '1px solid black' }} />
            <strong>Verified By</strong>
          </div>
          <div style={{ textAlign: 'center', width: '200px' }}>
            <hr style={{ borderTop: '1px solid black' }} />
            <strong>Sanctioning Authority</strong>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="workspace-container">
      {/* Sidebar Panel */}
      <aside className="workspace-sidebar">
        <div className="sidebar-brand">
          <div className="brand-logo">🏛️</div>
          <div>
            <h3>PZHR Web System</h3>
            <span>Pune Zone HR Console</span>
          </div>
        </div>

        <nav className="sidebar-menu">
          <button className={`menu-item ${activeTab === 'dashboard' ? 'active' : ''}`} onClick={() => setActiveTab('dashboard')}>
            <span>🏠</span> Dashboard
          </button>
          <button className={`menu-item ${activeTab === 'employees' ? 'active' : ''}`} onClick={() => setActiveTab('employees')}>
            <span>👤</span> Employee Master
          </button>
          <button className={`menu-item ${activeTab === 'go74' ? 'active' : ''}`} onClick={() => setActiveTab('go74')}>
            <span>📋</span> GO 74/111 Module
          </button>
          <button className={`menu-item ${activeTab === 'increment' ? 'active' : ''}`} onClick={() => setActiveTab('increment')}>
            <span>📅</span> Annual Increment
          </button>
          <button className={`menu-item ${activeTab === 'seniority' ? 'active' : ''}`} onClick={() => setActiveTab('seniority')}>
            <span>🎖️</span> Seniority List
          </button>
          <button className={`menu-item ${activeTab === 'leaves' ? 'active' : ''}`} onClick={() => setActiveTab('leaves')}>
            <span>📅</span> Leave Records
          </button>
          <button className={`menu-item ${activeTab === 'retirement' ? 'active' : ''}`} onClick={() => setActiveTab('retirement')}>
            <span>🏖</span> Retirement Claims
          </button>
          <button className={`menu-item ${activeTab === 'payscales' ? 'active' : ''}`} onClick={() => setActiveTab('payscales')}>
            <span>💰</span> Pay Scales circulars
          </button>
          <button className={`menu-item ${activeTab === 'maintain_da' ? 'active' : ''}`} onClick={() => setActiveTab('maintain_da')}>
            <span>📈</span> Maintain DA Rates
          </button>
          <button className={`menu-item ${activeTab === 'roster' ? 'active' : ''}`} onClick={() => setActiveTab('roster')}>
            <span>📊</span> Backlog Roster
          </button>
          <button className={`menu-item ${activeTab === 'vacancy' ? 'active' : ''}`} onClick={() => setActiveTab('vacancy')}>
            <span>🏢</span> Vacancy & Transfers
          </button>
          <button className={`menu-item ${activeTab === 'users' ? 'active' : ''}`} onClick={() => setActiveTab('users')}>
            <span>👥</span> User Management
          </button>
        </nav>

        <div className="sidebar-profile">
          <div className="profile-details">
            <span className="profile-name">Nagesh D.M</span>
            <span className="profile-role">Head Clerk - CPF 02266083</span>
          </div>
          <button className="logout-button" onClick={handleSignOut}>Log Out</button>
        </div>
      </aside>

      {/* Main Panel Content Area */}
      <main className="workspace-content">
        
        {/* HEADER BAR */}
        <header className="workspace-header">
          <div>
            <h2>{activeTab.toUpperCase().replace('_', ' ')} Workspace</h2>
            <p>Active Scope: Pune Zone HR Operations</p>
          </div>
          <div className="header-actions">
            {activeTab === 'employees' && (
              <>
                <input
                  type="text"
                  placeholder="Search CPF No / Name..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="quick-search-input"
                />
                <button onClick={handleSearch} className="search-action-btn">Search</button>
              </>
            )}
          </div>
        </header>

        {/* TAB CONTENTS */}
        <div className="tab-card-container">
          
          {/* TAB 1: DASHBOARD */}
          {activeTab === 'dashboard' && (
            <div className="dashboard-view animate-fade">
              <div className="dashboard-stats-grid">
                <div className="stat-card border-blue">
                  <span className="stat-icon">👥</span>
                  <h3>{totalEmployees.toLocaleString()}</h3>
                  <label>Total Master Personnel</label>
                </div>
                <div className="stat-card border-green">
                  <span className="stat-icon">🏢</span>
                  <h3>{locationsCount}</h3>
                  <label>Circle Divisions & Locations</label>
                </div>
                <div className="stat-card border-purple">
                  <span className="stat-icon">💰</span>
                  <h3>{scalesCount}</h3>
                  <label>Registered Pay Scales</label>
                </div>
              </div>

              <div className="dashboard-sections">
                <div className="section-panel flex-grow">
                  <h3>🏛️ Welcome to PZHR Advanced Web Portal</h3>
                  <p>All tables and qualifying metrics from the legacy Python Streamlit system have been successfully synchronized to PostgreSQL. Use the sidebar menu to process GO fixation, calculate ex-leave stoppage dates, generate seniority lists, and run claims models.</p>
                  
                  <div className="modules-nav-cards">
                    <div className="mod-card" onClick={() => setActiveTab('employees')}>
                      <h4>👤 Employee Directory</h4>
                      <p>Modify service logs, caste profiles, and basic salaries.</p>
                    </div>
                    <div className="mod-card" onClick={() => setActiveTab('go74')}>
                      <h4>📋 GO 74 Fixation</h4>
                      <p>Verify eligibility markers for 9/18/27 year benefits.</p>
                    </div>
                    <div className="mod-card" onClick={() => setActiveTab('increment')}>
                      <h4>📅 Increment Calculator</h4>
                      <p>Run Rule 32 qualifying deduction reviews.</p>
                    </div>
                    <div className="mod-card" onClick={() => setActiveTab('roster')}>
                      <h4>📊 Backlog Roster</h4>
                      <p>Manage the 100-point employee roster.</p>
                    </div>
                    <div className="mod-card" onClick={() => setActiveTab('vacancy')}>
                      <h4>🏢 Vacancy & Transfers</h4>
                      <p>Process zone transfers and track vacancies.</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: EMPLOYEE MASTER */}
          {activeTab === 'employees' && (
            <div className="employees-view animate-fade">
              <div className="directory-split">
                
                {/* Left side: Directory list */}
                <div className="directory-list-panel">
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                    <h3 style={{ margin: 0 }}>Employees Directory ({employees.length} shown)</h3>
                    <div>
                      <input 
                        type="file" 
                        accept=".xlsx, .xls" 
                        ref={fileInputRef}
                        style={{ display: 'none' }}
                        onChange={handleExcelUpload}
                      />
                      <button 
                        onClick={() => fileInputRef.current?.click()}
                        disabled={isUploadingExcel}
                        style={{ padding: '0.4rem 0.8rem', fontSize: '0.85rem', background: '#10b981', border: 'none', borderRadius: '0.25rem', color: 'white', cursor: 'pointer', fontWeight: 'bold' }}
                      >
                        {isUploadingExcel ? 'Uploading...' : '📁 Bulk Update (Excel)'}
                      </button>
                    </div>
                  </div>
                  <div className="employee-table-scroll">
                    <table className="workspace-table">
                      <thead>
                        <tr>
                          <th>CPF No</th>
                          <th>Employee Name</th>
                          <th>Designation</th>
                          <th>Location</th>
                        </tr>
                      </thead>
                      <tbody>
                        {employees.map(emp => (
                          <tr key={emp.empno} onClick={() => selectEmployee(emp)} className={selectedEmp?.empno === emp.empno ? 'active' : ''}>
                            <td>{emp.empno}</td>
                            <td>{emp.empnm}</td>
                            <td>{emp.desigz}</td>
                            <td>{emp.divnm || emp.locnm || '-'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Right side: Selected Profile Editor */}
                <div className="directory-details-panel">
                  {selectedEmp ? (
                    <div className="profile-editor-form">
                      <div className="profile-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div>
                          <h4>Profile: {selectedEmp.empnm}</h4>
                          <span className="badge">{selectedEmp.empno}</span>
                        </div>
                        <button onClick={() => setBiodataPrintMode(true)} style={{ padding: '0.4rem 0.8rem', fontSize: '0.75rem', background: 'var(--yellow-accent)', border: 'none', borderRadius: '0.25rem', color: 'black', cursor: 'pointer', fontWeight: 'bold' }}>
                          📄 Generate Biodata Report
                        </button>
                      </div>

                      {/* Sub Tabs Navigation */}
                      <div className="sub-tabs-nav">
                        <button className={`sub-tab-btn ${subTab === 'biodata' ? 'active' : ''}`} onClick={() => setSubTab('biodata')}>Biodata & Stay</button>
                        <button className={`sub-tab-btn ${subTab === 'service' ? 'active' : ''}`} onClick={() => setSubTab('service')}>Service & Deemed</button>
                        <button className={`sub-tab-btn ${subTab === 'increment' ? 'active' : ''}`} onClick={() => setSubTab('increment')}>Increments</button>
                        <button className={`sub-tab-btn ${subTab === 'career' ? 'active' : ''}`} onClick={() => setSubTab('career')}>Career Logs</button>
                      </div>

                      {/* SUB TAB 1: BIODATA & STAY */}
                      {subTab === 'biodata' && (
                        <div className="form-grid-col2 animate-fade">
                          <div className="form-group" style={{ gridColumn: 'span 2', borderBottom: '1px solid var(--border-glass)', paddingBottom: '0.25rem', marginBottom: '0.25rem' }}>
                            <h5 style={{ margin: '0 0 0.25rem 0', color: 'var(--primary-accent)' }}>Basic Personal Info</h5>
                          </div>
                          <div className="form-group">
                            <label>Full Name</label>
                            <input type="text" value={selectedEmp.empnm || ''} onChange={(e) => setSelectedEmp({ ...selectedEmp, empnm: e.target.value })} />
                          </div>
                          <div className="form-group">
                            <label>Spouse Name</label>
                            <input type="text" value={selectedEmp.spousenm || ''} onChange={(e) => setSelectedEmp({ ...selectedEmp, spousenm: e.target.value })} />
                          </div>
                          <div className="form-group">
                            <label>Mobile No</label>
                            <input type="text" value={selectedEmp.mobileno || ''} onChange={(e) => setSelectedEmp({ ...selectedEmp, mobileno: e.target.value })} />
                          </div>
                          <div className="form-group">
                            <label>Email ID</label>
                            <input type="email" value={selectedEmp.email || ''} onChange={(e) => setSelectedEmp({ ...selectedEmp, email: e.target.value })} />
                          </div>

                          <div className="form-group" style={{ gridColumn: 'span 2', borderBottom: '1px solid var(--border-glass)', paddingBottom: '0.25rem', marginBottom: '0.25rem', marginTop: '0.5rem' }}>
                            <h5 style={{ margin: '0 0 0.25rem 0', color: 'var(--yellow-accent)' }}>Identity & Banking</h5>
                          </div>
                          <div className="form-group">
                            <label>Aadhaar No</label>
                            <input type="text" value={selectedEmp.aadhaarno || ''} onChange={(e) => setSelectedEmp({ ...selectedEmp, aadhaarno: e.target.value })} />
                          </div>
                          <div className="form-group">
                            <label>PAN No</label>
                            <input type="text" value={selectedEmp.panno || ''} onChange={(e) => setSelectedEmp({ ...selectedEmp, panno: e.target.value })} />
                          </div>
                          <div className="form-group">
                            <label>EPIC No (Voter ID)</label>
                            <input type="text" value={selectedEmp.epicno || ''} onChange={(e) => setSelectedEmp({ ...selectedEmp, epicno: e.target.value })} />
                          </div>
                          <div className="form-group">
                            <label>GPF Account No</label>
                            <input type="text" value={selectedEmp.gpfno || ''} onChange={(e) => setSelectedEmp({ ...selectedEmp, gpfno: e.target.value })} />
                          </div>
                          <div className="form-group">
                            <label>Bank Account No</label>
                            <input type="text" value={selectedEmp.bankno || ''} onChange={(e) => setSelectedEmp({ ...selectedEmp, bankno: e.target.value })} />
                          </div>
                          <div className="form-group">
                            <label>Bank Name</label>
                            <input type="text" value={selectedEmp.banknm || ''} onChange={(e) => setSelectedEmp({ ...selectedEmp, banknm: e.target.value })} />
                          </div>

                          <div className="form-group" style={{ gridColumn: 'span 2', borderBottom: '1px solid var(--border-glass)', paddingBottom: '0.25rem', marginBottom: '0.25rem', marginTop: '0.5rem' }}>
                            <h5 style={{ margin: '0 0 0.25rem 0', color: 'var(--blue-accent)' }}>Caste & Validity Details</h5>
                          </div>
                          <div className="form-group">
                            <label>Caste (Main)</label>
                            <input type="text" value={selectedEmp.cast || ''} onChange={(e) => setSelectedEmp({ ...selectedEmp, cast: e.target.value })} />
                          </div>
                          <div className="form-group">
                            <label>Sub-caste</label>
                            <input type="text" value={selectedEmp.subcast || ''} onChange={(e) => setSelectedEmp({ ...selectedEmp, subcast: e.target.value })} />
                          </div>
                          <div className="form-group">
                            <label>Caste Category</label>
                            <input type="text" value={selectedEmp.caste_category || ''} onChange={(e) => setSelectedEmp({ ...selectedEmp, caste_category: e.target.value })} />
                          </div>
                          <div className="form-group">
                            <label>Validity Status</label>
                            <input type="text" value={selectedEmp.caste_validity_status || ''} onChange={(e) => setSelectedEmp({ ...selectedEmp, caste_validity_status: e.target.value })} placeholder="e.g. Valid, Pending" />
                          </div>
                          <div className="form-group">
                            <label>Validity Cert No.</label>
                            <input type="text" value={selectedEmp.caste_validity_no || ''} onChange={(e) => setSelectedEmp({ ...selectedEmp, caste_validity_no: e.target.value })} />
                          </div>
                          <div className="form-group">
                            <label>Validity Date</label>
                            <input type="date" value={selectedEmp.caste_validity_dt || ''} onChange={(e) => setSelectedEmp({ ...selectedEmp, caste_validity_dt: e.target.value })} />
                          </div>

                          <div className="form-group" style={{ gridColumn: 'span 2', borderBottom: '1px solid var(--border-glass)', paddingBottom: '0.25rem', marginBottom: '0.25rem', marginTop: '0.5rem' }}>
                            <h5 style={{ margin: '0 0 0.25rem 0', color: 'var(--green-accent)' }}>Address details</h5>
                          </div>
                          <div className="form-group" style={{ gridColumn: 'span 2' }}>
                            <label>Stay Address Details</label>
                            <input type="text" value={selectedEmp.address || ''} onChange={(e) => setSelectedEmp({ ...selectedEmp, address: e.target.value })} placeholder="Enter permanent stay address..." />
                          </div>
                          <div className="form-group" style={{ gridColumn: 'span 2' }}>
                            <label>Local Area / Stay Remarks</label>
                            <textarea style={{ background: 'rgba(15,23,42,0.6)', border: '1px solid rgba(148,163,184,0.15)', color: '#ffffff', padding: '0.5rem', borderRadius: '0.375rem', height: '60px' }} value={selectedEmp.stay_details || ''} onChange={(e) => setSelectedEmp({ ...selectedEmp, stay_details: e.target.value })} placeholder="Enter details of previous station stay duration..." />
                          </div>
                        </div>
                      )}

                      {/* SUB TAB 2: SERVICE & DEEMED DETAILS */}
                      {subTab === 'service' && (
                        <div className="form-grid-col2 animate-fade">
                          <div className="form-group" style={{ gridColumn: 'span 2', borderBottom: '1px solid var(--border-glass)', paddingBottom: '0.5rem', marginBottom: '0.5rem' }}>
                            <h5 style={{ margin: '0 0 0.5rem 0', color: 'var(--primary-accent)' }}>Core Dates</h5>
                          </div>
                          <div className="form-group">
                            <label>1st Appointment Date</label>
                            <input type="date" value={selectedEmp.first_appointment_dt || ''} onChange={(e) => setSelectedEmp({ ...selectedEmp, first_appointment_dt: e.target.value })} />
                          </div>
                          <div className="form-group">
                            <label>Date of Joining (1st Join Date)</label>
                            <input type="date" value={selectedEmp.compjoindt || ''} onChange={(e) => setSelectedEmp({ ...selectedEmp, compjoindt: e.target.value })} />
                          </div>
                          <div className="form-group">
                            <label>Date of Retirement</label>
                            <input type="date" value={selectedEmp.dtofretir || ''} onChange={(e) => setSelectedEmp({ ...selectedEmp, dtofretir: e.target.value })} />
                          </div>
                          <div className="form-group">
                            <label>Deemed Date of Promotion</label>
                            <input type="date" value={selectedEmp.deem_date_prom || ''} onChange={(e) => setSelectedEmp({ ...selectedEmp, deem_date_prom: e.target.value })} />
                          </div>
                          <div className="form-group">
                            <label>Active Pay Scale Circular</label>
                            <select value={selectedEmp.payscl || ''} onChange={(e) => setSelectedEmp({ ...selectedEmp, payscl: e.target.value })}>
                              <option value="">-- No Scale Mapped --</option>
                              {payScales.map(s => (
                                <option key={s.scaleno} value={s.payscl || s.scaleno}>{s.payscl || `Scale ${s.scaleno}`}</option>
                              ))}
                            </select>
                          </div>
                          <div className="form-group">
                            <label>Absorption Date (for Sahayyak / Temp)</label>
                            <input type="date" value={selectedEmp.absorption_dt || ''} onChange={(e) => setSelectedEmp({ ...selectedEmp, absorption_dt: e.target.value })} />
                          </div>

                          <div className="form-group" style={{ gridColumn: 'span 2', borderTop: '1px solid var(--border-glass)', paddingTop: '1rem', marginTop: '0.5rem' }}>
                            <h5 style={{ margin: '0 0 0.5rem 0', color: 'var(--blue-accent)' }}>Re-appointment Details</h5>
                          </div>
                          <div className="form-group">
                            <label>Re-appointment Date</label>
                            <input type="date" value={selectedEmp.reappointment_dt || ''} onChange={(e) => setSelectedEmp({ ...selectedEmp, reappointment_dt: e.target.value })} />
                          </div>
                          <div className="form-group">
                            <label>Internal Recruitment / Cadre Status</label>
                            <input type="text" value={selectedEmp.reappointment_type || ''} onChange={(e) => setSelectedEmp({ ...selectedEmp, reappointment_type: e.target.value })} placeholder="e.g. Same cadre or Other cadre" />
                          </div>

                          <div className="form-group" style={{ gridColumn: 'span 2', borderTop: '1px solid var(--border-glass)', paddingTop: '1rem', marginTop: '0.5rem' }}>
                            <h5 style={{ margin: '0 0 0.5rem 0', color: 'var(--yellow-accent)' }}>Promotion Refusal Record</h5>
                          </div>
                          <div className="form-group">
                            <label>Date of Refusal</label>
                            <input type="date" value={selectedEmp.prom_refused_dt || ''} onChange={(e) => setSelectedEmp({ ...selectedEmp, prom_refused_dt: e.target.value })} />
                          </div>
                          <div className="form-group">
                            <label>Reason for Refusal</label>
                            <input type="text" value={selectedEmp.prom_refused_reason || ''} onChange={(e) => setSelectedEmp({ ...selectedEmp, prom_refused_reason: e.target.value })} placeholder="e.g. Personal reasons, stay transfer" />
                          </div>
                          <div className="form-group" style={{ gridColumn: 'span 2' }}>
                            <label>Remarks / Notes</label>
                            <input type="text" value={selectedEmp.prom_refused_note || ''} onChange={(e) => setSelectedEmp({ ...selectedEmp, prom_refused_note: e.target.value })} placeholder="Enter formal order reference or notes..." />
                          </div>
                        </div>
                      )}

                      {/* SUB TAB 3: INCREMENTS & OFFICATING DETAILS */}
                      {subTab === 'increment' && (
                        <div className="form-grid-col2 animate-fade">
                          <div className="form-group">
                            <label>Last Increment Date</label>
                            <input type="date" value={selectedEmp.last_increment_dt || ''} onChange={(e) => setSelectedEmp({ ...selectedEmp, last_increment_dt: e.target.value })} />
                          </div>
                          <div className="form-group">
                            <label>Next Increment Due Date</label>
                            <input type="date" value={selectedEmp.next_increment_dt || ''} onChange={(e) => setSelectedEmp({ ...selectedEmp, next_increment_dt: e.target.value })} />
                          </div>
                          <div className="form-group">
                            <label>Suspension Days</label>
                            <input type="number" value={selectedEmp.suspension_days || 0} onChange={(e) => setSelectedEmp({ ...selectedEmp, suspension_days: parseInt(e.target.value, 10) || 0 })} />
                          </div>
                          <div className="form-group">
                            <label>Ex-Leave (Without Pay) Days</label>
                            <input type="number" value={selectedEmp.exleave_nopay_days || 0} onChange={(e) => setSelectedEmp({ ...selectedEmp, exleave_nopay_days: parseInt(e.target.value, 10) || 0 })} />
                          </div>
                          <div className="form-group">
                            <label>Basic Pay (₹)</label>
                            <input type="number" value={selectedEmp.basic || 0} onChange={(e) => setSelectedEmp({ ...selectedEmp, basic: parseFloat(e.target.value) || 0 })} />
                          </div>
                        </div>
                      )}

                      {/* SUB TAB 4: CAREER HISTORY LOGS */}
                      {subTab === 'career' && (() => {
                        const currentDesig = designations.find(d => d.desigz === selectedEmp.desigz);
                        const eligiblePosts = posts.filter(post => {
                          if (!currentDesig) return true;
                          return post.cat === currentDesig.cat && post.types === currentDesig.types;
                        });

                        return (
                          <div className="career-history-tab animate-fade" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
                            {/* Promotions log */}
                            <div className="log-list-section">
                              <h5 style={{ margin: '0 0 0.5rem 0', color: 'var(--primary-accent)' }}>Promotions History ({promotions.length})</h5>
                              <div className="mini-log-scroll" style={{ maxHeight: '120px', overflowY: 'auto', border: '1px solid var(--border-glass)', borderRadius: '0.25rem', padding: '0.5rem', marginBottom: '0.5rem' }}>
                                {promotions.length > 0 ? promotions.map((p, idx) => (
                                  <div key={idx} className="mini-log-item" style={{ fontSize: '0.72rem', borderBottom: '1px solid rgba(255,255,255,0.02)', padding: '0.25rem 0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <div>
                                      <strong>{p.prom_date}:</strong> {p.to_desig} (Scale: {p.to_scale} &bull; Pay: ₹{p.pay_after})
                                    </div>
                                    <button type="button" onClick={() => startEditPromotion(p)} style={{ background: 'none', border: '1px solid var(--border-glass)', borderRadius: '3px', color: 'var(--primary-accent)', cursor: 'pointer', padding: '0.15rem 0.4rem', fontSize: '0.65rem' }}>Edit</button>
                                  </div>
                                )) : <span style={{ fontSize: '0.72rem', color: 'var(--text-secondary)' }}>No promotion records found.</span>}
                              </div>
                              <form onSubmit={handleAddPromotion} style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', background: 'rgba(30,41,59,0.5)', padding: '0.75rem', borderRadius: '0.375rem', border: '1px solid var(--border-glass)' }}>
                                <label style={{ fontSize: '0.7rem', fontWeight: 600 }}>{editingPromId ? 'Edit Promotion' : 'Record Promotion'}</label>
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.4rem' }}>
                                  <input type="date" value={newPromDate} onChange={(e) => setNewPromDate(e.target.value)} required placeholder="Order Date" style={{ fontSize: '0.72rem', padding: '0.25rem' }} />
                                  <input type="date" value={newPromJoinDate} onChange={(e) => setNewPromJoinDate(e.target.value)} placeholder="Join Date" style={{ fontSize: '0.72rem', padding: '0.25rem' }} />
                                </div>
                                <select value={newPromToDesig} onChange={(e) => setNewPromToDesig(e.target.value)} required style={{ fontSize: '0.72rem', padding: '0.25rem' }}>
                                  <option value="">-- Select Post ({currentDesig?.cat || 'All'} category) --</option>
                                  {eligiblePosts.map(p => (
                                    <option key={p.dez_id} value={p.desigz || ''}>{p.desigz}</option>
                                  ))}
                                </select>
                                <input 
                                  list="prom-locations-list" 
                                  value={newPromPostLocation} 
                                  onChange={(e) => setNewPromPostLocation(e.target.value)} 
                                  placeholder="-- Search Posting Location --"
                                  style={{ fontSize: '0.72rem', padding: '0.25rem' }} 
                                />
                                <datalist id="prom-locations-list">
                                  {locations.map(l => (
                                    <option key={l.loccode} value={`${l.loccode} - ${l.locnm}`}>{l.loccode} - {l.locnm}</option>
                                  ))}
                                </datalist>
                                <input type="number" placeholder="Revised Basic Pay (₹)" value={newPromPayAfter} onChange={(e) => setNewPromPayAfter(e.target.value)} style={{ fontSize: '0.72rem', padding: '0.25rem' }} />
                                <div style={{ display: 'flex', gap: '0.5rem' }}>
                                  <button type="submit" className="save-btn" style={{ fontSize: '0.72rem', padding: '0.3rem', flex: 1 }}>{editingPromId ? 'Save Updates' : 'Add Promotion Entry'}</button>
                                  {editingPromId && <button type="button" onClick={() => { setEditingPromId(null); setNewPromDate(''); setNewPromToDesig(''); setNewPromPayAfter('0'); setNewPromPostLocation(''); setNewPromJoinDate(''); }} style={{ fontSize: '0.72rem', padding: '0.3rem', background: 'var(--border-glass)', border: 'none', color: 'white', borderRadius: '0.25rem', cursor: 'pointer' }}>Cancel</button>}
                                </div>
                              </form>
                            </div>

                            {/* Transfers log */}
                            <div className="log-list-section">
                              <h5 style={{ margin: '0 0 0.5rem 0', color: 'var(--green-accent)' }}>Transfers History ({transfers.length})</h5>
                              <div className="mini-log-scroll" style={{ maxHeight: '120px', overflowY: 'auto', border: '1px solid var(--border-glass)', borderRadius: '0.25rem', padding: '0.5rem', marginBottom: '0.5rem' }}>
                                {transfers.length > 0 ? transfers.map((t, idx) => (
                                  <div key={idx} className="mini-log-item" style={{ fontSize: '0.72rem', borderBottom: '1px solid rgba(255,255,255,0.02)', padding: '0.25rem 0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <div>
                                      <strong>{t.transfer_date}:</strong> {t.from_location || 'Pune'} ➡️ {t.to_location} ({t.transfer_type})
                                    </div>
                                    <button type="button" onClick={() => startEditTransfer(t)} style={{ background: 'none', border: '1px solid var(--border-glass)', borderRadius: '3px', color: 'var(--green-accent)', cursor: 'pointer', padding: '0.15rem 0.4rem', fontSize: '0.65rem' }}>Edit</button>
                                  </div>
                                )) : <span style={{ fontSize: '0.72rem', color: 'var(--text-secondary)' }}>No transfer records found.</span>}
                              </div>
                              <form onSubmit={handleAddTransfer} style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', background: 'rgba(30,41,59,0.5)', padding: '0.75rem', borderRadius: '0.375rem', border: '1px solid var(--border-glass)' }}>
                                <label style={{ fontSize: '0.7rem', fontWeight: 600 }}>{editingTransferId ? 'Edit Transfer' : 'Record Transfer'}</label>
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.4rem' }}>
                                  <input type="date" value={newTransDate} onChange={(e) => setNewTransDate(e.target.value)} required style={{ fontSize: '0.72rem', padding: '0.25rem' }} title="Transfer Order Date" />
                                  <select value={newTransType} onChange={(e) => setNewTransType(e.target.value)} style={{ fontSize: '0.72rem', padding: '0.25rem' }}>
                                    <option value="Regular">Regular Transfer</option>
                                    <option value="Mutual">Mutual Transfer</option>
                                    <option value="Request">On Request</option>
                                  </select>
                                </div>
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.4rem' }}>
                                  <input 
                                    list="locations-list" 
                                    value={newTransFromLoc} 
                                    onChange={(e) => setNewTransFromLoc(e.target.value)} 
                                    placeholder="-- Search From Location --"
                                    style={{ fontSize: '0.72rem', padding: '0.25rem' }} 
                                  />
                                  <input 
                                    list="locations-list" 
                                    value={newTransToLoc} 
                                    onChange={(e) => setNewTransToLoc(e.target.value)} 
                                    required 
                                    placeholder="-- Search To Location --"
                                    style={{ fontSize: '0.72rem', padding: '0.25rem' }} 
                                  />
                                  <datalist id="locations-list">
                                    {locations.map(l => (
                                      <option key={l.loccode} value={`${l.loccode} - ${l.locnm}`}>{l.loccode} - {l.locnm}</option>
                                    ))}
                                  </datalist>
                                </div>
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.4rem' }}>
                                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.1rem' }}>
                                    <span style={{ fontSize: '0.6rem', color: 'var(--text-secondary)' }}>Transferred From Date</span>
                                    <input type="date" value={newTransFromDate} onChange={(e) => setNewTransFromDate(e.target.value)} style={{ fontSize: '0.72rem', padding: '0.25rem' }} />
                                  </div>
                                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.1rem' }}>
                                    <span style={{ fontSize: '0.6rem', color: 'var(--text-secondary)' }}>Joined To Date</span>
                                    <input type="date" value={newTransToDate} onChange={(e) => setNewTransToDate(e.target.value)} style={{ fontSize: '0.72rem', padding: '0.25rem' }} />
                                  </div>
                                </div>
                                <select value={newTransToDesig} onChange={(e) => setNewTransToDesig(e.target.value)} required style={{ fontSize: '0.72rem', padding: '0.25rem' }}>
                                  <option value="">-- Post at new location --</option>
                                  {posts.map(p => (
                                    <option key={p.dez_id} value={p.desigz || ''}>{p.desigz}</option>
                                  ))}
                                </select>
                                <div style={{ display: 'flex', gap: '0.5rem' }}>
                                  <button type="submit" className="save-btn" style={{ fontSize: '0.72rem', padding: '0.3rem', flex: 1 }}>{editingTransferId ? 'Save Updates' : 'Add Transfer Entry'}</button>
                                  {editingTransferId && <button type="button" onClick={() => { setEditingTransferId(null); setNewTransDate(''); setNewTransFromDate(''); setNewTransToDate(''); setNewTransFromLoc(''); setNewTransToLoc(''); setNewTransToDesig(''); }} style={{ fontSize: '0.72rem', padding: '0.3rem', background: 'var(--border-glass)', border: 'none', color: 'white', borderRadius: '0.25rem', cursor: 'pointer' }}>Cancel</button>}
                                </div>
                              </form>
                            </div>
                          </div>
                        );
                      })()}

                      {subTab !== 'career' && (
                        <button className="save-btn" onClick={() => saveEmployeeDetails(selectedEmp)}>
                          Save Modifications
                        </button>
                      )}
                    </div>
                  ) : (
                    <div className="select-placeholder">
                      <p>Select an employee from the directory list to edit their details.</p>
                    </div>
                  )}
                </div>

              </div>
            </div>
          )}

          {/* TAB 3: GO 74/111 MODULE */}
          {activeTab === 'go74' && (
            <div className="go74-view animate-fade">
              {selectedEmp ? (
                <div className="go74-workspace">
                  <div className="emp-summary-header">
                    <h4>GO 74 Benefits Fixation Dashboard</h4>
                    <p>{selectedEmp.empnm} ({selectedEmp.empno}) &bull; Basic Pay: ₹{selectedEmp.basic.toLocaleString()} &bull; Joining Date: {selectedEmp.compjoindt || 'N/A'}</p>
                  </div>

                  <div className="go-benefits-cards">
                    <div className="benefit-badge-card">
                      <h5>1st GO Benefit (6 Years Service)</h5>
                      <div className="card-detail">
                        <span>Anniversary Due Date:</span>
                        <strong>
                          {selectedEmp.compjoindt ? (() => {
                            const d = new Date(selectedEmp.compjoindt);
                            d.setFullYear(d.getFullYear() + 6);
                            return d.toISOString().split('T')[0];
                          })() : 'N/A'}
                        </strong>
                      </div>
                      <div className="card-status">
                        Status: {selectedEmp.istgodt ? `✅ Granted on ${selectedEmp.istgodt}` : '⏳ Outstanding'}
                      </div>
                    </div>

                    <div className="benefit-badge-card">
                      <h5>2nd GO Benefit (15 Years Service)</h5>
                      <div className="card-detail">
                        <span>Anniversary Due Date:</span>
                        <strong>
                          {selectedEmp.compjoindt ? (() => {
                            const d = new Date(selectedEmp.compjoindt);
                            d.setFullYear(d.getFullYear() + 15);
                            return d.toISOString().split('T')[0];
                          })() : 'N/A'}
                        </strong>
                      </div>
                      <div className="card-status">
                        Status: {selectedEmp.iindgodt ? `✅ Granted on ${selectedEmp.iindgodt}` : '⏳ Outstanding'}
                      </div>
                    </div>

                    <div className="benefit-badge-card">
                      <h5>3rd GO Benefit (28 Years Service)</h5>
                      <div className="card-detail">
                        <span>Anniversary Due Date:</span>
                        <strong>
                          {selectedEmp.compjoindt ? (() => {
                            const d = new Date(selectedEmp.compjoindt);
                            d.setFullYear(d.getFullYear() + 28);
                            return d.toISOString().split('T')[0];
                          })() : 'N/A'}
                        </strong>
                      </div>
                      <div className="card-status">
                        Status: {selectedEmp.iiirdgodt ? `✅ Granted on ${selectedEmp.iiirdgodt}` : '⏳ Outstanding'}
                      </div>
                    </div>
                  </div>

                  <div className="fixation-simulation-panel">
                    <h3>💰 Fixation Calculator (GO 74 Regulation)</h3>
                    <p>Formula: Fix pay at <code>Max(First stage of upper scale, Current Basic Pay + First increment of upper scale)</code></p>
                    
                    <div className="simulation-inputs">
                      <div className="form-group">
                        <label>Current Scale: {selectedEmp.payscl || 'N/A'}</label>
                      </div>
                      <div className="form-group">
                        <label>Select Upper Pay Scale Designation</label>
                        <select
                          className="scale-select-field"
                          onChange={(e) => {
                            const { newPay, increment, scaleCode } = previewGoFixation(selectedEmp.basic, e.target.value);
                            alert(`Fixation Result:\n------------------\n- Current Pay: ₹${selectedEmp.basic}\n- First Increment: ₹${increment}\n- New Fixed Pay: ₹${newPay}\n- Designated Scale: ${scaleCode}`);
                          }}
                        >
                          <option value="">-- Choose Target Scale --</option>
                          {payScales.map(scale => (
                            <option key={scale.scaleno} value={scale.scaleno}>
                              Scale {scale.scaleno}: {scale.payscl}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>
                  </div>

                  <div className="fixation-simulation-panel" style={{ marginTop: '1.5rem' }}>
                    <h3>📈 5-Year Pay Revision Simulator</h3>
                    <p>Simulate standard pay scale revisions (e.g., 2014, 2019, 2024 revisions) applying a standard fitment and DA merge formula.</p>
                    <div className="simulation-inputs" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem', marginTop: '1rem' }}>
                      <div className="form-group">
                        <label>Fitment Revision Year</label>
                        <select value={simRevisionYear} onChange={(e) => setSimRevisionYear(e.target.value)}>
                          <option value="2014">2014 Revision (8% Fitment)</option>
                          <option value="2019">2019 Revision (12% Fitment)</option>
                          <option value="2024">2024 Revision (15% Fitment)</option>
                        </select>
                      </div>
                      <div className="form-group">
                        <label>Current Basic Pay (₹)</label>
                        <input type="number" value={simCurrentPay} onChange={(e) => setSimCurrentPay(e.target.value)} />
                      </div>
                      <div className="form-group" style={{ display: 'flex', alignItems: 'flex-end' }}>
                        <button
                          className="save-btn"
                          style={{ width: '100%', padding: '0.6rem' }}
                          onClick={() => {
                            const basic = parseFloat(simCurrentPay) || 0;
                            const fitmentPct = simRevisionYear === '2014' ? 0.08 : simRevisionYear === '2019' ? 0.12 : 0.15;
                            const fitmentAmt = basic * fitmentPct;
                            const daMerge = basic * 0.50; // assuming standard 50% DA merge on pay revision
                            const revisedPay = basic + fitmentAmt + daMerge;
                            alert(`5-Year Pay Revision Fixation Result:\n-------------------------------------\n- Pre-Revised Pay: ₹${basic.toLocaleString()}\n- Fitment Benefit (${fitmentPct * 100}%): ₹${fitmentAmt.toLocaleString()}\n- DA Merged (50%): ₹${daMerge.toLocaleString()}\n- Estimated Fixed Revised Pay: ₹${Math.round(revisedPay).toLocaleString()}`);
                          }}
                        >
                          Simulate 5-Year Revision
                        </button>
                      </div>
                    </div>
                  </div>

                </div>
              ) : (
                <div className="select-placeholder">
                  <p>Please select an employee in the <strong>Employee Master</strong> tab first to load their GO eligibility dashboard.</p>
                </div>
              )}
            </div>
          )}

          {/* TAB 4: ANNUAL INCREMENT */}
          {activeTab === 'increment' && (
            <div className="increment-view animate-fade">
              {selectedEmp ? (
                <div className="increment-workspace">
                  <div className="emp-summary-header">
                    <h4>Annual Increment Anniversary Calculator (SR Rule 32)</h4>
                    <p>{selectedEmp.empnm} ({selectedEmp.empno}) &bull; Joining: {selectedEmp.compjoindt} &bull; Next Increment Date: {selectedEmp.next_increment_dt || 'N/A'}</p>
                  </div>

                  <div className="qualifying-rules-card">
                    <h3>Service Regulation 2005 - Rule 32 Deduction Audit</h3>
                    <p>Non-qualifying service periods (like suspension or ex-leave without pay) push the annual increment anniversary forward by the matching number of days.</p>
                    
                    <div className="deductions-box-grid">
                      <div className="audit-item">
                        <span>Suspension Days:</span>
                        <strong>{selectedEmp.suspension_days} days</strong>
                      </div>
                      <div className="audit-item">
                        <span>Ex-Leave (No Pay) Days:</span>
                        <strong>{selectedEmp.exleave_nopay_days} days</strong>
                      </div>
                      <div className="audit-item highlight">
                        <span>Total Shift Offset:</span>
                        <strong>{selectedEmp.suspension_days + selectedEmp.exleave_nopay_days} days</strong>
                      </div>
                    </div>

                    <div className="calculator-preview">
                      <button
                        className="simulate-increment-btn"
                        onClick={() => {
                          const base = selectedEmp.last_increment_dt || selectedEmp.compjoindt;
                          if (!base) {
                            alert('Missing base date of joining or increment.');
                            return;
                          }
                          const d = new Date(base);
                          d.setFullYear(d.getFullYear() + 1);
                          d.setDate(d.getDate() + (selectedEmp.suspension_days + selectedEmp.exleave_nopay_days));
                          alert(`Increment Anniversary Fixed:\n--------------------------\n- Last Increment Date: ${base}\n- Qualifying Deductions: ${selectedEmp.suspension_days + selectedEmp.exleave_nopay_days} days\n- Revised Increment Due Date: ${d.toISOString().split('T')[0]}`);
                        }}
                      >
                        Compute Qualifying Increment Anniversary
                      </button>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="select-placeholder">
                  <p>Please select an employee in the <strong>Employee Master</strong> tab first to load their increment rules auditor.</p>
                </div>
              )}
            </div>
          )}

          {/* TAB 5: SENIORITY MODULE */}
          {activeTab === 'seniority' && (
            <div className="seniority-view animate-fade">
              <div className="seniority-controls" style={{ marginBottom: '1.5rem' }}>
                <h3>🎖️ Seniority Rankings Generator & Editor</h3>
                <p>Filter Class III/IV by Location and Post to generate a sortable Seniority List. Editable fields allow manual overriding of seniority (e.g. for Request Transfers).</p>
                
                {senioritySuccess && (
                  <div className="alert-success-small" style={{ marginBottom: '1rem', padding: '0.75rem', background: 'rgba(34, 197, 94, 0.1)', border: '1px solid rgba(34, 197, 94, 0.3)', borderRadius: '0.5rem', color: '#4ade80' }}>
                    {senioritySuccess}
                  </div>
                )}
                
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr 1fr 1fr', gap: '0.75rem', background: 'rgba(30,41,59,0.5)', padding: '1.25rem', borderRadius: '0.5rem', border: '1px solid var(--border-glass)' }}>
                  <div className="form-group">
                    <label>Class Group</label>
                    <select value={seniorityClass} onChange={(e) => setSeniorityClass(e.target.value as 'III' | 'IV')} style={{ fontSize: '0.8rem', padding: '0.5rem' }}>
                      <option value="III">Class III (Circle Seniority)</option>
                      <option value="IV">Class IV (Division Seniority)</option>
                    </select>
                  </div>
                  <div className="form-group">
                    <label>Category</label>
                    <select value={seniorityCategory} onChange={(e) => setSeniorityCategory(e.target.value)} style={{ fontSize: '0.8rem', padding: '0.5rem' }}>
                      <option value="">(All)</option>
                      <option value="Technical">Technical</option>
                      <option value="Non-Technical">Non-Technical</option>
                    </select>
                  </div>
                  <div className="form-group">
                    <label>Circle</label>
                    <select value={seniorityCircle} onChange={(e) => { setSeniorityCircle(e.target.value); setSeniorityDivision(''); }} style={{ fontSize: '0.8rem', padding: '0.5rem' }}>
                      <option value="">-- Select Circle --</option>
                      {Object.keys(hierarchyData || {}).map(zone => (
                        hierarchyData[zone]?.circles ? Object.keys(hierarchyData[zone].circles).map(circle => (
                          <option key={`${zone}-${circle}`} value={circle}>{circle}</option>
                        )) : null
                      ))}
                    </select>
                  </div>
                  <div className="form-group">
                    <label>Division</label>
                    <select 
                      value={seniorityDivision} 
                      onChange={(e) => setSeniorityDivision(e.target.value)} 
                      disabled={!seniorityCircle} 
                      style={{ fontSize: '0.8rem', padding: '0.5rem' }}
                    >
                      {seniorityClass === 'III' && <option value="(All Divisions)">(All Divisions)</option>}
                      <option value="">-- Select Division --</option>
                      {(() => {
                        for (const zone of Object.keys(hierarchyData || {})) {
                          if (hierarchyData[zone]?.circles?.[seniorityCircle]) {
                            return Object.keys(hierarchyData[zone].circles[seniorityCircle].divisions).map((d: string) => (
                              <option key={d} value={d}>{d}</option>
                            ));
                          }
                        }
                        return null;
                      })()}
                    </select>
                  </div>
                  <div className="form-group">
                    <label>Designation / Post</label>
                    <select value={seniorityPost} onChange={(e) => setSeniorityPost(e.target.value)} style={{ fontSize: '0.8rem', padding: '0.5rem' }}>
                      <option value="">-- Select Post --</option>
                      {posts
                        .filter(p => {
                           const matchesClass = p.paygrp === seniorityClass || p.cat?.includes(seniorityClass) || p.types?.includes(seniorityClass);
                           const matchesCat = seniorityCategory ? p.cat === seniorityCategory : true;
                           return matchesClass && matchesCat;
                        })
                        .map(p => (
                        <option key={p.dez_id} value={p.desigz || ''}>{p.desigz}</option>
                      ))}
                    </select>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'flex-end' }}>
                    <button className="run-roster-btn" onClick={handleGenerateSeniority} disabled={seniorityLoading || !seniorityCircle || !seniorityPost} style={{ height: '42px' }}>
                      {seniorityLoading ? 'Loading...' : 'Load Seniority List'}
                    </button>
                  </div>
                </div>
              </div>

              {seniorityReport.length > 0 && (
                <div className="seniority-report-table-box" style={{ background: 'var(--card-bg)', border: '1px solid var(--border-glass)', borderRadius: '0.5rem', padding: '1rem' }}>
                  <div style={{ 
                    background: '#1a1a2e', 
                    borderLeft: '4px solid #f39c12', 
                    padding: '0.75rem 1rem', 
                    borderRadius: '0 8px 8px 0', 
                    marginBottom: '1rem', 
                    fontSize: '0.85rem' 
                  }}>
                    <b style={{ color: '#f39c12' }}>📝 Inline Edit Mode</b>
                    <span style={{ color: '#ccc', marginLeft: '0.5rem' }}>— Edit any cell directly in the table below. Changes save to Employee Master and Seniority Overrides together. Only <b>Emp No</b> and <b>Effective Seniority Date</b> are read-only.</span>
                  </div>
                  
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                    <h4 style={{ margin: 0 }}>Generated Seniority Roster ({seniorityReport.length} personnel)</h4>
                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                      <button onClick={handleBulkUpdateSeniority} style={{ padding: '0.5rem 1rem', fontSize: '0.75rem', background: 'var(--green-accent)', border: 'none', borderRadius: '0.25rem', color: 'black', cursor: 'pointer', fontWeight: 'bold' }}>💾 Save All Changes</button>
                      <button onClick={handleExportExcel} style={{ padding: '0.5rem 1rem', fontSize: '0.75rem', background: 'rgba(56,189,248,0.15)', border: '1px solid var(--border-glass)', borderRadius: '0.25rem', color: 'white', cursor: 'pointer', fontWeight: '600' }}>📥 Download Seniority List (Excel)</button>
                    </div>
                  </div>
                  
                  <div style={{ overflowX: 'auto' }}>
                    <table className="workspace-table" style={{ fontSize: '0.7rem', minWidth: '2500px' }}>
                      <thead>
                        <tr>
                          <th>Seniority No</th>
                          <th>Emp No</th>
                          <th>Employee Name</th>
                          <th>Division</th>
                          <th>Location</th>
                          <th>Caste Category</th>
                          <th>Sub-Caste</th>
                          <th>Caste Validity Status</th>
                          <th>Caste Validity Cert No</th>
                          <th>Caste Validity Date</th>
                          <th>Promoted From Post</th>
                          <th>Promotion/Joining Date</th>
                          <th>Transfer Date</th>
                          <th>Transfer Type</th>
                          <th>Transfer From Zone/Circle</th>
                          <th>Date Joined (Company)</th>
                          <th>Present Post Joining Date</th>
                          <th>Effective Seniority Date</th>
                          <th>Date of Birth</th>
                          <th>Remarks</th>
                        </tr>
                      </thead>
                      <tbody>
                        {seniorityReport.map((emp) => (
                          <tr key={emp.empNo}>
                            <td>
                              <input 
                                type="number" 
                                defaultValue={emp.seniorityNo} 
                                style={{ width: '70px', padding: '0.2rem', background: 'rgba(15,23,42,0.6)', color: '#ffffff', border: '1px solid rgba(148,163,184,0.15)', borderRadius: '3px' }} 
                                id={`sen_no_${emp.empNo}`}
                              />
                            </td>
                            <td style={{ color: '#9ca3af', fontWeight: '500' }}>{emp.empNo}</td>
                            <td>
                              <input 
                                type="text" 
                                defaultValue={emp.employeeName || ''} 
                                style={{ width: '120px', padding: '0.2rem', background: 'rgba(15,23,42,0.6)', color: '#ffffff', border: '1px solid rgba(148,163,184,0.15)', borderRadius: '3px' }}
                                id={`sen_empnm_${emp.empNo}`}
                              />
                            </td>
                            <td>{emp.division || ''}</td>
                            <td>{emp.location || ''}</td>
                            <td>
                              <select 
                                defaultValue={emp.casteCategory || ''}
                                id={`sen_castcat_${emp.empNo}`}
                                style={{ width: '90px', padding: '0.2rem', background: 'rgba(15,23,42,0.6)', color: '#ffffff', border: '1px solid rgba(148,163,184,0.15)', borderRadius: '3px' }}
                              >
                                <option value="">Select</option>
                                <option value="OPEN">OPEN</option>
                                <option value="SC">SC</option>
                                <option value="ST">ST</option>
                                <option value="VJ-A">VJ-A</option>
                                <option value="NT-B">NT-B</option>
                                <option value="NT-C">NT-C</option>
                                <option value="NT-D">NT-D</option>
                                <option value="SBC">SBC</option>
                                <option value="OBC">OBC</option>
                                <option value="EWS">EWS</option>
                              </select>
                            </td>
                            <td>
                              <input 
                                type="text" 
                                defaultValue={emp.subCaste || ''} 
                                style={{ width: '80px', padding: '0.2rem', background: 'rgba(15,23,42,0.6)', color: '#ffffff', border: '1px solid rgba(148,163,184,0.15)', borderRadius: '3px' }}
                                id={`sen_subcast_${emp.empNo}`}
                              />
                            </td>
                            <td>
                              <input 
                                type="text" 
                                defaultValue={emp.casteValidityStatus || ''} 
                                style={{ width: '100px', padding: '0.2rem', background: 'rgba(15,23,42,0.6)', color: '#ffffff', border: '1px solid rgba(148,163,184,0.15)', borderRadius: '3px' }}
                                id={`sen_castvalstat_${emp.empNo}`}
                              />
                            </td>
                            <td>
                              <input 
                                type="text" 
                                defaultValue={emp.casteValidityCertNo || ''} 
                                style={{ width: '100px', padding: '0.2rem', background: 'rgba(15,23,42,0.6)', color: '#ffffff', border: '1px solid rgba(148,163,184,0.15)', borderRadius: '3px' }}
                                id={`sen_castvalno_${emp.empNo}`}
                              />
                            </td>
                            <td>
                              <input 
                                type="date" 
                                defaultValue={convertDisplayDateToInput(emp.casteValidityDate || '')} 
                                style={{ width: '110px', padding: '0.2rem', background: 'rgba(15,23,42,0.6)', color: '#ffffff', border: '1px solid rgba(148,163,184,0.15)', borderRadius: '3px' }}
                                id={`sen_castvaldt_${emp.empNo}`}
                              />
                            </td>
                            <td>{emp.promotedFromPost || ''}</td>
                            <td>{emp.promotionJoiningDate || ''}</td>
                            <td>
                              <input 
                                type="date" 
                                defaultValue={convertDisplayDateToInput(emp.transferDate || '')} 
                                style={{ width: '110px', padding: '0.2rem', background: 'rgba(15,23,42,0.6)', color: '#ffffff', border: '1px solid rgba(148,163,184,0.15)', borderRadius: '3px' }}
                                id={`sen_transdt_${emp.empNo}`}
                              />
                            </td>
                            <td>
                              <input 
                                type="text" 
                                defaultValue={emp.transferType || ''} 
                                style={{ width: '90px', padding: '0.2rem', background: 'rgba(15,23,42,0.6)', color: '#ffffff', border: '1px solid rgba(148,163,184,0.15)', borderRadius: '3px' }}
                                id={`sen_transtype_${emp.empNo}`}
                              />
                            </td>
                            <td>{emp.transferFromZoneCircle || ''}</td>
                            <td>
                              <input 
                                type="date" 
                                defaultValue={convertDisplayDateToInput(emp.dateJoinedCompany || '')} 
                                style={{ width: '110px', padding: '0.2rem', background: 'rgba(15,23,42,0.6)', color: '#ffffff', border: '1px solid rgba(148,163,184,0.15)', borderRadius: '3px' }}
                                id={`sen_compjoindt_${emp.empNo}`}
                              />
                            </td>
                            <td>
                              <input 
                                type="date" 
                                defaultValue={convertDisplayDateToInput(emp.presentPostJoiningDate || '')} 
                                style={{ width: '110px', padding: '0.2rem', background: 'rgba(15,23,42,0.6)', color: '#ffffff', border: '1px solid rgba(148,163,184,0.15)', borderRadius: '3px' }}
                                id={`sen_ppljoindt_${emp.empNo}`}
                              />
                            </td>
                            <td style={{ background: 'rgba(59, 130, 246, 0.1)', color: '#93c5fd' }}>
                              {emp.effectiveSeniorityDate || ''}
                            </td>
                            <td>
                              <input 
                                type="date" 
                                defaultValue={convertDisplayDateToInput(emp.dateOfBirth || '')} 
                                style={{ width: '110px', padding: '0.2rem', background: 'rgba(15,23,42,0.6)', color: '#ffffff', border: '1px solid rgba(148,163,184,0.15)', borderRadius: '3px' }}
                                id={`sen_brthdt_${emp.empNo}`}
                              />
                            </td>
                            <td>
                              <textarea 
                                defaultValue={emp.remarks || ''} 
                                style={{ width: '100px', padding: '0.2rem', background: 'rgba(15,23,42,0.6)', color: '#ffffff', border: '1px solid rgba(148,163,184,0.15)', borderRadius: '3px', fontSize: '0.7rem', resize: 'vertical', minHeight: '40px' }}
                                id={`sen_remarks_${emp.empNo}`}
                              />
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB 6: LEAVE RECORDS */}
          {activeTab === 'leaves' && (
            <div className="leaves-view animate-fade">
              {selectedEmp ? (
                <div className="leaves-workspace">
                  <div className="emp-summary-header">
                    <h4>Leave records & Overlap validation ledger</h4>
                    <p>{selectedEmp.empnm} ({selectedEmp.empno})</p>
                  </div>

                  <div className="leave-split-grid">
                    
                    {/* Left: Add Leave record */}
                    <div className="add-leave-card">
                      <h3>Add New Leave Log</h3>
                      
                      {leaveSuccess && <div className="alert-success-small">{leaveSuccess}</div>}
                      {leaveError && <div className="alert-error-small">{leaveError}</div>}

                      <form onSubmit={handleAddLeave}>
                        <div className="form-group">
                          <label>Leave Type</label>
                          <select value={newLeaveType} onChange={(e) => setNewLeaveType(e.target.value)}>
                            <option value="LAP">Leave on Average Pay (LAP)</option>
                            <option value="LHAP">Leave on Half Average Pay (LHAP)</option>
                            <option value="Commuted">Commuted Leave (COM)</option>
                            <option value="EOL">Extraordinary Leave (EOL)</option>
                          </select>
                        </div>
                        <div className="form-group">
                          <label>From Date</label>
                          <input type="date" value={newLeaveFrom} onChange={(e) => setNewLeaveFrom(e.target.value)} required />
                        </div>
                        <div className="form-group">
                          <label>To Date</label>
                          <input type="date" value={newLeaveTo} onChange={(e) => setNewLeaveTo(e.target.value)} required />
                        </div>
                        <div className="form-group">
                          <label>Leave Duration (Days)</label>
                          <input type="number" value={newLeaveDays} onChange={(e) => setNewLeaveDays(e.target.value)} required />
                        </div>
                        <button type="submit" className="save-btn">Register Leave</button>
                      </form>
                    </div>

                    {/* Right: Leave logs table */}
                    <div className="leave-history-card">
                      <h3>Registered Leave Logs ({leaves.length})</h3>
                      <div className="logs-scroll-box">
                        <table className="workspace-table">
                          <thead>
                            <tr>
                              <th>Type</th>
                              <th>From</th>
                              <th>To</th>
                              <th>Duration</th>
                            </tr>
                          </thead>
                          <tbody>
                            {leaves.length > 0 ? (
                              leaves.map(log => (
                                <tr key={log.id}>
                                  <td>{log.leave_type}</td>
                                  <td>{log.from_dt}</td>
                                  <td>{log.to_dt}</td>
                                  <td>{log.days} days</td>
                                </tr>
                              ))
                            ) : (
                              <tr>
                                <td colSpan={4} style={{ textAlign: 'center' }}>No leaves registered.</td>
                              </tr>
                            )}
                          </tbody>
                        </table>
                      </div>
                    </div>

                  </div>
                </div>
              ) : (
                <div className="select-placeholder">
                  <p>Please select an employee in the <strong>Employee Master</strong> tab first to load their leave logs.</p>
                </div>
              )}
            </div>
          )}

          {/* TAB 7: RETIREMENT CLAIMS */}
          {activeTab === 'retirement' && (
            <div className="retirement-view animate-fade">
              {selectedEmp ? (
                <div className="retirement-workspace">
                  <div className="emp-summary-header">
                    <h4>🏝️ Post-Retirement Claims Calculator</h4>
                    <p>{selectedEmp.empnm} ({selectedEmp.empno}) &bull; Last Basic Pay: ₹{selectedEmp.basic.toLocaleString()}</p>
                  </div>

                  <div className="claims-controls">
                    <div className="inputs-row">
                      <div className="form-group">
                        <label>Current DA Percentage (%)</label>
                        <input
                          type="number"
                          value={daPercentage}
                          onChange={(e) => setDaPercentage(parseFloat(e.target.value) || 0)}
                        />
                      </div>
                      <div className="form-group">
                        <label>Statutory Gratuity Limit (₹)</label>
                        <input
                          type="number"
                          value={statutoryLimit}
                          onChange={(e) => setStatutoryLimit(parseFloat(e.target.value) || 0)}
                        />
                      </div>
                    </div>

                    {/* Calculations Summary */}
                    {(() => {
                      const daAmount = Math.round(selectedEmp.basic * (daPercentage / 100));
                      const totalEmoluments = selectedEmp.basic + daAmount;
                      const { years: qYears, text: qYearsText } = calculateQualifyingServiceYears(selectedEmp.compjoindt, selectedEmp.dtofretir);
                      const calculatedGratuity = (totalEmoluments * 15 / 26) * qYears;
                      const finalGratuity = Math.min(calculatedGratuity, statutoryLimit);

                      // LAP Encashment
                      const lapDays = parseFloat(retLAPDays) || 0;
                      const lapAmount = (totalEmoluments * lapDays) / 30;

                      // COM Encashment
                      const comDays = parseFloat(retCOMDays) || 0;
                      const comAmount = (totalEmoluments * comDays) / 30;

                      return (
                        <div className="claims-results-grid">
                          
                          <div className="claim-item-result">
                            <h4>🏛️ Gratuity Claims</h4>
                            <p title={qYearsText}>Qualifying Service: {qYears} Years</p>
                            <p>Formula: (₹{totalEmoluments.toLocaleString()} &times; 15 &divide; 26) &times; {qYears} years</p>
                            <h3>₹{finalGratuity.toLocaleString(undefined, { minimumFractionDigits: 2 })}</h3>
                            {calculatedGratuity > statutoryLimit && <span className="warning-note">Capped at limit of ₹{statutoryLimit.toLocaleString()}</span>}
                          </div>

                          <div className="claim-item-result">
                            <h4>🏖️ LAP Leave Encashment</h4>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', margin: '0.25rem 0' }}>
                              <label style={{ fontSize: '0.75rem' }}>Capped Days:</label>
                              <input type="number" value={retLAPDays} onChange={(e) => setRetLAPDays(e.target.value)} style={{ width: '80px', padding: '0.2rem', fontSize: '0.75rem', background: 'rgba(15,23,42,0.6)', color: '#ffffff', border: '1px solid rgba(148,163,184,0.15)' }} />
                            </div>
                            <p>Formula: (₹{totalEmoluments.toLocaleString()} &times; {lapDays}) &divide; 30</p>
                            <h3>₹{lapAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}</h3>
                          </div>

                          <div className="claim-item-result">
                            <h4>🏥 COM Leave Encashment</h4>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', margin: '0.25rem 0' }}>
                              <label style={{ fontSize: '0.75rem' }}>Capped Days:</label>
                              <input type="number" value={retCOMDays} onChange={(e) => setRetCOMDays(e.target.value)} style={{ width: '80px', padding: '0.2rem', fontSize: '0.75rem', background: 'rgba(15,23,42,0.6)', color: '#ffffff', border: '1px solid rgba(148,163,184,0.15)' }} />
                            </div>
                            <p>Formula: (₹{totalEmoluments.toLocaleString()} &times; {comDays}) &divide; 30</p>
                            <h3>₹{comAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}</h3>
                          </div>

                          <div className="total-package-card">
                            <h3>Combined Settlement Package:</h3>
                            <h2>₹{(finalGratuity + lapAmount + comAmount).toLocaleString(undefined, { minimumFractionDigits: 2 })}</h2>
                            <button className="download-docx-order-btn" onClick={() => setRetirementPrintMode(true)}>
                              📄 Print Claim Order
                            </button>
                          </div>

                        </div>
                      );
                    })()}
                  </div>
                </div>
              ) : (
                <div className="select-placeholder">
                  <p>Please select an employee in the <strong>Employee Master</strong> tab first to load their retirement claims modeler.</p>
                </div>
              )}
            </div>
          )}

          {/* TAB 8: PAY SCALES CIRCULARS */}
          {activeTab === 'payscales' && (
            <div className="payscales-view animate-fade">
              <h3>💰 Registered Pay Scales Circular Roster</h3>
              <p>Below is the list of all active pay scale series and circular ranges populated directly from the PostgreSQL database.</p>
              
              <div className="pay-scales-table-box">
                <table className="workspace-table">
                  <thead>
                    <tr>
                      <th>Scale ID</th>
                      <th>Pay Scale Band / Stages</th>
                      <th>Class Category</th>
                    </tr>
                  </thead>
                  <tbody>
                    {payScales.map(scale => (
                      <tr key={scale.scaleno}>
                        <td>Scale {scale.scaleno}</td>
                        <td>{scale.payscl || `₹${scale.stage1} - ₹${scale.stage2} - ₹${scale.stage3}`}</td>
                        <td>{scale.category || 'Class III / IV'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB 9: MAINTAIN DA RATES & GO 74 NOTIONAL ARREARS */}
          {activeTab === 'maintain_da' && (
            <div className="maintain-da-view animate-fade" style={{ display: 'grid', gridTemplateColumns: '1.2fr 1.8fr', gap: '2rem' }}>
              {/* Left: DA rates ledger */}
              <div className="da-rates-ledger-panel">
                <h3>📈 Maharashtra DA Rates Registry</h3>
                <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Historic dearness allowance percentages used to calculate retrospective arrears benefits.</p>
                <div className="pay-scales-table-box" style={{ maxHeight: '280px', overflowY: 'auto', marginBottom: '1.5rem' }}>
                  <table className="workspace-table">
                    <thead>
                      <tr>
                        <th>Effective From</th>
                        <th>Effective To</th>
                        <th>DA Rate (%)</th>
                      </tr>
                    </thead>
                    <tbody>
                      {daRates.map((r, idx) => (
                        <tr key={idx}>
                          <td>{r.from_dt}</td>
                          <td>{r.to_dt}</td>
                          <td><strong>{r.da_pct}%</strong></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    if (!newDaFrom || !newDaTo || !newDaPct) return;
                    setDaRates([{ from_dt: newDaFrom, to_dt: newDaTo, da_pct: parseFloat(newDaPct) || 0 }, ...daRates]);
                    setNewDaFrom('');
                    setNewDaTo('');
                    setNewDaPct('50');
                    alert('Dearness Allowance rate successfully added!');
                  }}
                  style={{ background: 'rgba(255,255,255,0.01)', border: '1px solid var(--border-glass)', padding: '1rem', borderRadius: '0.5rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}
                >
                  <label style={{ fontSize: '0.75rem', fontWeight: 600 }}>Register New DA Rate</label>
                  <input type="date" value={newDaFrom} onChange={(e) => setNewDaFrom(e.target.value)} required style={{ fontSize: '0.8rem', padding: '0.4rem' }} />
                  <input type="date" value={newDaTo} onChange={(e) => setNewDaTo(e.target.value)} required style={{ fontSize: '0.8rem', padding: '0.4rem' }} />
                  <input type="number" placeholder="DA percentage e.g. 52" value={newDaPct} onChange={(e) => setNewDaPct(e.target.value)} required style={{ fontSize: '0.8rem', padding: '0.4rem' }} />
                  <button type="submit" className="save-btn" style={{ padding: '0.5rem', fontSize: '0.8rem' }}>Add DA Record</button>
                </form>
              </div>

              {/* Right: Arrears Calculator */}
              <div className="arrears-calculator-panel">
                <h3>💰 Notional vs Actual Arrears Calculator (GO 74 / 111)</h3>
                <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '1.5rem' }}>Compute drawn dearness allowance offsets due to deemed promotion or notional benefit dates.</p>
                
                {selectedEmp ? (
                  <div className="arrears-form" style={{ background: 'rgba(255,255,255,0.01)', border: '1px solid var(--border-glass)', padding: '1.5rem', borderRadius: '0.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    <div style={{ fontSize: '0.85rem', borderBottom: '1px solid var(--border-glass)', paddingBottom: '0.5rem' }}>
                      Selected: <strong>{selectedEmp.empnm}</strong> ({selectedEmp.empno})
                    </div>
                    
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                      <div className="form-group">
                        <label>Notional Basic Pay (₹)</label>
                        <input type="number" id="notional_pay" defaultValue={Math.round(selectedEmp.basic * 1.15)} />
                      </div>
                      <div className="form-group">
                        <label>Actual Basic Pay Drawn (₹)</label>
                        <input type="number" id="actual_pay" defaultValue={selectedEmp.basic} />
                      </div>
                      <div className="form-group">
                        <label>Claim From Date</label>
                        <input type="date" id="claim_from" defaultValue="2024-01-01" />
                      </div>
                      <div className="form-group">
                        <label>Claim To Date</label>
                        <input type="date" id="claim_to" defaultValue="2024-06-30" />
                      </div>
                    </div>

                    <button
                      className="simulate-increment-btn"
                      onClick={() => {
                        const notional = parseFloat((document.getElementById('notional_pay') as HTMLInputElement)?.value) || 0;
                        const actual = parseFloat((document.getElementById('actual_pay') as HTMLInputElement)?.value) || 0;
                        const fromDt = (document.getElementById('claim_from') as HTMLInputElement)?.value;
                        
                        // Simple DA lookup
                        const activeRate = daRates.find(r => fromDt >= r.from_dt && fromDt <= r.to_dt) || { da_pct: 50 };
                        
                        const basicDiff = notional - actual;
                        const daDiff = basicDiff * (activeRate.da_pct / 100);
                        const totalArrear = basicDiff + daDiff;

                        alert(`GO 74 / 111 Arrears Fixation:\n---------------------------------\n- Notional Pay: ₹${notional.toLocaleString()}\n- Actual Drawn Pay: ₹${actual.toLocaleString()}\n- Basic Difference: ₹${basicDiff.toLocaleString()}\n- DA Percentage Applied: ${activeRate.da_pct}%\n- DA Arrears: ₹${daDiff.toLocaleString()}\n- Total Payable Arrears: ₹${totalArrear.toLocaleString()}`);
                      }}
                      style={{ background: 'var(--yellow-accent)', color: 'var(--bg-dark)' }}
                    >
                      Calculate Payable Arrears
                    </button>
                  </div>
                ) : (
                  <div className="select-placeholder" style={{ border: '1px dashed var(--border-glass)', borderRadius: '0.5rem', padding: '2rem', textAlign: 'center' }}>
                    <p>Please select an employee in the <strong>Employee Master</strong> tab first to load their profile details here.</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB: ROSTER */}
          {activeTab === 'roster' && (
            <div className="roster-view animate-fade" style={{ width: '100%', height: '100%', overflowY: 'auto' }}>
              <RosterView />
            </div>
          )}

          {/* TAB: VACANCY */}
          {activeTab === 'vacancy' && (
            <div className="vacancy-view animate-fade" style={{ width: '100%', height: '100%', overflowY: 'auto', backgroundColor: '#ffffff', color: '#0f172a', borderRadius: '1rem', padding: '1.5rem' }}>
              <VacancyView />
            </div>
          )}

          {/* TAB: USERS */}
          {activeTab === 'users' && (
            <div className="users-view animate-fade" style={{ width: '100%', height: '100%', overflowY: 'auto' }}>
              <UserManagementView />
            </div>
          )}

        </div>
      </main>
    </div>
  );
}
