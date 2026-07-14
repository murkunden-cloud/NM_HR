import React, { useState, useEffect } from 'react';

interface TransferModuleProps {
  zones: string[];
  circles: string[];
  divisions: string[];
  designations: any[]; 
  hierarchyData: any;
}

interface QueuedEmployee {
  empno: string;
  empnm: string;
  currentDesig: string;
  currentLocation: string;
  toLocation: string;
  transferType: string;
  postingType: string;
}

export default function TransferModule({ zones, circles, divisions, designations, hierarchyData }: TransferModuleProps) {
  // Order Metadata
  const [scope, setScope] = useState<'Zone' | 'Circle' | 'Division'>('Zone');
  
  // Cascading state
  const [targetZone, setTargetZone] = useState('');
  const [targetCircle, setTargetCircle] = useState('');
  const [targetDivision, setTargetDivision] = useState('');
  
  const [targetDesig, setTargetDesig] = useState('');
  const [transferType, setTransferType] = useState<'Admin' | 'Request' | 'Promotion'>('Admin');
  const [postingType, setPostingType] = useState<'Allotment' | 'Detail Posting'>('Detail Posting');
  const [orderNo, setOrderNo] = useState('');
  const [dispatchNo, setDispatchNo] = useState('');
  const [orderDate, setOrderDate] = useState(() => new Date().toISOString().split('T')[0]);

  // Employee Entry
  const [cpfNo, setCpfNo] = useState('');
  const [isFetchingCpf, setIsFetchingCpf] = useState(false);
  const [fetchedEmp, setFetchedEmp] = useState<any>(null);
  const [toLocation, setToLocation] = useState('');
  const [cpfError, setCpfError] = useState('');

  // Batch Queue
  const [queue, setQueue] = useState<QueuedEmployee[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState('');

  // Reset cascading dropdowns when scope changes
  useEffect(() => {
    setTargetCircle('');
    setTargetDivision('');
    setToLocation('');
  }, [scope, targetZone]);

  // Derived options for cascading
  const zoneOptions = Object.keys(hierarchyData || {}).sort();
  const circleOptions = targetZone && hierarchyData[targetZone] ? Object.keys(hierarchyData[targetZone].circles || {}).sort() : [];
  const divisionOptions = (targetZone && targetCircle && hierarchyData[targetZone]?.circles[targetCircle]) 
    ? Object.keys(hierarchyData[targetZone].circles[targetCircle].divisions || {}).sort() 
    : [];

  // Determine Destination Location Dropdown options based on scope
  let locationOptions: string[] = [];
  if (scope === 'Zone') {
    locationOptions = circleOptions; // If transferring within zone, you select a circle
  } else if (scope === 'Circle') {
    locationOptions = divisionOptions; // If transferring within circle, you select a division
  } else if (scope === 'Division') {
    // If transferring within division, you select a subdivision or section
    if (targetZone && targetCircle && targetDivision && hierarchyData[targetZone]?.circles[targetCircle]?.divisions[targetDivision]) {
      locationOptions = Object.keys(hierarchyData[targetZone].circles[targetCircle].divisions[targetDivision].subdivisions || {}).sort();
    }
  }

  const handleCpfLookup = async () => {
    if (!cpfNo.trim()) return;
    setIsFetchingCpf(true);
    setCpfError('');
    setFetchedEmp(null);
    try {
      const res = await fetch(`/api/employees/cpf?empno=${encodeURIComponent(cpfNo.trim())}`);
      const data = await res.json();
      if (res.ok && data.success) {
        setFetchedEmp(data.employee);
      } else {
        setCpfError(data.error || 'Employee not found');
      }
    } catch (err) {
      setCpfError('Error fetching employee');
    } finally {
      setIsFetchingCpf(false);
    }
  };

  const handleAddEmployee = () => {
    if (!fetchedEmp) return;
    if (!toLocation) {
      alert('Please select a Destination Location');
      return;
    }

    if (queue.some(q => q.empno === fetchedEmp.empno)) {
      alert('Employee is already in the order batch.');
      return;
    }

    setQueue([
      ...queue,
      {
        empno: fetchedEmp.empno,
        empnm: fetchedEmp.empnm,
        currentDesig: fetchedEmp.desigz || 'Unknown',
        currentLocation: fetchedEmp.locnm || fetchedEmp.divnm || 'Unknown',
        toLocation,
        transferType,
        postingType
      }
    ]);

    // Reset entry fields
    setCpfNo('');
    setFetchedEmp(null);
    setToLocation('');
  };

  const handleRemoveEmployee = (empno: string) => {
    setQueue(queue.filter(q => q.empno !== empno));
  };

  const handleSaveBatch = async () => {
    if (queue.length === 0) return;
    if (!orderNo.trim()) {
      alert('Please enter an Order Number.');
      return;
    }

    setIsSaving(true);
    setSaveSuccess('');

    try {
      const batch = queue.map(q => ({
        empno: q.empno,
        transfer_date: orderDate,
        from_location: q.currentLocation,
        to_location: q.toLocation,
        from_desig: q.currentDesig,
        to_desig: targetDesig || q.currentDesig, // Use target desig if promotion
        transfer_type: q.transferType,
        order_no: orderNo.trim(),
        remarks: `Dispatch No: ${dispatchNo} | Posting: ${q.postingType}`
      }));

      const res = await fetch('/api/transactions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'transfer_batch', data: { batch } })
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setSaveSuccess(`Successfully saved ${data.count} records to Order #${orderNo}`);
        setQueue([]);
      } else {
        alert(data.error || 'Failed to save batch');
      }
    } catch (err) {
      alert('Server error occurred during save.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="p-6">
      <div className="mb-6 flex justify-between items-end">
        <div>
          <h2 className="text-3xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-indigo-600 dark:from-blue-400 dark:to-indigo-300 tracking-tight drop-shadow-sm">
            Transfer & Promotion Module
          </h2>
          <p className="text-gray-500 dark:text-gray-400 mt-2 font-medium">Create batch orders with intelligent location mapping</p>
        </div>
      </div>

      {saveSuccess && (
        <div className="mb-6 p-4 bg-emerald-50 dark:bg-emerald-900/30 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300 rounded-xl flex items-center shadow-sm animate-fade">
          <svg className="w-6 h-6 mr-3 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
          <span className="font-semibold">{saveSuccess}</span>
        </div>
      )}

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-8">
        
        {/* Left Column: Order Metadata & Employee Input */}
        <div className="xl:col-span-4 flex flex-col space-y-6">
          
          {/* Order Configuration Panel */}
          <div className="bg-white/80 dark:bg-slate-800/80 rounded-2xl shadow-xl border border-gray-100 dark:border-slate-700 p-6 backdrop-blur-xl transition-all duration-300 hover:shadow-2xl">
            <div className="flex items-center mb-5 border-b border-gray-100 dark:border-slate-700 pb-3">
              <span className="bg-blue-100 dark:bg-blue-900/50 text-blue-600 dark:text-blue-400 p-2 rounded-lg mr-3">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"></path></svg>
              </span>
              <h3 className="text-lg font-bold text-gray-800 dark:text-white">Order Context</h3>
            </div>
            
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1">Transfer Scope</label>
                  <select value={scope} onChange={(e) => setScope(e.target.value as any)} className="w-full bg-gray-50 dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded-lg px-3 py-2.5 text-sm font-medium focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-shadow">
                    <option value="Zone">Within Zone</option>
                    <option value="Circle">Within Circle</option>
                    <option value="Division">Within Division</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1">Transfer Type</label>
                  <select value={transferType} onChange={(e) => setTransferType(e.target.value as any)} className="w-full bg-gray-50 dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded-lg px-3 py-2.5 text-sm font-medium focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-shadow">
                    <option value="Admin">Admin Transfer</option>
                    <option value="Request">Request Transfer</option>
                    <option value="Promotion">Promotion</option>
                  </select>
                </div>
              </div>

              {/* Cascading Selection */}
              <div className="bg-gray-50 dark:bg-slate-800/50 p-4 rounded-xl border border-gray-200 dark:border-slate-700 space-y-3">
                <div>
                  <label className="block text-xs font-bold text-blue-600 dark:text-blue-400 uppercase tracking-wider mb-1">Target Zone</label>
                  <select value={targetZone} onChange={(e) => setTargetZone(e.target.value)} className="w-full bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-600 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none">
                    <option value="">-- Select Zone --</option>
                    {zoneOptions.map((z, idx) => <option key={idx} value={z}>{z}</option>)}
                  </select>
                </div>

                {(scope === 'Circle' || scope === 'Division') && (
                  <div className="animate-fade">
                    <label className="block text-xs font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-wider mb-1">Target Circle</label>
                    <select value={targetCircle} onChange={(e) => setTargetCircle(e.target.value)} className="w-full bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-600 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 outline-none">
                      <option value="">-- Select Circle --</option>
                      {circleOptions.map((c, idx) => <option key={idx} value={c}>{c}</option>)}
                    </select>
                  </div>
                )}

                {scope === 'Division' && (
                  <div className="animate-fade">
                    <label className="block text-xs font-bold text-purple-600 dark:text-purple-400 uppercase tracking-wider mb-1">Target Division</label>
                    <select value={targetDivision} onChange={(e) => setTargetDivision(e.target.value)} className="w-full bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-600 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-purple-500 outline-none">
                      <option value="">-- Select Division --</option>
                      {divisionOptions.map((d, idx) => <option key={idx} value={d}>{d}</option>)}
                    </select>
                  </div>
                )}
              </div>

              {transferType === 'Promotion' && (
                <div className="animate-fade">
                  <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1">Target Designation</label>
                  <select value={targetDesig} onChange={(e) => setTargetDesig(e.target.value)} className="w-full bg-gray-50 dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none">
                    <option value="">-- Select Designation --</option>
                    {designations.map((d, idx) => <option key={idx} value={d.desigz}>{d.desigz}</option>)}
                  </select>
                </div>
              )}

              <div className="grid grid-cols-2 gap-3 pt-2">
                <div>
                  <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1">Order No</label>
                  <input type="text" value={orderNo} onChange={e => setOrderNo(e.target.value)} placeholder="e.g. PZ-100" className="w-full bg-gray-50 dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500 font-medium" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1">Dispatch No</label>
                  <input type="text" value={dispatchNo} onChange={e => setDispatchNo(e.target.value)} placeholder="e.g. DP-55" className="w-full bg-gray-50 dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500 font-medium" />
                </div>
              </div>
            </div>
          </div>

          {/* Add Employee Panel */}
          <div className="bg-white/80 dark:bg-slate-800/80 rounded-2xl shadow-xl border border-gray-100 dark:border-slate-700 p-6 backdrop-blur-xl flex-1 transition-all duration-300 hover:shadow-2xl">
            <div className="flex items-center mb-5 border-b border-gray-100 dark:border-slate-700 pb-3">
              <span className="bg-indigo-100 dark:bg-indigo-900/50 text-indigo-600 dark:text-indigo-400 p-2 rounded-lg mr-3">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z"></path></svg>
              </span>
              <h3 className="text-lg font-bold text-gray-800 dark:text-white">Add Employee</h3>
            </div>
            
            <div className="space-y-5">
              <div>
                <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1">Lookup by CPF No</label>
                <div className="flex space-x-2">
                  <input 
                    type="text" 
                    value={cpfNo} 
                    onChange={e => setCpfNo(e.target.value)} 
                    onKeyDown={e => e.key === 'Enter' && handleCpfLookup()}
                    placeholder="Enter CPF Number" 
                    className="flex-1 bg-gray-50 dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded-lg px-4 py-2.5 font-medium outline-none focus:ring-2 focus:ring-indigo-500" 
                  />
                  <button onClick={handleCpfLookup} disabled={isFetchingCpf || !cpfNo} className="px-5 py-2.5 bg-indigo-600 text-white font-bold rounded-lg shadow-md hover:bg-indigo-700 transition disabled:opacity-50 flex items-center justify-center min-w-[80px]">
                    {isFetchingCpf ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div> : 'Find'}
                  </button>
                </div>
                {cpfError && <p className="text-red-500 text-xs mt-1.5 font-medium animate-fade">{cpfError}</p>}
              </div>

              {fetchedEmp && (
                <div className="bg-gradient-to-br from-indigo-50 to-blue-50 dark:from-slate-700 dark:to-slate-800 p-4 rounded-xl border border-indigo-100 dark:border-slate-600 shadow-sm animate-fade">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-sm text-gray-500 dark:text-gray-400 uppercase tracking-wider text-[10px] font-bold">Employee Found</p>
                      <h4 className="text-lg font-bold text-gray-900 dark:text-white mt-0.5">{fetchedEmp.empnm}</h4>
                    </div>
                    <span className="bg-white dark:bg-slate-900 text-indigo-700 dark:text-indigo-400 text-xs font-bold px-2 py-1 rounded shadow-sm border border-indigo-100 dark:border-slate-700">
                      CPF: {fetchedEmp.empno}
                    </span>
                  </div>
                  <div className="mt-3 grid grid-cols-2 gap-2 text-sm">
                    <div className="bg-white/60 dark:bg-slate-900/50 p-2 rounded-lg">
                      <p className="text-[10px] uppercase text-gray-500 font-bold mb-0.5">Designation</p>
                      <p className="font-medium text-gray-800 dark:text-gray-200">{fetchedEmp.desigz}</p>
                    </div>
                    <div className="bg-white/60 dark:bg-slate-900/50 p-2 rounded-lg">
                      <p className="text-[10px] uppercase text-gray-500 font-bold mb-0.5">Current Location</p>
                      <p className="font-medium text-gray-800 dark:text-gray-200">{fetchedEmp.locnm || fetchedEmp.divnm}</p>
                    </div>
                  </div>
                </div>
              )}

              <div className="grid grid-cols-2 gap-3 border-t border-gray-100 dark:border-slate-700 pt-4">
                <div>
                  <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1">Posting Type</label>
                  <select value={postingType} onChange={(e) => setPostingType(e.target.value as any)} className="w-full bg-gray-50 dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded-lg px-3 py-2.5 text-sm font-medium focus:ring-2 focus:ring-indigo-500 outline-none">
                    <option value="Allotment">Allotment</option>
                    <option value="Detail Posting">Detail Posting</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1">Destination ({scope})</label>
                  <select value={toLocation} onChange={(e) => setToLocation(e.target.value)} className="w-full bg-gray-50 dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded-lg px-3 py-2.5 text-sm font-medium focus:ring-2 focus:ring-indigo-500 outline-none">
                    <option value="">-- Select --</option>
                    {locationOptions.filter(Boolean).map((loc, idx) => (
                      <option key={idx} value={loc}>{loc}</option>
                    ))}
                  </select>
                </div>
              </div>

              <button 
                onClick={handleAddEmployee}
                disabled={!fetchedEmp || !toLocation}
                className="w-full mt-4 py-3.5 bg-gray-900 dark:bg-white text-white dark:text-gray-900 font-bold rounded-xl shadow-lg hover:shadow-xl hover:bg-gray-800 dark:hover:bg-gray-100 transform hover:-translate-y-0.5 transition-all disabled:opacity-50 disabled:transform-none flex items-center justify-center group"
              >
                <svg className="w-5 h-5 mr-2 text-gray-400 group-hover:text-white dark:text-gray-500 dark:group-hover:text-gray-900 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6"></path></svg>
                Enqueue to Order Batch
              </button>
            </div>
          </div>

        </div>

        {/* Right Column: Order Queue & Save */}
        <div className="xl:col-span-8 flex flex-col h-[780px]">
          <div className="bg-white/80 dark:bg-slate-800/80 rounded-2xl shadow-xl border border-gray-100 dark:border-slate-700 flex flex-col h-full overflow-hidden backdrop-blur-xl">
            
            <div className="p-6 border-b border-gray-100 dark:border-slate-700 flex justify-between items-center bg-gray-50/50 dark:bg-slate-800/50">
              <div>
                <h3 className="text-xl font-bold text-gray-800 dark:text-white flex items-center">
                  <span className="bg-white dark:bg-slate-900 shadow-sm border border-gray-100 dark:border-slate-700 px-3 py-1 rounded-lg mr-3 text-blue-600 dark:text-blue-400">
                    {queue.length}
                  </span>
                  Batch Order Queue
                </h3>
              </div>
              <button 
                onClick={handleSaveBatch}
                disabled={queue.length === 0 || isSaving}
                className="px-6 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-bold rounded-xl shadow-lg shadow-blue-500/30 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center transform hover:-translate-y-0.5"
              >
                {isSaving ? (
                  <div className="flex items-center">
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                    Saving...
                  </div>
                ) : (
                  <>
                    <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4"></path></svg>
                    Confirm & Save Order
                  </>
                )}
              </button>
            </div>
            
            <div className="flex-1 overflow-auto p-4 bg-gray-50/30 dark:bg-slate-900/30">
              {queue.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-gray-400">
                  <div className="bg-white dark:bg-slate-800 p-6 rounded-full shadow-sm mb-4">
                    <svg className="w-12 h-12 text-gray-300 dark:text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"></path></svg>
                  </div>
                  <h4 className="text-lg font-bold text-gray-500 dark:text-gray-400 mb-1">Queue is Empty</h4>
                  <p className="text-sm">Lookup employees and add them to the batch to see them here.</p>
                </div>
              ) : (
                <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-gray-100 dark:border-slate-700 overflow-hidden">
                  <table className="w-full text-left whitespace-nowrap">
                    <thead className="bg-gray-50 dark:bg-slate-900 border-b border-gray-200 dark:border-slate-700 text-gray-600 dark:text-gray-300 sticky top-0 text-xs uppercase tracking-wider font-bold">
                      <tr>
                        <th className="py-4 px-5">Employee Info</th>
                        <th className="py-4 px-5">Order Type</th>
                        <th className="py-4 px-5">Movement</th>
                        <th className="py-4 px-5 text-right">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 dark:divide-slate-700">
                      {queue.map((q, i) => (
                        <tr key={i} className="hover:bg-blue-50/50 dark:hover:bg-slate-700/50 transition-colors animate-fade">
                          <td className="py-4 px-5">
                            <div className="flex items-center">
                              <div className="w-9 h-9 rounded-full bg-indigo-100 dark:bg-indigo-900/50 text-indigo-600 dark:text-indigo-400 flex items-center justify-center font-bold text-sm mr-3">
                                {q.empnm.charAt(0)}
                              </div>
                              <div>
                                <div className="font-bold text-gray-900 dark:text-white text-sm">{q.empnm}</div>
                                <div className="text-xs text-gray-500 font-medium">{q.empno} • {q.currentDesig}</div>
                              </div>
                            </div>
                          </td>
                          <td className="py-4 px-5">
                            <span className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-bold bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 border border-blue-100 dark:border-blue-800">
                              {q.transferType}
                            </span>
                            <div className="text-xs text-gray-500 mt-1 font-medium">{q.postingType}</div>
                          </td>
                          <td className="py-4 px-5">
                            <div className="flex items-center text-sm font-medium">
                              <span className="text-gray-500 truncate max-w-[120px]" title={q.currentLocation}>{q.currentLocation}</span>
                              <svg className="w-4 h-4 mx-2 text-gray-300 dark:text-gray-600 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M14 5l7 7m0 0l-7 7m7-7H3"></path></svg>
                              <span className="text-gray-900 dark:text-white font-bold truncate max-w-[120px]" title={q.toLocation}>{q.toLocation}</span>
                            </div>
                          </td>
                          <td className="py-4 px-5 text-right">
                            <button onClick={() => handleRemoveEmployee(q.empno)} className="text-red-500 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20 p-2 rounded-lg transition-colors border border-transparent hover:border-red-100 dark:hover:border-red-800" title="Remove from batch">
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
            
            {queue.length > 0 && (
              <div className="p-4 bg-gray-50 dark:bg-slate-900 border-t border-gray-100 dark:border-slate-700 flex justify-between items-center text-xs font-medium text-gray-500 dark:text-gray-400">
                <span>Data will be saved to the central HR ledger.</span>
                <span className="flex items-center">
                  <svg className="w-4 h-4 mr-1 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                  PDF generation available post-save.
                </span>
              </div>
            )}
            
          </div>
        </div>
      </div>
    </div>
  );
}
