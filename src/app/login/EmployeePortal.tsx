import React, { useState, useEffect } from 'react';
import BiodataReport from '@/components/BiodataReport';

export default function EmployeePortal() {
  const [searchQuery, setSearchQuery] = useState('');
  const [employees, setEmployees] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [hierarchyData, setHierarchyData] = useState<any>({});
  
  const [selectedEmp, setSelectedEmp] = useState<any>(null);
  const [promotions, setPromotions] = useState<any[]>([]);
  const [transfers, setTransfers] = useState<any[]>([]);
  const [viewBiodata, setViewBiodata] = useState(false);

  useEffect(() => {
    // Fetch hierarchy
    const fetchHierarchy = async () => {
      try {
        const res = await fetch('/api/hierarchy');
        if (res.ok) {
          const data = await res.json();
          setHierarchyData(data.hierarchy || {});
        }
      } catch (err) {
        console.error('Failed to fetch hierarchy', err);
      }
    };
    fetchHierarchy();
  }, []);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/employees?query=${encodeURIComponent(searchQuery)}&limit=50`);
      if (res.ok) {
        const data = await res.json();
        setEmployees(data.employees || []);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleViewBiodata = async (emp: any) => {
    setSelectedEmp(emp);
    setViewBiodata(true);
    // Fetch transactions for promotions and transfers
    try {
      const res = await fetch(`/api/transactions?empno=${emp.empno}`);
      if (res.ok) {
        const data = await res.json();
        setPromotions(data.promotions || []);
        setTransfers(data.transfers || []);
      }
    } catch (err) {
      console.error('Failed to fetch transactions', err);
    }
  };

  // Render a simple recursive tree for hierarchy
  const renderHierarchy = (data: any, level: number = 0) => {
    if (!data) return null;
    return (
      <ul style={{ paddingLeft: level === 0 ? '0' : '20px', listStyleType: 'none' }}>
        {Object.values(data).map((node: any, idx) => (
          <li key={idx} style={{ marginBottom: '8px' }}>
            <div style={{ fontWeight: level === 0 ? 'bold' : 'normal', color: 'white' }}>
              {node.name}
            </div>
            {node.circles && renderHierarchy(node.circles, level + 1)}
            {node.divisions && renderHierarchy(node.divisions, level + 1)}
            {node.subdivisions && renderHierarchy(node.subdivisions, level + 1)}
            {node.sections && renderHierarchy(node.sections, level + 1)}
            {node.substations && node.substations.length > 0 && (
              <ul style={{ paddingLeft: '20px', listStyleType: 'disc', color: 'rgba(255,255,255,0.7)' }}>
                {node.substations.map((sub: string, sIdx: number) => (
                  <li key={sIdx}>{sub}</li>
                ))}
              </ul>
            )}
          </li>
        ))}
      </ul>
    );
  };

  if (viewBiodata && selectedEmp) {
    return (
      <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, zIndex: 9999, overflow: 'auto', background: 'white' }}>
        <BiodataReport
          selectedEmp={selectedEmp}
          promotions={promotions}
          transfers={transfers}
          onClose={() => setViewBiodata(false)}
        />
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', width: '100%', height: '100%', gap: '20px', padding: '20px' }}>
      {/* Left side: Hierarchy */}
      <div style={{ flex: '1', background: 'rgba(255, 255, 255, 0.1)', backdropFilter: 'blur(10px)', borderRadius: '12px', padding: '20px', overflowY: 'auto' }}>
        <h2 style={{ color: 'white', marginBottom: '20px', borderBottom: '1px solid rgba(255,255,255,0.2)', paddingBottom: '10px' }}>
          Organization Hierarchy
        </h2>
        {renderHierarchy(hierarchyData)}
      </div>

      {/* Right side: Search */}
      <div style={{ flex: '1.5', background: 'white', borderRadius: '12px', padding: '30px', display: 'flex', flexDirection: 'column' }}>
        <h2 style={{ color: '#333', marginBottom: '10px' }}>Employee Biodata Search</h2>
        <p style={{ color: '#666', marginBottom: '20px' }}>Search across all zones by Employee No (CPF No) or Name</p>
        
        <form onSubmit={handleSearch} style={{ display: 'flex', gap: '10px', marginBottom: '30px' }}>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Enter CPF No or Name..."
            style={{ flex: 1, padding: '12px', borderRadius: '6px', border: '1px solid #ccc', fontSize: '16px' }}
          />
          <button type="submit" disabled={loading} style={{ padding: '12px 24px', background: 'var(--brand-color, #2563eb)', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '16px' }}>
            {loading ? 'Searching...' : 'Search'}
          </button>
        </form>

        <div style={{ flex: 1, overflowY: 'auto' }}>
          {employees.length > 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
              {employees.map(emp => (
                <div key={emp.empno} style={{ border: '1px solid #eee', padding: '15px', borderRadius: '8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <h3 style={{ margin: '0 0 5px 0', color: '#111' }}>{emp.empnm}</h3>
                    <div style={{ color: '#555', fontSize: '14px' }}>
                      <strong>CPF No:</strong> {emp.empno} &bull; <strong>Designation:</strong> {emp.desigz}
                    </div>
                    <div style={{ color: '#777', fontSize: '13px', marginTop: '5px' }}>
                      {emp.locnm} | {emp.divnm} | {emp.circl}
                    </div>
                  </div>
                  <button 
                    onClick={() => handleViewBiodata(emp)}
                    style={{ padding: '8px 16px', background: '#10b981', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}
                  >
                    View Biodata
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <div style={{ textAlign: 'center', color: '#999', marginTop: '50px' }}>
              No employees found. Enter a search query to find employees.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
