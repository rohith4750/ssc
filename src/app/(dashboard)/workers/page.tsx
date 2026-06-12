'use client';

import React, { useState, useEffect } from 'react';
import {
  getWorkers,
  addWorker,
  getAttendance,
  saveAttendanceRecords,
  getWorkerPayroll,
  payWorkerSalary
} from '@/actions/db';
import {
  Users,
  ChefHat,
  Calendar,
  Check,
  X,
  Plus,
  DollarSign,
  Briefcase,
  FileText,
  UserPlus,
  Clock,
  ChevronRight
} from 'lucide-react';

export default function WorkersPage() {
  const [workers, setWorkers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Attendance states
  const [attendanceDate, setAttendanceDate] = useState(new Date().toISOString().split('T')[0]);
  const [attendanceRecords, setAttendanceRecords] = useState<Record<string, {
    status: string;
    overtimeHours: number;
    notes: string;
  }>>({});

  // Payroll summary states
  const [selectedWorker, setSelectedWorker] = useState<any | null>(null);
  const [payrollData, setPayrollData] = useState<any | null>(null);
  const [payrollMonth, setPayrollMonth] = useState(new Date().getMonth() + 1);
  const [payrollYear, setPayrollYear] = useState(new Date().getFullYear());
  const [payAmount, setPayAmount] = useState('');
  const [payMethod, setPayMethod] = useState('CASH');
  const [payNotes, setPayNotes] = useState('');

  // UI Modals
  const [showAddWorker, setShowAddWorker] = useState(false);

  // New Worker Form States
  const [newName, setNewName] = useState('');
  const [newRole, setNewRole] = useState('COOK');
  const [newSalaryType, setNewSalaryType] = useState('DAILY_WAGE');
  const [newRate, setNewRate] = useState('');
  const [newPhone, setNewPhone] = useState('');

  // Load Workers and attendance registry
  useEffect(() => {
    async function load() {
      try {
        const list = await getWorkers();
        setWorkers(list);
        await handleLoadAttendance(attendanceDate, list);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const handleLoadAttendance = async (dateStr: string, activeWorkers: any[]) => {
    try {
      const records = await getAttendance(dateStr);
      const recordMap: Record<string, any> = {};
      
      // Map existing records
      records.forEach((r) => {
        recordMap[r.workerId] = {
          status: r.status,
          overtimeHours: r.overtimeHours,
          notes: r.notes || '',
        };
      });

      // Populate workers with no records with defaults
      activeWorkers.forEach((w) => {
        if (!recordMap[w.id]) {
          recordMap[w.id] = {
            status: 'PRESENT',
            overtimeHours: 0,
            notes: '',
          };
        }
      });

      setAttendanceRecords(recordMap);
    } catch (err) {
      console.error(err);
    }
  };

  const handleDateChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const d = e.target.value;
    setAttendanceDate(d);
    await handleLoadAttendance(d, workers);
  };

  const updateAttendanceStatus = (workerId: string, status: string) => {
    setAttendanceRecords((prev) => ({
      ...prev,
      [workerId]: {
        ...prev[workerId],
        status,
        // Reset overtime hours if absent
        overtimeHours: status === 'ABSENT' ? 0 : prev[workerId]?.overtimeHours || 0,
      },
    }));
  };

  const updateAttendanceOvertime = (workerId: string, overtimeHours: number) => {
    setAttendanceRecords((prev) => ({
      ...prev,
      [workerId]: {
        ...prev[workerId],
        overtimeHours: isNaN(overtimeHours) || overtimeHours < 0 ? 0 : overtimeHours,
      },
    }));
  };

  const updateAttendanceNotes = (workerId: string, notes: string) => {
    setAttendanceRecords((prev) => ({
      ...prev,
      [workerId]: {
        ...prev[workerId],
        notes,
      },
    }));
  };

  // Submit attendance register
  const handleSaveAttendance = async () => {
    try {
      const formattedRecords = Object.keys(attendanceRecords).map((workerId) => ({
        workerId,
        status: attendanceRecords[workerId].status,
        overtimeHours: attendanceRecords[workerId].overtimeHours,
        notes: attendanceRecords[workerId].notes,
      }));

      await saveAttendanceRecords(attendanceDate, formattedRecords);
      alert('Attendance register updated successfully');
      
      // If a payroll is loaded, update details
      if (selectedWorker) {
        handleLoadPayroll(selectedWorker);
      }
    } catch (err) {
      console.error(err);
      alert('Failed to save attendance register');
    }
  };

  // Create Worker
  const handleAddWorkerSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName || !newRate) return;

    try {
      await addWorker({
        name: newName.trim(),
        role: newRole,
        salaryType: newSalaryType,
        rate: parseFloat(newRate),
        phone: newPhone.trim(),
      });

      // Clear forms
      setNewName('');
      setNewRate('');
      setNewPhone('');
      setShowAddWorker(false);

      // Reload
      const list = await getWorkers();
      setWorkers(list);
      await handleLoadAttendance(attendanceDate, list);
      alert('Staff profile added successfully');
    } catch (err) {
      console.error(err);
      alert('Failed to add worker');
    }
  };

  // Load Worker payroll summary
  const handleLoadPayroll = async (worker: any) => {
    setSelectedWorker(worker);
    try {
      const data = await getWorkerPayroll(worker.id, payrollMonth, payrollYear);
      setPayrollData(data);
    } catch (e) {
      console.error(e);
    }
  };

  // Pay Salary / Advance
  const handlePaySalarySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedWorker || !payAmount) return;

    try {
      await payWorkerSalary(
        selectedWorker.id,
        parseFloat(payAmount),
        payMethod,
        payNotes
      );
      setPayAmount('');
      setPayNotes('');
      // Reload ledger statement
      handleLoadPayroll(selectedWorker);
      alert('Payment registered and logged as salary expense');
    } catch (err) {
      console.error(err);
      alert('Failed to log payment');
    }
  };

  return (
    <div className="space-y-8 font-sans">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 no-print">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-white flex items-center gap-2">
            <Users className="w-8 h-8 text-emerald-400" /> Worker Wages & Attendance
          </h1>
          <p className="text-slate-400 text-sm mt-1">
            Register daily attendance sheets, log overtime hours, auto-calculate wages (Daily/Monthly templates), and register cash advances.
          </p>
        </div>
        <button
          onClick={() => setShowAddWorker(true)}
          className="flex items-center gap-2 py-2.5 px-4 bg-emerald-500 hover:bg-emerald-600 active:scale-[0.98] text-white font-semibold text-sm rounded-xl shadow-lg shadow-emerald-500/10 border-none transition duration-150 cursor-pointer"
        >
          <UserPlus className="w-4 h-4 shrink-0" />
          <span>Add Staff Profile</span>
        </button>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-8 items-start no-print">
        
        {/* Left Column (7 cols): Attendance Registry */}
        <div className="xl:col-span-7 space-y-6">
          <div className="p-6 rounded-2xl glass-panel relative">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Calendar className="w-5 h-5 text-emerald-400" /> Attendance Ledger Sheets
              </h3>
              <div className="flex items-center gap-2">
                <span className="text-xs text-slate-400 font-semibold">Select Date:</span>
                <input
                  type="date"
                  className="px-3 py-1.5 glass-input text-xs text-white"
                  value={attendanceDate}
                  onChange={handleDateChange}
                />
              </div>
            </div>

            {loading ? (
              <div className="p-12 text-center text-slate-500">Loading roster files...</div>
            ) : workers.length > 0 ? (
              <div className="space-y-4">
                {workers.map((w) => {
                  const record = attendanceRecords[w.id] || { status: 'PRESENT', overtimeHours: 0, notes: '' };
                  return (
                    <div
                      key={w.id}
                      className="p-4 rounded-xl bg-white/5 border border-white/5 space-y-4 text-xs font-sans"
                    >
                      {/* Name / Role */}
                      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
                        <div>
                          <span className="font-bold text-white text-sm block">{w.name}</span>
                          <span className="text-[10px] text-slate-400 uppercase tracking-wider block mt-0.5">
                            {w.role} &bull; {w.salaryType === 'DAILY_WAGE' ? `Daily Rate: ₹${w.rate}` : `Monthly Rate: ₹${w.rate}`}
                          </span>
                        </div>

                        {/* Status Select Buttons */}
                        <div className="flex bg-[#090d16] p-1 rounded-lg border border-white/5">
                          {[
                            { code: 'PRESENT', label: 'Present' },
                            { code: 'HALF_DAY', label: 'Half Day' },
                            { code: 'ABSENT', label: 'Absent' },
                          ].map((tab) => (
                            <button
                              key={tab.code}
                              type="button"
                              onClick={() => updateAttendanceStatus(w.id, tab.code)}
                              className={`py-1 px-2.5 rounded-md text-[10px] font-bold uppercase transition cursor-pointer border-none ${
                                record.status === tab.code
                                  ? 'bg-emerald-500 text-white'
                                  : 'bg-transparent text-slate-400 hover:text-white'
                              }`}
                            >
                              {tab.label}
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Inputs - Overtime Hours & Notes */}
                      {record.status !== 'ABSENT' && (
                        <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 border-t border-white/5 pt-3">
                          {/* Overtime */}
                          <div className="sm:col-span-4 flex items-center gap-2">
                            <span className="text-slate-400 text-[10px] uppercase font-semibold shrink-0">Overtime Hrs:</span>
                            <input
                              type="number"
                              step="0.5"
                              min="0"
                              className="w-full px-2 py-1 glass-input text-white text-xs"
                              value={record.overtimeHours || ''}
                              onChange={(e) => updateAttendanceOvertime(w.id, parseFloat(e.target.value) || 0)}
                              placeholder="0"
                            />
                          </div>

                          {/* Notes */}
                          <div className="sm:col-span-8 flex items-center gap-2">
                            <span className="text-slate-400 text-[10px] uppercase font-semibold shrink-0">Memo:</span>
                            <input
                              type="text"
                              className="w-full px-2 py-1 glass-input text-white text-xs"
                              value={record.notes}
                              onChange={(e) => updateAttendanceNotes(w.id, e.target.value)}
                              placeholder="Late check-in, extra servers etc..."
                            />
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}

                <button
                  onClick={handleSaveAttendance}
                  className="w-full py-3.5 px-4 bg-emerald-500 hover:bg-emerald-600 text-white font-bold text-xs rounded-xl transition border-none cursor-pointer"
                >
                  Save Attendance register for {new Date(attendanceDate).toLocaleDateString('en-IN')}
                </button>
              </div>
            ) : (
              <div className="p-12 text-center text-slate-500 border border-dashed border-white/10 rounded-xl">
                No active workers registered in system registry. Add worker profiles first.
              </div>
            )}
          </div>
        </div>

        {/* Right Column (5 cols): Worker payroll accounts */}
        <div className="xl:col-span-5 space-y-6">
          <div className="p-6 rounded-2xl glass-panel relative">
            <h3 className="text-base font-bold text-white mb-4 flex items-center gap-2">
              <Briefcase className="w-5 h-5 text-emerald-400" /> Staff List & Payroll ledgers
            </h3>

            <div className="space-y-2 divide-y divide-white/5 max-h-80 overflow-y-auto scrollbar-thin">
              {workers.map((w) => (
                <div
                  key={w.id}
                  className="flex justify-between items-center py-3 px-2 text-xs hover:bg-white/5 transition rounded-lg"
                >
                  <div>
                    <span className="font-bold text-white text-sm block">{w.name}</span>
                    <span className="text-[10px] text-slate-400 block mt-0.5">
                      Role: {w.role} &bull; {w.salaryType === 'DAILY_WAGE' ? `Daily rate: ₹${w.rate}` : `Monthly: ₹${w.rate}`}
                    </span>
                  </div>

                  <button
                    onClick={() => handleLoadPayroll(w)}
                    title="View Wages Statement"
                    className="p-2 bg-amber-500/10 border border-amber-500/20 text-amber-400 hover:bg-amber-500/20 rounded-lg cursor-pointer transition flex items-center gap-1 font-semibold text-[10px]"
                  >
                    Payroll <ChevronRight className="w-3 h-3" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>

      </div>

      {/* Selected worker payroll log detail overlay */}
      {selectedWorker && payrollData && (
        <div className="p-6 rounded-2xl glass-panel relative overflow-hidden font-sans space-y-6 no-print">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-white/5 pb-4">
            <div>
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <FileText className="w-5 h-5 text-amber-400" /> Wages & Salary sheet for {payrollData.worker.name}
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Staff Role: {payrollData.worker.role} &bull; Phone: {payrollData.worker.phone || 'N/A'}
              </p>
            </div>
            <div className="flex items-center gap-2.5">
              <select
                className="px-2.5 py-1.5 bg-[#0d1423] text-white border border-white/10 rounded-lg text-xs"
                value={payrollMonth}
                onChange={(e) => {
                  setPayrollMonth(parseInt(e.target.value));
                  setTimeout(() => handleLoadPayroll(selectedWorker), 100);
                }}
              >
                {Array.from({ length: 12 }, (_, i) => (
                  <option key={i + 1} value={i + 1}>
                    {new Date(2000, i).toLocaleString('default', { month: 'long' })}
                  </option>
                ))}
              </select>
              <select
                className="px-2.5 py-1.5 bg-[#0d1423] text-white border border-white/10 rounded-lg text-xs"
                value={payrollYear}
                onChange={(e) => {
                  setPayrollYear(parseInt(e.target.value));
                  setTimeout(() => handleLoadPayroll(selectedWorker), 100);
                }}
              >
                {[2025, 2026, 2027].map(y => (
                  <option key={y} value={y}>{y}</option>
                ))}
              </select>
              <button
                onClick={() => setSelectedWorker(null)}
                className="p-1.5 text-slate-400 hover:text-white border-none bg-transparent cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
            
            {/* Aggregate tally summary */}
            <div className="lg:col-span-2 space-y-4">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="p-4 rounded-xl bg-white/5 border border-white/5">
                  <span className="text-[10px] uppercase text-slate-400 font-semibold block mb-1">Days Present</span>
                  <span className="text-xl font-bold text-white">{payrollData.daysPresent} Present</span>
                  {payrollData.daysHalf > 0 && <span className="text-[10px] text-slate-400 block mt-0.5">({payrollData.daysHalf} half days)</span>}
                </div>
                <div className="p-4 rounded-xl bg-white/5 border border-white/5">
                  <span className="text-[10px] uppercase text-slate-400 font-semibold block mb-1">Total Overtime</span>
                  <span className="text-xl font-bold text-white flex items-center gap-1">
                    <Clock className="w-5 h-5 text-emerald-400 shrink-0" /> {payrollData.totalOvertime} Hrs
                  </span>
                </div>
                <div className="p-4 rounded-xl bg-white/5 border border-white/5">
                  <span className="text-[10px] uppercase text-slate-400 font-semibold block mb-1">Total Wages Accrued</span>
                  <span className="text-xl font-bold text-white">₹{payrollData.totalWages.toFixed(2)}</span>
                </div>
                <div className="p-4 rounded-xl bg-white/5 border border-white/5">
                  <span className="text-[10px] uppercase text-slate-400 font-semibold block mb-1">Advance Payments</span>
                  <span className="text-xl font-bold text-emerald-400">₹{payrollData.totalPaid}</span>
                </div>
              </div>

              {/* Attendance list log */}
              <div className="p-4 rounded-xl bg-white/5 border border-white/5">
                <h4 className="text-sm font-semibold text-white mb-3">Attendance logs in selected month</h4>
                <div className="overflow-x-auto">
                  <table className="w-full text-xs text-left border-collapse">
                    <thead>
                      <tr className="border-b border-white/5 text-slate-400">
                        <th className="py-2">Date</th>
                        <th className="py-2">Status</th>
                        <th className="py-2">Overtime</th>
                        <th className="py-2">Wages Calculated</th>
                        <th className="py-2">Notes</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5 text-slate-200">
                      {payrollData.attendance.length > 0 ? (
                        payrollData.attendance.map((att: any) => (
                          <tr key={att.id}>
                            <td className="py-2">{new Date(att.date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}</td>
                            <td className="py-2">
                              <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                att.status === 'PRESENT' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' :
                                att.status === 'HALF_DAY' ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20' :
                                'bg-red-500/10 text-red-400 border border-red-500/20'
                              }`}>
                                {att.status}
                              </span>
                            </td>
                            <td className="py-2">{att.overtimeHours > 0 ? `${att.overtimeHours} Hrs` : '-'}</td>
                            <td className="py-2 font-semibold text-white">₹{att.calculatedWage.toFixed(2)}</td>
                            <td className="py-2 text-slate-400 italic max-w-[150px] truncate">{att.notes || '-'}</td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan={5} className="py-8 text-center text-slate-500">No attendance registered in this month for this worker</td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            {/* Quick Record Salary Advance Form */}
            <div className="lg:col-span-1 p-6 rounded-xl bg-white/5 border border-white/5 text-xs font-sans space-y-4">
              <h4 className="text-sm font-semibold text-white flex items-center gap-2">
                <DollarSign className="w-4 h-4 text-emerald-400" /> Pay Salary / Advance
              </h4>
              <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-emerald-300 font-semibold text-[11px]">
                Outstanding Balance Due: ₹{payrollData.balance.toFixed(2)}
              </div>
              <form onSubmit={handlePaySalarySubmit} className="space-y-4">
                <div>
                  <label className="block text-slate-300 font-medium mb-1" htmlFor="salAmt">
                    Payment Amount (₹)
                  </label>
                  <input
                    id="salAmt"
                    type="number"
                    step="any"
                    className="w-full px-3 py-2 glass-input text-white text-sm"
                    value={payAmount}
                    onChange={(e) => setPayAmount(e.target.value)}
                    placeholder="Enter amount, e.g. 5000"
                    required
                  />
                </div>

                <div>
                  <label className="block text-slate-300 font-medium mb-1" htmlFor="salMth">
                    Payment Method
                  </label>
                  <select
                    id="salMth"
                    className="w-full px-3 py-2 bg-[#0d1423] text-white border border-white/10 rounded-lg text-xs"
                    value={payMethod}
                    onChange={(e) => setPayMethod(e.target.value)}
                  >
                    <option value="CASH">Cash</option>
                    <option value="UPI">UPI / Digital</option>
                    <option value="CARD">Card</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-300 font-medium mb-1" htmlFor="salNts">
                    Payment Memo / Reference
                  </label>
                  <textarea
                    id="salNts"
                    rows={2}
                    className="w-full px-3 py-2 glass-input text-white text-xs"
                    value={payNotes}
                    onChange={(e) => setPayNotes(e.target.value)}
                    placeholder="E.g., June salary advance, bank transaction ID"
                  />
                </div>

                <button
                  type="submit"
                  className="w-full py-2.5 px-4 bg-emerald-500 hover:bg-emerald-600 text-white font-bold rounded-lg transition border-none cursor-pointer"
                >
                  Record Payment
                </button>
              </form>
            </div>

          </div>
        </div>
      )}

      {/* Add Worker Profile Overlay Modal */}
      {showAddWorker && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="w-full max-w-md p-6 rounded-2xl glass-panel glow-green space-y-4">
            <div className="flex justify-between items-center border-b border-white/5 pb-3">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <ChefHat className="w-5 h-5 text-emerald-400" /> Add New Staff Profile
              </h3>
              <button
                onClick={() => setShowAddWorker(false)}
                className="p-1 text-slate-400 hover:text-white rounded-lg border-none bg-transparent cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAddWorkerSubmit} className="space-y-4 text-xs font-sans">
              <div>
                <label className="block text-slate-300 font-medium mb-1">Staff Name</label>
                <input
                  type="text"
                  className="w-full px-3 py-2.5 glass-input text-white text-sm"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="E.g. Ramesh"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-slate-300 font-medium mb-1">Staff Role</label>
                  <select
                    className="w-full px-3 py-2.5 bg-[#0d1423] text-white border border-white/10 rounded-lg text-sm"
                    value={newRole}
                    onChange={(e) => setNewRole(e.target.value)}
                  >
                    <option value="COOK">Cook</option>
                    <option value="HELPER">Helper</option>
                    <option value="SERVER">Server</option>
                    <option value="CLEANER">Cleaner</option>
                    <option value="DRIVER">Driver</option>
                  </select>
                </div>
                <div>
                  <label className="block text-slate-300 font-medium mb-1">Wage Payment Type</label>
                  <select
                    className="w-full px-3 py-2.5 bg-[#0d1423] text-white border border-white/10 rounded-lg text-sm"
                    value={newSalaryType}
                    onChange={(e) => setNewSalaryType(e.target.value)}
                  >
                    <option value="DAILY_WAGE">Daily Wage</option>
                    <option value="MONTHLY">Monthly Salaried</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-slate-300 font-medium mb-1">
                    {newSalaryType === 'DAILY_WAGE' ? 'Daily Wage Rate (₹)' : 'Monthly Salary Rate (₹)'}
                  </label>
                  <input
                    type="number"
                    step="any"
                    className="w-full px-3 py-2.5 glass-input text-white text-sm"
                    value={newRate}
                    onChange={(e) => setNewRate(e.target.value)}
                    placeholder={newSalaryType === 'DAILY_WAGE' ? 'e.g. 800' : 'e.g. 15000'}
                    required
                  />
                </div>
                <div>
                  <label className="block text-slate-300 font-medium mb-1">Phone Number (Optional)</label>
                  <input
                    type="text"
                    className="w-full px-3 py-2.5 glass-input text-white text-sm"
                    value={newPhone}
                    onChange={(e) => setNewPhone(e.target.value)}
                    placeholder="9000112233"
                  />
                </div>
              </div>

              <button
                type="submit"
                className="w-full py-3 px-4 bg-emerald-500 hover:bg-emerald-600 text-white font-bold rounded-xl transition duration-150 border-none cursor-pointer text-sm"
              >
                Register Staff Profile
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
