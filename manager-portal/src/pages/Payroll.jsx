import { useEffect, useState, useMemo } from 'react';
import { api } from '../api/client.js';
import PageHeader from '../components/PageHeader.jsx';
import Badge from '../components/Badge.jsx';
import Modal from '../components/Modal.jsx';
import EmptyState from '../components/EmptyState.jsx';
import PayrollDashboard from '../components/PayrollDashboard.jsx';
import PayrollFeaturePanel, { loadFeatures, saveFeatures } from '../components/PayrollFeaturePanel.jsx';
import { DollarSign, Plus, Edit2, Calculator, Trash2, Upload, FileSpreadsheet, CheckCircle2, XCircle, Search, Users, FileDown, ChevronUp, ChevronDown, ChevronsUpDown, X, Settings2, AlertTriangle, Calendar, RefreshCw, MessageSquare, FileText, Download, UserX, Link2 } from 'lucide-react';
import { format, parseISO, addDays, addWeeks } from 'date-fns';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

const PAID_VIA_OPTIONS = [
  { value: '', label: '— Select method —' },
  { value: 'direct_deposit', label: 'Direct Deposit' },
  { value: 'cheque',         label: 'Cheque' },
  { value: 'cash',           label: 'Cash' },
  { value: 'interac',        label: 'Interac e-Transfer' },
];

const EMPTY = {
  user_id: '', period_start: '', period_end: '', pay_date: '',
  hours_regular: '', hours_overtime: '0', pay_rate: '',
  status: 'submitted', notes: '', deductions: [], paid_via: '',
};

export default function Payroll() {
  const [entries, setEntries] = useState([]);
  const [guards, setGuards] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(null);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(EMPTY);
  const [calcModal, setCalcModal] = useState(false);
  const [calcForm, setCalcForm] = useState({ period_start: '', period_end: '', pay_date: '', hourly_rate: '' });
  const [calcMode, setCalcMode] = useState('all'); // 'all' | 'single'
  const [calcGuardSearch, setCalcGuardSearch] = useState('');
  const [calcGuardId, setCalcGuardId] = useState('');
  const [calcProgress, setCalcProgress] = useState(null); // null | { done, total, errors }
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [filterGuardIds, setFilterGuardIds] = useState([]);
  const [guardSearchOpen, setGuardSearchOpen] = useState(false);
  const [guardSearchText, setGuardSearchText] = useState('');
  const [sortKey, setSortKey] = useState('period_start');
  const [sortDir, setSortDir] = useState('desc');
  const [searchText, setSearchText] = useState('');

  // ── Feature flags ──
  const [features, setFeatures] = useState(() => loadFeatures());
  const [featurePanelOpen, setFeaturePanelOpen] = useState(false);
  function toggleFeature(id) {
    setFeatures(prev => { const next = { ...prev, [id]: !prev[id] }; saveFeatures(next); return next; });
  }

  // ── Column visibility (main table) ──
  const TABLE_COLS = [
    { key: 'guard',      label: 'Guard' },
    { key: 'period',     label: 'Period' },
    { key: 'hours',      label: 'Hours' },
    { key: 'rate',       label: 'Rate' },
    { key: 'gross',      label: 'Gross' },
    { key: 'deductions', label: 'Deductions' },
    { key: 'net',        label: 'Net Pay' },
    { key: 'paid_via',   label: 'Paid Via' },
    { key: 'status',     label: 'Status' },
    { key: 'lic',        label: 'Lic #',    group: 'Timesheet' },
    { key: 'projects',   label: 'Projects', group: 'Timesheet' },
  ];
  const COL_DEFAULTS = { guard: true, period: true, hours: true, rate: true, gross: true, deductions: true, net: true, paid_via: true, status: true, lic: false, projects: false };
  const [colSettings, setColSettings] = useState(() => {
    try { const s = JSON.parse(localStorage.getItem('payroll_col_settings') || 'null'); return s ? { ...COL_DEFAULTS, ...s } : COL_DEFAULTS; }
    catch { return COL_DEFAULTS; }
  });
  const [colMenuOpen, setColMenuOpen] = useState(false);
  function toggleCol(key) {
    setColSettings(prev => { const n = { ...prev, [key]: !prev[key] }; localStorage.setItem('payroll_col_settings', JSON.stringify(n)); return n; });
  }

  // ── Detail drawer ──
  const [detailEntry, setDetailEntry] = useState(null);

  // ── Bulk selection ──
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [bulkSaving, setBulkSaving] = useState(false);
  function toggleSelect(id) { setSelectedIds(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; }); }
  function toggleSelectAll() {
    setSelectedIds(prev => prev.size === displayedEntries.length ? new Set() : new Set(displayedEntries.map(e => e.id)));
  }
  async function bulkSetStatus(status) {
    if (!selectedIds.size) return;
    setBulkSaving(true);
    try {
      await api.bulkUpdatePayroll([...selectedIds], { status });
      await load();
      setSelectedIds(new Set());
    } finally { setBulkSaving(false); }
  }
  // ── Link unmatched entry to guard profile ──
  const [linkEntry, setLinkEntry] = useState(null);   // payroll entry being linked
  const [linkGuardId, setLinkGuardId] = useState('');
  const [linkSearch, setLinkSearch] = useState('');
  const [linkSaving, setLinkSaving] = useState(false);
  function openLink(e) { setLinkEntry(e); setLinkGuardId(''); setLinkSearch(''); }
  async function handleLink() {
    if (!linkGuardId || !linkEntry) return;
    setLinkSaving(true);
    try {
      await api.updatePayroll(linkEntry.id, { user_id: linkGuardId });
      await load();
      setLinkEntry(null);
    } catch (err) { alert(err.message); } finally { setLinkSaving(false); }
  }

  async function bulkDelete() {
    if (!selectedIds.size) return;
    const count = selectedIds.size;
    if (!window.confirm(`Delete ${count} payroll ${count === 1 ? 'entry' : 'entries'}? This cannot be undone.`)) return;
    setBulkSaving(true);
    try {
      await api.bulkDeletePayroll([...selectedIds]);
      await load();
      setSelectedIds(new Set());
    } finally { setBulkSaving(false); }
  }
  function bulkExportExcel() {
    const rows = displayedEntries.filter(e => selectedIds.has(e.id));
    const ws = XLSX.utils.json_to_sheet(rows.map(e => ({
      Guard: guardMap[e.user_id]?.full_name || '',
      Period: `${e.period_start} – ${e.period_end}`,
      Hours: e.hours_regular ?? e.hours_worked ?? 0,
      Rate: e.pay_rate ?? e.hourly_rate ?? 0,
      Gross: e.gross ?? 0, Net: e.net ?? 0, Status: e.status,
    })));
    XLSX.utils.book_append_sheet(XLSX.utils.book_new(), ws, 'Payroll');
    XLSX.writeFile(XLSX.utils.book_new(), 'payroll-selection.xlsx');
  }

  // ── Comments (audit trail) ──
  const [newComment, setNewComment] = useState('');

  // ── Recurring schedules ──
  const [recurringModal, setRecurringModal] = useState(false);
  const [schedules, setSchedules] = useState(() => {
    try { return JSON.parse(localStorage.getItem('payroll_schedules') || '{}'); } catch { return {}; }
  });
  function saveSchedule(guardId, cadence) {
    const next = { ...schedules, [guardId]: cadence };
    setSchedules(next);
    localStorage.setItem('payroll_schedules', JSON.stringify(next));
  }

  // ── Timesheet import ──
  const [importStage, setImportStage] = useState(null); // null | 'upload' | 'preview' | 'done'
  const [importFile, setImportFile] = useState(null);
  const [importFromDate, setImportFromDate] = useState('');
  const [importToDate, setImportToDate] = useState('');
  const [importDefaultRate, setImportDefaultRate] = useState('24.50');
  const [importParsing, setImportParsing] = useState(false);
  const [importPreview, setImportPreview] = useState(null);
  const [importRows, setImportRows] = useState([]);
  const [importSearch, setImportSearch] = useState('');
  const [importCreating, setImportCreating] = useState(false);
  const [importResult, setImportResult] = useState(null);
  const [importError, setImportError] = useState('');
  const [importGlobalRate, setImportGlobalRate] = useState('');

  // ── Timesheet column settings ──
  const TS_COLS = [
    { key: 'guard_name', label: 'Guard Name' },
    { key: 'lic',        label: 'Licence #' },
    { key: 'status',     label: 'Match Status' },
    { key: 'shifts',     label: 'Shifts' },
    { key: 'hours',      label: 'Hours' },
    { key: 'period',     label: 'Period' },
    { key: 'projects',   label: 'Projects' },
    { key: 'rate',       label: 'Rate ($/hr)' },
    { key: 'gross',      label: 'Est. Gross' },
  ];
  const TS_DEFAULTS = { guard_name: true, lic: true, status: true, shifts: true, hours: true, period: true, projects: false, rate: true, gross: true };
  const [tsSettings, setTsSettings] = useState(() => {
    try { const s = JSON.parse(localStorage.getItem('ts_col_settings') || 'null'); return s ? { ...TS_DEFAULTS, ...s } : TS_DEFAULTS; }
    catch { return TS_DEFAULTS; }
  });
  const [tsSettingsOpen, setTsSettingsOpen] = useState(false);
  function toggleTsCol(key) {
    setTsSettings(prev => { const n = { ...prev, [key]: !prev[key] }; localStorage.setItem('ts_col_settings', JSON.stringify(n)); return n; });
  }

  async function load() {
    const [pd, gd] = await Promise.all([api.payroll(filterStatus ? `?status=${filterStatus}` : ''), api.guards()]);
    setEntries(pd.periods || pd.entries || []);
    setGuards(gd.guards || []);
    setLoading(false);
  }
  useEffect(() => { setLoading(true); load(); }, [filterStatus]);

  function openCreate() { setForm(EMPTY); setEditing(null); setError(''); setModal('entry'); }
  function openEdit(e) {
    setForm({
      user_id: e.user_id || '',
      period_start: e.period_start?.slice(0,10) || '',
      period_end: e.period_end?.slice(0,10) || '',
      pay_date: e.pay_date?.slice(0,10) || '',
      hours_regular: e.hours_regular ?? e.hours_worked ?? '',
      hours_overtime: e.hours_overtime ?? '0',
      pay_rate: e.pay_rate ?? e.hourly_rate ?? '',
      status: e.status || 'submitted',
      notes: e.notes || '',
      deductions: e.deductions || [],
      paid_via: e.paid_via || '',
      comments: e.comments || [],
    });
    setEditing(e); setError(''); setNewComment(''); setModal('entry');
  }

  async function handleSave(e) {
    e.preventDefault(); setSaving(true); setError('');
    try {
      const body = {
        ...form,
        hours_regular: Number(form.hours_regular),
        hours_overtime: Number(form.hours_overtime) || 0,
        pay_rate: Number(form.pay_rate),
        deductions: form.deductions.map(d => ({ label: d.label, amount: Number(d.amount) || 0 })),
      };
      editing ? await api.updatePayroll(editing.id, body) : await api.createPayroll(body);
      setModal(null); await load();
    } catch (err) { setError(err.message); } finally { setSaving(false); }
  }

  // Deduction helpers
  function addDeduction() {
    setForm(p => ({ ...p, deductions: [...p.deductions, { label: '', amount: '' }] }));
  }
  function updateDeduction(i, field, val) {
    setForm(p => {
      const d = [...p.deductions];
      d[i] = { ...d[i], [field]: val };
      return { ...p, deductions: d };
    });
  }
  function removeDeduction(i) {
    setForm(p => ({ ...p, deductions: p.deductions.filter((_, idx) => idx !== i) }));
  }

  // ── Import handlers ──
  function openImport() {
    setImportStage('upload'); setImportFile(null); setImportFromDate('');
    setImportToDate(''); setImportDefaultRate('24.50'); setImportError('');
    setImportPreview(null); setImportRows([]); setImportSearch(''); setImportResult(null);
  }
  function closeImport() { setImportStage(null); }

  async function handleParseTimesheet(e) {
    e.preventDefault();
    if (!importFile) return;
    setImportParsing(true); setImportError('');
    try {
      const fd = new FormData();
      fd.append('file', importFile);
      const params = new URLSearchParams();
      if (importFromDate) params.set('from_date', importFromDate);
      if (importToDate)   params.set('to_date', importToDate);
      const data = await api.parseTimesheet(fd, params.toString());
      setImportPreview(data);
      setImportRows(data.guards.map(g => ({ ...g, pay_rate: importDefaultRate, included: true })));
      setImportStage('preview');
    } catch (err) { setImportError(err.message); } finally { setImportParsing(false); }
  }

  function toggleAllImport(val) { setImportRows(r => r.map(x => ({ ...x, included: val }))); }
  function toggleMatchedImport() { setImportRows(r => r.map(x => ({ ...x, included: x.matched }))); }
  function applyGlobalRate(rate) { setImportRows(r => r.map(x => ({ ...x, pay_rate: rate }))); }
  function updateImportRow(idx, field, val) {
    setImportRows(r => r.map((x, i) => i === idx ? { ...x, [field]: val } : x));
  }

  async function handleBulkCreate() {
    const selected = importRows.filter(r => r.included && r.period_start && r.period_end);
    if (!selected.length) return;
    setImportCreating(true); setImportError('');
    try {
      const entries = selected.map(r => ({
        lic_number: r.lic_number, guard_name: r.guard_name,
        user_id: r.user_id || null,
        period_start: r.period_start, period_end: r.period_end,
        hours_regular: r.total_hours,
        pay_rate: Number(r.pay_rate) || 0,
        shift_count: r.shift_count || 0,
        shift_dates: r.shift_dates || [],
        notes: `Imported from timesheet · ${r.shift_count} shift${r.shift_count !== 1 ? 's' : ''} · ${r.projects?.slice(0,3).join(', ') || ''}`.trim().replace(/·\s*$/, ''),
      }));
      const res = await api.bulkCreatePayroll(entries);
      setImportResult(res); setImportStage('done'); await load();
    } catch (err) { setImportError(err.message); } finally { setImportCreating(false); }
  }

  async function handleCalculate(e) {
    e.preventDefault(); setSaving(true); setError(''); setCalcProgress(null);
    const base = {
      period_start: calcForm.period_start,
      period_end: calcForm.period_end,
      pay_date: calcForm.pay_date || calcForm.period_end,
      hourly_rate: Number(calcForm.hourly_rate) || 25,
    };
    try {
      if (calcMode === 'single') {
        if (!calcGuardId) { setError('Please select a guard.'); setSaving(false); return; }
        await api.calculatePayroll({ ...base, user_id: calcGuardId });
        setCalcModal(false); await load();
      } else {
        // All guards — iterate sequentially
        const targetGuards = guards;
        let done = 0, errors = 0;
        setCalcProgress({ done: 0, total: targetGuards.length, errors: 0 });
        for (const g of targetGuards) {
          try {
            await api.calculatePayroll({ ...base, user_id: g.id });
          } catch (_) { errors++; }
          done++;
          setCalcProgress({ done, total: targetGuards.length, errors });
        }
        setCalcModal(false);
        await load();
      }
    } catch (err) { setError(err.message); } finally { setSaving(false); setCalcProgress(null); }
  }

  const guardMap = Object.fromEntries(guards.map(g => [g.id, g]));
  const f = (k) => (e) => setForm(p => ({ ...p, [k]: e.target.value }));
  const fc = (k) => (e) => setCalcForm(p => ({ ...p, [k]: e.target.value }));

  // ── Anomaly detection ──
  const anomalyIds = useMemo(() => {
    const guardGross = {};
    entries.forEach(e => {
      const gross = e.gross ?? e.gross_pay ?? ((e.hours_regular ?? 0) * (e.pay_rate ?? 0));
      if (!guardGross[e.user_id]) guardGross[e.user_id] = [];
      guardGross[e.user_id].push(gross);
    });
    const bad = new Set();
    entries.forEach(e => {
      const hrs  = e.hours_regular ?? e.hours_worked ?? 0;
      const rate = e.pay_rate ?? e.hourly_rate ?? 0;
      const gross = e.gross ?? e.gross_pay ?? (hrs * rate);
      const list = guardGross[e.user_id] || [];
      const avg  = list.reduce((a, b) => a + b, 0) / (list.length || 1);
      if (hrs === 0 || rate === 0 || (list.length > 1 && Math.abs(gross - avg) > avg * 0.6)) bad.add(e.id);
    });
    return bad;
  }, [entries]);

  // ── Overlap detection ──
  const overlapIds = useMemo(() => {
    const byGuard = {};
    entries.forEach(e => { (byGuard[e.user_id] = byGuard[e.user_id] || []).push(e); });
    const bad = new Set();
    Object.values(byGuard).forEach(list => {
      for (let i = 0; i < list.length; i++) for (let j = i + 1; j < list.length; j++) {
        const a = list[i], b = list[j];
        if (a.period_start && a.period_end && b.period_start && b.period_end) {
          if (new Date(a.period_start) <= new Date(b.period_end) && new Date(b.period_start) <= new Date(a.period_end)) {
            bad.add(a.id); bad.add(b.id);
          }
        }
      }
    });
    return bad;
  }, [entries]);

  // ── Sort toggle ──
  function toggleSort(key) {
    if (sortKey === key) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortKey(key); setSortDir('asc'); }
  }

  // ── Filtered + sorted entries ──
  const displayedEntries = [...entries]
    .filter(e => filterGuardIds.length === 0 || filterGuardIds.includes(e.user_id))
    .filter(e => {
      if (!searchText) return true;
      const q = searchText.toLowerCase();
      return (
        (guardMap[e.user_id]?.full_name || '').toLowerCase().includes(q) ||
        (e.user_name || '').toLowerCase().includes(q) ||
        (e.notes || '').toLowerCase().includes(q) ||
        (e.status || '').toLowerCase().includes(q) ||
        (e.period_start || '').includes(q) ||
        (e.period_end || '').includes(q) ||
        (e.paid_via || '').toLowerCase().includes(q)
      );
    })
    .sort((a, b) => {
      let av, bv;
      switch (sortKey) {
        case 'guard':      av = guardMap[a.user_id]?.full_name || ''; bv = guardMap[b.user_id]?.full_name || ''; break;
        case 'period_start': av = a.period_start || ''; bv = b.period_start || ''; break;
        case 'hours':      av = a.hours_regular ?? a.hours_worked ?? 0; bv = b.hours_regular ?? b.hours_worked ?? 0; break;
        case 'rate':       av = a.pay_rate ?? a.hourly_rate ?? 0; bv = b.pay_rate ?? b.hourly_rate ?? 0; break;
        case 'gross': {
          const ag = a.gross ?? a.gross_pay ?? ((a.hours_regular ?? 0) * (a.pay_rate ?? 0));
          const bg = b.gross ?? b.gross_pay ?? ((b.hours_regular ?? 0) * (b.pay_rate ?? 0));
          av = ag; bv = bg; break;
        }
        case 'net': {
          const ag = a.gross ?? a.gross_pay ?? ((a.hours_regular ?? 0) * (a.pay_rate ?? 0));
          const bg = b.gross ?? b.gross_pay ?? ((b.hours_regular ?? 0) * (b.pay_rate ?? 0));
          const ad = a.total_deductions ?? (a.deductions||[]).reduce((s,d)=>s+(d.amount||0),0);
          const bd = b.total_deductions ?? (b.deductions||[]).reduce((s,d)=>s+(d.amount||0),0);
          av = a.net ?? (ag - ad); bv = b.net ?? (bg - bd); break;
        }
        case 'status':    av = a.status || ''; bv = b.status || ''; break;
        default:           av = a.period_start || ''; bv = b.period_start || '';
      }
      if (typeof av === 'string') return sortDir === 'asc' ? av.localeCompare(bv) : bv.localeCompare(av);
      return sortDir === 'asc' ? av - bv : bv - av;
    });

  const totalGross = displayedEntries.reduce((sum, e) => sum + (e.gross ?? e.gross_pay ?? (e.hours_regular || e.hours_worked || 0) * (e.pay_rate || e.hourly_rate || 0)), 0);

  // ── Export helpers ──
  function buildExportRows() {
    return displayedEntries.map(e => {
      const hrs  = e.hours_regular ?? e.hours_worked ?? 0;
      const rate = e.pay_rate ?? e.hourly_rate ?? 0;
      const gross = e.gross ?? e.gross_pay ?? (hrs * rate);
      const ded   = e.total_deductions ?? (e.deductions||[]).reduce((s,d)=>s+(d.amount||0),0);
      const net   = e.net ?? (gross - ded);
      return {
        Guard:       guardMap[e.user_id]?.full_name || e.user_name || '—',
        'Period Start': e.period_start ? e.period_start.slice(0,10) : '—',
        'Period End':   e.period_end   ? e.period_end.slice(0,10)   : '—',
        'Reg Hours':  +hrs.toFixed(2),
        'OT Hours':   +(e.hours_overtime ?? 0).toFixed(2),
        'Rate ($/hr)': +rate.toFixed(2),
        'Gross ($)':   +gross.toFixed(2),
        'Deductions ($)': +ded.toFixed(2),
        'Net Pay ($)':    +net.toFixed(2),
        'Paid Via': PAID_VIA_OPTIONS.find(o=>o.value===e.paid_via)?.label || '—',
        Status:      e.status || '—',
        Notes:       e.notes || '',
      };
    });
  }

  function exportExcel() {
    const rows = buildExportRows();
    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Payroll');
    XLSX.writeFile(wb, `payroll-export-${new Date().toISOString().slice(0,10)}.xlsx`);
  }

  function exportPDF() {
    const doc = new jsPDF({ orientation: 'landscape' });
    const guardLabel = filterGuardIds.length === 0 ? 'All Guards' : filterGuardIds.map(id => guardMap[id]?.full_name || id).join(', ');
    const statusLabel = filterStatus ? filterStatus.replace(/_/g,' ') : 'All Statuses';
    doc.setFontSize(14);
    doc.text('Payroll Report', 14, 14);
    doc.setFontSize(9);
    doc.setTextColor(120);
    doc.text(`${guardLabel} · ${statusLabel} · ${displayedEntries.length} entries · ${totalGross.toFixed(2)} gross`, 14, 21);
    doc.text(`Exported: ${new Date().toLocaleString()}`, 14, 27);
    const rows = buildExportRows();
    autoTable(doc, {
      startY: 32,
      head: [Object.keys(rows[0] || {})],
      body: rows.map(r => Object.values(r)),
      styles: { fontSize: 8, cellPadding: 2 },
      headStyles: { fillColor: [17, 24, 39], textColor: 255, fontStyle: 'bold' },
      alternateRowStyles: { fillColor: [249, 250, 251] },
    });
    doc.save(`payroll-export-${new Date().toISOString().slice(0,10)}.pdf`);
  }

  return (
    <div>
      {/* ── Page header ── */}
      <div className="flex items-start justify-between mb-5 gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Payroll</h1>
          <p className="text-gray-400 mt-0.5 text-sm">
            {displayedEntries.length}{displayedEntries.length !== entries.length ? ` of ${entries.length}` : ''} entries · ${totalGross.toFixed(2)} gross
          </p>
        </div>

        {/* Action toolbar */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* Export group */}
          <div className="flex items-center border border-gray-200 rounded-lg overflow-hidden">
            <button onClick={exportExcel}
              className="flex items-center gap-1.5 px-3 py-2 text-sm text-gray-600 hover:bg-gray-50 transition-colors border-r border-gray-200">
              <FileDown size={14} className="text-gray-400" /> Excel
            </button>
            <button onClick={exportPDF}
              className="flex items-center gap-1.5 px-3 py-2 text-sm text-gray-600 hover:bg-gray-50 transition-colors">
              <FileDown size={14} className="text-gray-400" /> PDF
            </button>
          </div>

          {/* Import */}
          <button onClick={openImport}
            className="flex items-center gap-1.5 px-3 py-2 text-sm text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
            <Upload size={14} className="text-gray-400" /> Import Timesheet
          </button>

          {/* Calculate */}
          <button onClick={() => { setCalcForm({ period_start: '', period_end: '', pay_date: '', hourly_rate: '' }); setError(''); setCalcModal(true); }}
            className="flex items-center gap-1.5 px-3 py-2 text-sm text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
            <Calculator size={14} className="text-gray-400" /> Calculate
          </button>

          {/* Add Entry — primary CTA */}
          <button onClick={openCreate}
            className="flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-white bg-gray-900 hover:bg-gray-700 rounded-lg transition-colors">
            <Plus size={14} /> Add Entry
          </button>

          {/* Features */}
          <button onClick={() => setFeaturePanelOpen(true)}
            className={`flex items-center gap-1.5 px-3 py-2 text-sm rounded-lg border transition-colors ${Object.values(features).some(Boolean) ? 'border-gray-900 bg-gray-900 text-white' : 'border-gray-200 text-gray-500 hover:bg-gray-50'}`}>
            <Settings2 size={14} />
            {Object.values(features).filter(Boolean).length > 0 && (
              <span className="bg-white text-gray-900 rounded-full px-1.5 text-xs font-bold leading-none py-0.5">
                {Object.values(features).filter(Boolean).length}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* ── Status tabs ── */}
      <div className="flex gap-1 mb-5 border-b border-gray-100 pb-0">
        {['', 'submitted', 'under_review', 'approved', 'paid'].map(s => {
          const label = s ? s.replace('_', ' ').charAt(0).toUpperCase() + s.replace('_', ' ').slice(1) : 'All';
          return (
            <button key={s} onClick={() => setFilterStatus(s)}
              className={`px-4 py-2.5 text-sm font-medium transition-colors border-b-2 -mb-px ${
                filterStatus === s
                  ? 'border-gray-900 text-gray-900'
                  : 'border-transparent text-gray-400 hover:text-gray-600 hover:border-gray-200'
              }`}>
              {label}
            </button>
          );
        })}
      </div>

      {/* ── Guard filter + sort bar ── */}
      <div className="flex gap-3 mb-5 flex-wrap items-center">
        {/* Guard multi-select picker */}
        <div className="relative">
          <button
            onClick={() => setGuardSearchOpen(o => !o)}
            className={`flex items-center gap-2 border rounded-xl px-3 py-2 text-sm font-medium transition-colors ${filterGuardIds.length > 0 ? 'border-blue-300 bg-blue-50 text-blue-800' : 'border-gray-200 bg-white text-gray-600 hover:bg-gray-50'}`}>
            <Users size={14} />
            {filterGuardIds.length === 0 ? 'Filter by guard' : `${filterGuardIds.length} guard${filterGuardIds.length > 1 ? 's' : ''} selected`}
            {filterGuardIds.length > 0
              ? <button onClick={e => { e.stopPropagation(); setFilterGuardIds([]); setGuardSearchText(''); }} className="ml-1 text-blue-400 hover:text-blue-700"><X size={13} /></button>
              : <ChevronDown size={13} className="text-gray-400" />}
          </button>

          {guardSearchOpen && (
            <div className="absolute z-30 top-full mt-1 left-0 w-72 bg-white border border-gray-200 rounded-xl shadow-lg">
              {/* Search */}
              <div className="p-2 border-b border-gray-100">
                <div className="relative">
                  <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input autoFocus placeholder="Search guard…" className="input pl-7 py-1.5 text-sm"
                    value={guardSearchText} onChange={e => setGuardSearchText(e.target.value)} />
                </div>
              </div>

              {/* Select-all / clear row */}
              <div className="flex justify-between px-3 py-1.5 border-b border-gray-100 text-xs">
                <button onClick={() => setFilterGuardIds(guards.map(g => g.id))} className="text-blue-600 hover:text-blue-800 font-medium">Select all</button>
                <button onClick={() => setFilterGuardIds([])} className="text-gray-400 hover:text-gray-700">Clear</button>
              </div>

              {/* Guard list with checkboxes */}
              <div className="max-h-52 overflow-y-auto py-1">
                {guards
                  .filter(g => !guardSearchText || g.full_name?.toLowerCase().includes(guardSearchText.toLowerCase()))
                  .map(g => {
                    const checked = filterGuardIds.includes(g.id);
                    return (
                      <label key={g.id} className="flex items-center gap-3 px-4 py-2 hover:bg-gray-50 cursor-pointer">
                        <input
                          type="checkbox"
                          className="w-4 h-4 accent-gray-900 cursor-pointer"
                          checked={checked}
                          onChange={() => setFilterGuardIds(prev =>
                            checked ? prev.filter(id => id !== g.id) : [...prev, g.id]
                          )}
                        />
                        <span className="text-sm text-gray-800">{g.full_name}</span>
                      </label>
                    );
                  })
                }
                {guards.filter(g => !guardSearchText || g.full_name?.toLowerCase().includes(guardSearchText.toLowerCase())).length === 0 && (
                  <p className="px-4 py-2 text-xs text-gray-400">No guards found</p>
                )}
              </div>

              {/* Done button */}
              <div className="p-2 border-t border-gray-100">
                <button onClick={() => setGuardSearchOpen(false)} className="w-full btn-primary py-1.5 text-sm">Done</button>
              </div>
            </div>
          )}
        </div>

        {/* Search bar */}
        <div className="relative flex-1 min-w-48 max-w-sm">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
          <input
            type="text"
            placeholder="Search by guard, status, notes…"
            className="input pl-8 py-2 text-sm"
            value={searchText}
            onChange={e => setSearchText(e.target.value)}
          />
          {searchText && (
            <button onClick={() => setSearchText('')} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-700">
              <X size={13} />
            </button>
          )}
        </div>

        {/* View (column visibility) */}
        <div className="relative">
          <button
            onClick={() => setColMenuOpen(o => !o)}
            className={`flex items-center gap-2 border rounded-xl px-3 py-2 text-sm font-medium transition-colors ${Object.values(colSettings).some(v => !v) ? 'border-gray-900 bg-gray-900 text-white' : 'border-gray-200 bg-white text-gray-600 hover:bg-gray-50'}`}>
            <Settings2 size={14} /> View
            {Object.values(colSettings).some(v => !v) && (
              <span className="bg-white text-gray-900 rounded-full px-1.5 py-0.5 text-xs font-bold leading-none">
                {Object.values(colSettings).filter(v => !v).length} hidden
              </span>
            )}
          </button>
          {colMenuOpen && (
            <>
              <div className="fixed inset-0 z-20" onClick={() => setColMenuOpen(false)} />
              <div className="absolute z-30 top-full mt-1 left-0 w-56 bg-white border border-gray-200 rounded-xl shadow-lg p-2 space-y-0.5">
                <p className="px-2 py-1 text-xs font-semibold text-gray-400 uppercase tracking-wider">Standard columns</p>
                {TABLE_COLS.filter(c => !c.group).map(col => (
                  <label key={col.key} className="flex items-center gap-3 px-2 py-1.5 rounded-lg hover:bg-gray-50 cursor-pointer">
                    <input type="checkbox" className="w-4 h-4 accent-gray-900 cursor-pointer"
                      checked={!!colSettings[col.key]}
                      onChange={() => toggleCol(col.key)} />
                    <span className="text-sm text-gray-700">{col.label}</span>
                  </label>
                ))}
                <p className="px-2 pt-2 pb-1 text-xs font-semibold text-gray-400 uppercase tracking-wider border-t border-gray-100 mt-1">Timesheet columns</p>
                {TABLE_COLS.filter(c => c.group === 'Timesheet').map(col => (
                  <label key={col.key} className="flex items-center gap-3 px-2 py-1.5 rounded-lg hover:bg-gray-50 cursor-pointer">
                    <input type="checkbox" className="w-4 h-4 accent-gray-900 cursor-pointer"
                      checked={!!colSettings[col.key]}
                      onChange={() => toggleCol(col.key)} />
                    <span className="text-sm text-gray-700">{col.label}</span>
                  </label>
                ))}
                <div className="border-t border-gray-100 pt-1 mt-1">
                  <button onClick={() => { setColSettings(COL_DEFAULTS); localStorage.setItem('payroll_col_settings', JSON.stringify(COL_DEFAULTS)); }}
                    className="w-full text-xs text-gray-400 hover:text-gray-700 py-1 text-center transition-colors">
                    Reset to default
                  </button>
                </div>
              </div>
            </>
          )}
        </div>

        {/* Sort control */}
        <div className="flex items-center gap-2 ml-auto">
          {features.recurring && (
            <button onClick={() => setRecurringModal(true)}
              className="flex items-center gap-1.5 text-sm border border-indigo-200 bg-indigo-50 text-indigo-700 hover:bg-indigo-100 rounded-xl px-3 py-1.5 transition-colors font-medium">
              <RefreshCw size={13} /> Schedules
            </button>
          )}
          <span className="text-xs text-gray-400 font-medium">Sort:</span>
          <select className="input py-1.5 text-sm w-auto pr-8"
            value={sortKey} onChange={e => setSortKey(e.target.value)}>
            <option value="period_start">Period</option>
            <option value="guard">Guard name</option>
            <option value="hours">Hours</option>
            <option value="gross">Gross pay</option>
            <option value="net">Net pay</option>
            <option value="status">Status</option>
          </select>
          <button onClick={() => setSortDir(d => d === 'asc' ? 'desc' : 'asc')}
            className="border border-gray-200 text-gray-500 hover:bg-gray-50 rounded-lg p-1.5 transition-colors" title={sortDir === 'asc' ? 'Ascending' : 'Descending'}>
            {sortDir === 'asc' ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
          </button>
        </div>
      </div>

      {/* ── Dashboard (feature) ── */}
      {features.dashboard && !loading && entries.length > 0 && (
        <PayrollDashboard entries={entries} guardMap={guardMap} anomalyCount={anomalyIds.size} />
      )}

      {/* ── Unlinked guard warning banner ── */}
      {!loading && (() => {
        const unlinkedCount = displayedEntries.filter(e => e.user_id?.startsWith('ext:')).length;
        return unlinkedCount > 0 ? (
          <div className="flex items-center gap-3 bg-orange-50 border border-orange-200 rounded-xl px-4 py-3 mb-4 text-sm">
            <UserX size={16} className="text-orange-500 flex-shrink-0" />
            <p className="text-orange-800 flex-1">
              <strong>{unlinkedCount} {unlinkedCount === 1 ? 'entry has' : 'entries have'} no guard profile</strong>
              {' '}— these won't appear in the mobile app until linked. Click <Link2 size={12} className="inline text-orange-600" /> on each row to link them to a guard account.
            </p>
          </div>
        ) : null;
      })()}

      {loading ? <div className="text-gray-400 text-sm">Loading…</div> : (
        !displayedEntries.length ? (
          entries.length && (filterGuardIds.length > 0 || filterStatus || searchText)
            ? <div className="text-center py-12 text-gray-400 text-sm">No entries match your filters. <button className="underline text-gray-500 hover:text-gray-800" onClick={() => { setFilterGuardIds([]); setFilterStatus(''); setSearchText(''); }}>Clear filters</button></div>
            : <EmptyState icon={DollarSign} title="No payroll entries" />
        ) : (
          <div className="card p-0 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-100">
                  <tr>
                    {/* Bulk checkbox */}
                    <th className="table-head w-10">
                      <input type="checkbox" className="w-4 h-4 accent-gray-900 cursor-pointer"
                        checked={selectedIds.size === displayedEntries.length && displayedEntries.length > 0}
                        onChange={toggleSelectAll} />
                    </th>
                    {[
                      { label: 'Guard',      key: 'guard',       sort: 'guard' },
                      { label: 'Period',     key: 'period',      sort: 'period_start' },
                      { label: 'Hours',      key: 'hours',       sort: 'hours' },
                      { label: 'Rate',       key: 'rate',        sort: 'rate' },
                      { label: 'Gross',      key: 'gross',       sort: 'gross' },
                      { label: 'Deductions', key: 'deductions',  sort: null },
                      { label: 'Net Pay',    key: 'net',         sort: 'net' },
                      { label: 'Paid Via',   key: 'paid_via',    sort: null },
                      { label: 'Status',     key: 'status',      sort: 'status' },
                      { label: 'Lic #',      key: 'lic',         sort: null },
                      { label: 'Projects',   key: 'projects',    sort: null },
                      { label: '',           key: '_actions',    sort: null },
                    ].filter(({ key }) => key === '_actions' || colSettings[key] !== false).map(({ label, key, sort }) => (
                      <th key={key} className="table-head">
                        {sort ? (
                          <button onClick={() => toggleSort(sort)}
                            className="flex items-center gap-1 font-semibold text-gray-600 hover:text-gray-900 transition-colors">
                            {label}
                            {sortKey === sort
                              ? (sortDir === 'asc' ? <ChevronUp size={13} /> : <ChevronDown size={13} />)
                              : <ChevronsUpDown size={13} className="text-gray-300" />}
                          </button>
                        ) : label}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {displayedEntries.map(e => {
                    const hrs = e.hours_regular ?? e.hours_worked ?? 0;
                    const rate = e.pay_rate ?? e.hourly_rate ?? 0;
                    const gross = e.gross ?? e.gross_pay ?? (hrs * rate);
                    const totalDed = e.total_deductions ?? (e.deductions || []).reduce((s, d) => s + (d.amount || 0), 0);
                    const net = e.net ?? (gross - totalDed);
                    const paidViaLabel = PAID_VIA_OPTIONS.find(o => o.value === e.paid_via)?.label || '—';
                    const isAnomaly  = features.anomaly  && anomalyIds.has(e.id);
                    const isOverlap  = features.overlap  && overlapIds.has(e.id);
                    const isSelected = selectedIds.has(e.id);
                    const isUnlinked = e.user_id?.startsWith('ext:');
                    return (
                      <tr key={e.id} onClick={() => setDetailEntry(e)}
                        className={`cursor-pointer transition-colors ${isSelected ? 'bg-gray-900/5' : isUnlinked ? 'bg-orange-50 hover:bg-orange-100/60' : isAnomaly ? 'bg-amber-50 hover:bg-amber-100/60' : isOverlap ? 'bg-red-50 hover:bg-red-100/60' : 'hover:bg-gray-50/50'}`}>

                        {/* Bulk checkbox */}
                        <td className="table-cell" onClick={ev => ev.stopPropagation()}>
                          <input type="checkbox" className="w-4 h-4 accent-gray-900 cursor-pointer"
                            checked={isSelected} onChange={() => toggleSelect(e.id)} />
                        </td>

                        {colSettings.guard !== false && (
                          <td className="table-cell">
                            <div className="flex items-center gap-2">
                              <p className="text-gray-900 text-sm font-medium">{guardMap[e.user_id]?.full_name || e.guard_name_import || '—'}</p>
                              {isUnlinked && <span title="No guard profile — won't appear in mobile app"><UserX size={13} className="text-orange-500 flex-shrink-0" /></span>}
                              {isAnomaly  && <span title="Anomaly detected"><AlertTriangle size={13} className="text-amber-500 flex-shrink-0" /></span>}
                              {isOverlap  && <span title="Period overlaps another entry"><Calendar size={13} className="text-red-500 flex-shrink-0" /></span>}
                            </div>
                          </td>
                        )}
                        {colSettings.period !== false && (
                          <td className="table-cell text-xs text-gray-600">
                            {e.period_start ? format(parseISO(e.period_start), 'MMM d') : '—'} – {e.period_end ? format(parseISO(e.period_end), 'MMM d') : '—'}
                          </td>
                        )}
                        {colSettings.hours      !== false && <td className="table-cell text-sm font-mono">{hrs?.toFixed(1) ?? '—'}h</td>}
                        {colSettings.rate       !== false && <td className="table-cell text-sm font-mono">${rate?.toFixed(2) ?? '—'}</td>}
                        {colSettings.gross      !== false && <td className="table-cell text-sm text-gray-700 font-mono">${gross?.toFixed(2) ?? '—'}</td>}
                        {colSettings.deductions !== false && <td className="table-cell text-sm font-mono text-red-600">{totalDed > 0 ? `−${totalDed.toFixed(2)}` : <span className="text-gray-300">—</span>}</td>}
                        {colSettings.net        !== false && <td className="table-cell text-sm font-bold text-gray-900">${net?.toFixed(2) ?? '—'}</td>}
                        {colSettings.paid_via   !== false && <td className="table-cell text-xs text-gray-500">{paidViaLabel}</td>}
                        {colSettings.status     !== false && <td className="table-cell"><Badge status={e.status} /></td>}
                        {colSettings.lic      && <td className="table-cell font-mono text-xs text-gray-500">{e.lic_number || '—'}</td>}
                        {colSettings.projects && (
                          <td className="table-cell text-xs text-gray-500">
                            {e.notes
                              ? e.notes.replace(/^Imported from timesheet\s*·?\s*\d+\s*shifts?\s*·?\s*/i, '').replace(/·\s*$/, '').trim() || '—'
                              : '—'}
                          </td>
                        )}
                        <td className="table-cell text-right" onClick={ev => ev.stopPropagation()}>
                          <div className="flex items-center gap-0.5 justify-end">
                            {isUnlinked && (
                              <button onClick={() => openLink(e)} title="Link to guard profile"
                                className="text-orange-400 hover:text-orange-700 p-1.5 rounded transition-colors">
                                <Link2 size={15} />
                              </button>
                            )}
                            {features.paystub && (
                              <a href={`/api/payroll/${e.id}/stub`} target="_blank" rel="noreferrer"
                                title="Download pay stub"
                                className="text-gray-400 hover:text-blue-600 p-1.5 rounded transition-colors">
                                <FileText size={15} />
                              </a>
                            )}
                            <button onClick={() => openEdit(e)} className="text-gray-400 hover:text-gray-900 p-1.5 rounded transition-colors"><Edit2 size={16} /></button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )
      )}

      {/* ── Bulk action bar ── */}
      {selectedIds.size > 0 && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 flex items-center gap-3 bg-gray-900 text-white px-5 py-3 rounded-2xl shadow-2xl border border-white/10">
          <span className="text-sm font-semibold">{selectedIds.size} selected</span>
          <div className="w-px h-5 bg-white/20" />
          <button disabled={bulkSaving} onClick={() => bulkSetStatus('approved')}
            className="flex items-center gap-1.5 text-sm px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 transition-colors disabled:opacity-50">
            <CheckCircle2 size={14} /> Approve
          </button>
          <button disabled={bulkSaving} onClick={() => bulkSetStatus('paid')}
            className="flex items-center gap-1.5 text-sm px-3 py-1.5 rounded-lg bg-green-600 hover:bg-green-700 transition-colors disabled:opacity-50">
            <DollarSign size={14} /> Mark Paid
          </button>
          <button disabled={bulkSaving} onClick={() => bulkSetStatus('under_review')}
            className="flex items-center gap-1.5 text-sm px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 transition-colors disabled:opacity-50">
            Under Review
          </button>
          <button onClick={exportExcel}
            className="flex items-center gap-1.5 text-sm px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 transition-colors">
            <Download size={14} /> Export
          </button>
          <div className="w-px h-5 bg-white/20" />
          <button disabled={bulkSaving} onClick={bulkDelete}
            className="flex items-center gap-1.5 text-sm px-3 py-1.5 rounded-lg bg-red-600 hover:bg-red-700 transition-colors disabled:opacity-50">
            <Trash2 size={14} /> Delete
          </button>
          <button onClick={() => setSelectedIds(new Set())}
            className="ml-1 text-white/50 hover:text-white transition-colors">
            <X size={16} />
          </button>
        </div>
      )}

      {/* ── Link Guard modal ── */}
      {linkEntry && (
        <Modal title="Link to Guard Profile" onClose={() => setLinkEntry(null)}>
          <div className="space-y-4">
            <div className="bg-orange-50 border border-orange-200 rounded-xl px-4 py-3 text-sm text-orange-800">
              <p className="font-semibold mb-0.5">{linkEntry.guard_name_import || linkEntry.lic_number}</p>
              <p className="text-xs text-orange-600">Lic # {linkEntry.lic_number} · imported from timesheet · not matched to any profile</p>
            </div>

            <div>
              <label className="label">Search guard directory</label>
              <div className="relative mb-2">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input autoFocus placeholder="Name or licence number…" className="input pl-8"
                  value={linkSearch} onChange={e => setLinkSearch(e.target.value)} />
              </div>
              <div className="border border-gray-200 rounded-xl overflow-hidden max-h-56 overflow-y-auto">
                {guards
                  .filter(g => !linkSearch || g.full_name?.toLowerCase().includes(linkSearch.toLowerCase()) || g.licence_number?.includes(linkSearch))
                  .map(g => (
                    <label key={g.id}
                      className={`flex items-center gap-3 px-4 py-2.5 cursor-pointer transition-colors ${linkGuardId === g.id ? 'bg-gray-900 text-white' : 'hover:bg-gray-50'}`}>
                      <input type="radio" name="link_guard" className="w-4 h-4 accent-gray-900"
                        checked={linkGuardId === g.id} onChange={() => setLinkGuardId(g.id)} />
                      <div>
                        <p className={`text-sm font-medium ${linkGuardId === g.id ? 'text-white' : 'text-gray-900'}`}>{g.full_name}</p>
                        {g.licence_number && <p className={`text-xs font-mono ${linkGuardId === g.id ? 'text-gray-300' : 'text-gray-400'}`}>Lic # {g.licence_number}</p>}
                      </div>
                    </label>
                  ))}
                {guards.filter(g => !linkSearch || g.full_name?.toLowerCase().includes(linkSearch.toLowerCase()) || g.licence_number?.includes(linkSearch)).length === 0 && (
                  <p className="text-center py-6 text-sm text-gray-400">No guards match — check the Guards directory.</p>
                )}
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-2 border-t border-gray-100">
              <button className="btn-secondary" onClick={() => setLinkEntry(null)}>Cancel</button>
              <button className="btn-primary flex items-center gap-2" disabled={!linkGuardId || linkSaving} onClick={handleLink}>
                <Link2 size={15} /> {linkSaving ? 'Linking…' : 'Link to this guard'}
              </button>
            </div>
          </div>
        </Modal>
      )}

      {modal === 'entry' && (
        <Modal title={editing ? 'Edit Payroll Entry' : 'Add Payroll Entry'} onClose={() => setModal(null)} size="lg">
          <form onSubmit={handleSave} className="space-y-5">
            {error && <p className="text-red-600 text-sm bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</p>}

            {/* Guard */}
            <div>
              <label className="label">Guard</label>
              <select className="input" value={form.user_id} onChange={f('user_id')} required>
                <option value="">— Select guard —</option>
                {guards.map(g => <option key={g.id} value={g.id}>{g.full_name}</option>)}
              </select>
            </div>

            {/* Period */}
            <div className="grid grid-cols-3 gap-3">
              <div><label className="label">Period Start</label><input type="date" className="input" value={form.period_start} onChange={f('period_start')} required /></div>
              <div><label className="label">Period End</label><input type="date" className="input" value={form.period_end} onChange={f('period_end')} required /></div>
              <div><label className="label">Pay Date</label><input type="date" className="input" value={form.pay_date} onChange={f('pay_date')} /></div>
            </div>

            {/* Hours & Rate */}
            <div className="grid grid-cols-3 gap-3">
              <div><label className="label">Hours Worked</label><input type="number" step="0.1" min="0" className="input" value={form.hours_regular} onChange={f('hours_regular')} required /></div>
              <div><label className="label">Overtime Hours</label><input type="number" step="0.1" min="0" className="input" value={form.hours_overtime} onChange={f('hours_overtime')} /></div>
              <div><label className="label">Hourly Rate ($)</label><input type="number" step="0.01" min="0" className="input" value={form.pay_rate} onChange={f('pay_rate')} required /></div>
            </div>

            {/* Deductions */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="label mb-0">Deductions</label>
                <button type="button" onClick={addDeduction}
                  className="flex items-center gap-1 text-xs font-medium text-gray-600 hover:text-gray-900 bg-gray-100 hover:bg-gray-200 rounded-lg px-2.5 py-1.5 transition-colors">
                  <Plus size={12} /> Add deduction
                </button>
              </div>
              {form.deductions.length === 0 && (
                <p className="text-xs text-gray-400 py-1">No deductions — click "Add deduction" to include one.</p>
              )}
              <div className="space-y-2">
                {form.deductions.map((d, i) => (
                  <div key={i} className="flex gap-2 items-center">
                    <input
                      type="text" placeholder="Label (e.g. CPP, EI, Uniform)"
                      className="input flex-1 text-sm" value={d.label}
                      onChange={e => updateDeduction(i, 'label', e.target.value)} required />
                    <div className="relative w-32 flex-shrink-0">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">$</span>
                      <input
                        type="number" step="0.01" min="0" placeholder="0.00"
                        className="input pl-6 text-sm" value={d.amount}
                        onChange={e => updateDeduction(i, 'amount', e.target.value)} required />
                    </div>
                    <button type="button" onClick={() => removeDeduction(i)}
                      className="text-gray-300 hover:text-red-500 transition-colors flex-shrink-0">
                      <Trash2 size={15} />
                    </button>
                  </div>
                ))}
              </div>
            </div>

            {/* Paid via & Status */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="label">Paid Via</label>
                <select className="input" value={form.paid_via} onChange={f('paid_via')}>
                  {PAID_VIA_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
              </div>
              <div>
                <label className="label">Status</label>
                <select className="input" value={form.status} onChange={f('status')}>
                  {['submitted','under_review','approved','paid','cancelled'].map(s => (
                    <option key={s} value={s}>{s.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Notes */}
            <div><label className="label">Notes</label><textarea className="input resize-none" rows={2} value={form.notes} onChange={f('notes')} /></div>

            {/* Audit trail comments (feature) */}
            {features.comments && (
              <div>
                <label className="label flex items-center gap-1.5"><MessageSquare size={13} className="text-teal-600" /> Approval Comments</label>
                {/* Existing comments */}
                {(form.comments || []).length > 0 && (
                  <div className="space-y-2 mb-3 max-h-40 overflow-y-auto">
                    {(form.comments || []).map((c, i) => (
                      <div key={i} className="bg-gray-50 border border-gray-200 rounded-lg px-3 py-2">
                        <div className="flex items-center justify-between text-xs text-gray-400 mb-0.5">
                          <span className="font-semibold text-gray-600">{c.author || 'Manager'}</span>
                          <span>{c.at ? format(parseISO(c.at), 'MMM d, h:mm a') : ''}</span>
                        </div>
                        <p className="text-sm text-gray-800">{c.text}</p>
                      </div>
                    ))}
                  </div>
                )}
                <div className="flex gap-2">
                  <input
                    type="text" placeholder="Add a comment (e.g. Approved — pending bank confirmation)…"
                    className="input text-sm flex-1" value={newComment}
                    onChange={e => setNewComment(e.target.value)}
                    onKeyDown={e => {
                      if (e.key === 'Enter' && newComment.trim()) {
                        e.preventDefault();
                        const comment = { text: newComment.trim(), at: new Date().toISOString(), author: 'Manager' };
                        setForm(p => ({ ...p, comments: [...(p.comments || []), comment] }));
                        setNewComment('');
                      }
                    }}
                  />
                  <button type="button"
                    onClick={() => {
                      if (!newComment.trim()) return;
                      const comment = { text: newComment.trim(), at: new Date().toISOString(), author: 'Manager' };
                      setForm(p => ({ ...p, comments: [...(p.comments || []), comment] }));
                      setNewComment('');
                    }}
                    className="btn-primary px-3 text-sm">Add</button>
                </div>
              </div>
            )}

            {/* Pay summary */}
            {form.hours_regular && form.pay_rate && (
              <div className="bg-gray-50 border border-gray-200 rounded-xl overflow-hidden">
                {(() => {
                  const gross = Number(form.hours_regular) * Number(form.pay_rate)
                    + (Number(form.hours_overtime) || 0) * Number(form.pay_rate) * 1.5;
                  const totalDed = form.deductions.reduce((s, d) => s + (Number(d.amount) || 0), 0);
                  const net = gross - totalDed;
                  return (
                    <div className="divide-y divide-gray-200">
                      <div className="flex items-center justify-between px-4 py-2.5">
                        <span className="text-gray-500 text-xs font-semibold uppercase tracking-wider">Gross Pay</span>
                        <span className="text-gray-700 font-semibold">${gross.toFixed(2)}</span>
                      </div>
                      {totalDed > 0 && (
                        <div className="flex items-center justify-between px-4 py-2.5">
                          <span className="text-gray-500 text-xs font-semibold uppercase tracking-wider">Total Deductions</span>
                          <span className="text-red-600 font-semibold">−${totalDed.toFixed(2)}</span>
                        </div>
                      )}
                      <div className="flex items-center justify-between px-4 py-3 bg-gray-900">
                        <span className="text-gray-300 text-xs font-bold uppercase tracking-wider">Net Pay</span>
                        <span className="text-white font-bold text-xl">${net.toFixed(2)}</span>
                      </div>
                    </div>
                  );
                })()}
              </div>
            )}

            <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
              <button type="button" className="btn-secondary" onClick={() => setModal(null)}>Cancel</button>
              <button type="submit" className="btn-primary" disabled={saving}>{saving ? 'Saving…' : 'Save Entry'}</button>
            </div>
          </form>
        </Modal>
      )}

      {/* ── Import Timesheet Modal ── */}
      {importStage === 'upload' && (
        <Modal title="Import Client Timesheet" onClose={closeImport}>
          <form onSubmit={handleParseTimesheet} className="space-y-5">
            {importError && <p className="text-red-600 text-sm bg-red-50 border border-red-200 rounded-lg px-3 py-2">{importError}</p>}

            {/* File drop zone */}
            <div>
              <label className="label">Timesheet File (.xlsx)</label>
              <label className={`flex flex-col items-center justify-center gap-3 border-2 border-dashed rounded-xl p-8 cursor-pointer transition-colors ${importFile ? 'border-green-400 bg-green-50' : 'border-gray-200 hover:border-gray-400 bg-gray-50'}`}>
                <input type="file" accept=".xlsx,.xls" className="hidden" required
                  onChange={e => setImportFile(e.target.files[0] || null)} />
                {importFile ? (
                  <>
                    <FileSpreadsheet size={32} className="text-green-600" />
                    <div className="text-center">
                      <p className="font-semibold text-gray-900 text-sm">{importFile.name}</p>
                      <p className="text-xs text-gray-500 mt-0.5">{(importFile.size / 1024).toFixed(0)} KB — click to change</p>
                    </div>
                  </>
                ) : (
                  <>
                    <Upload size={32} className="text-gray-400" />
                    <div className="text-center">
                      <p className="font-semibold text-gray-700 text-sm">Click to select file</p>
                      <p className="text-xs text-gray-400 mt-0.5">Supports .xlsx and .xls</p>
                    </div>
                  </>
                )}
              </label>
            </div>

            {/* Optional date range filter */}
            <div>
              <label className="label">Filter by Pay Period <span className="font-normal text-gray-400">(optional — leave blank to import all dates)</span></label>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-gray-500 mb-1 block">From date</label>
                  <input type="date" className="input" value={importFromDate} onChange={e => setImportFromDate(e.target.value)} />
                </div>
                <div>
                  <label className="text-xs text-gray-500 mb-1 block">To date</label>
                  <input type="date" className="input" value={importToDate} onChange={e => setImportToDate(e.target.value)} />
                </div>
              </div>
            </div>

            {/* Default pay rate */}
            <div>
              <label className="label">Default Pay Rate ($ / hr)</label>
              <div className="relative w-48">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">$</span>
                <input type="number" step="0.01" min="0" className="input pl-6" value={importDefaultRate}
                  onChange={e => setImportDefaultRate(e.target.value)} required />
              </div>
              <p className="text-xs text-gray-400 mt-1">You can override per-guard in the next step.</p>
            </div>

            {/* Timesheet Settings */}
            <div className="border border-gray-200 rounded-xl overflow-hidden">
              <button type="button"
                onClick={() => setTsSettingsOpen(p => !p)}
                className="w-full flex items-center justify-between px-4 py-3 text-sm font-semibold text-gray-700 hover:bg-gray-50 transition-colors">
                <span className="flex items-center gap-2"><Settings2 size={15} /> Timesheet Settings — visible columns</span>
                {tsSettingsOpen ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
              </button>
              {tsSettingsOpen && (
                <div className="px-4 pb-4 pt-1 border-t border-gray-100 grid grid-cols-3 gap-2">
                  {TS_COLS.map(col => (
                    <label key={col.key} className="flex items-center gap-2 cursor-pointer select-none text-sm text-gray-700">
                      <input type="checkbox" className="w-4 h-4 accent-gray-900 cursor-pointer"
                        checked={!!tsSettings[col.key]}
                        onChange={() => toggleTsCol(col.key)} />
                      {col.label}
                    </label>
                  ))}
                </div>
              )}
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
              <button type="button" className="btn-secondary" onClick={closeImport}>Cancel</button>
              <button type="submit" className="btn-primary flex items-center gap-2" disabled={importParsing || !importFile}>
                {importParsing ? 'Parsing…' : <><Search size={15} /> Parse & Preview</>}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {importStage === 'preview' && importPreview && (() => {
        const filtered = importRows.filter(r =>
          !importSearch || r.guard_name.toLowerCase().includes(importSearch.toLowerCase()) || r.lic_number.includes(importSearch)
        );
        const selectedCount = importRows.filter(r => r.included).length;
        const selectedHours = importRows.filter(r => r.included).reduce((s, r) => s + r.total_hours, 0);
        const selectedGross = importRows.filter(r => r.included).reduce((s, r) => s + (r.total_hours * (Number(r.pay_rate) || 0)), 0);
        return (
          <Modal title="Import Preview" onClose={closeImport} size="xl">
            {importError && <p className="text-red-600 text-sm bg-red-50 border border-red-200 rounded-lg px-3 py-2 mb-4">{importError}</p>}

            {/* Summary bar */}
            <div className="grid grid-cols-4 gap-3 mb-4">
              {[
                { label: 'Guards found',    value: importPreview.total_guards },
                { label: 'Total shifts',    value: importPreview.total_shifts },
                { label: 'Total hours',     value: `${importPreview.total_hours.toFixed(1)}h` },
                { label: 'Matched to DB',   value: `${importPreview.matched_guards} / ${importPreview.total_guards}` },
              ].map(s => (
                <div key={s.label} className="bg-gray-50 border border-gray-100 rounded-xl px-4 py-3 text-center">
                  <p className="text-xs text-gray-400 font-medium uppercase tracking-wider mb-0.5">{s.label}</p>
                  <p className="text-gray-900 font-bold text-lg">{s.value}</p>
                </div>
              ))}
            </div>

            {/* Controls row */}
            <div className="flex flex-wrap gap-2 items-center mb-3">
              <div className="relative flex-1 min-w-48">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input placeholder="Search by name or licence #…" className="input pl-8 py-1.5 text-sm"
                  value={importSearch} onChange={e => setImportSearch(e.target.value)} />
              </div>
              <button onClick={() => toggleAllImport(true)} className="text-xs px-3 py-1.5 rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium transition-colors">Select all</button>
              <button onClick={() => toggleAllImport(false)} className="text-xs px-3 py-1.5 rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium transition-colors">Deselect all</button>
              <button onClick={toggleMatchedImport} className="text-xs px-3 py-1.5 rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-700 font-medium transition-colors">Matched only</button>
              <div className="flex items-center gap-1.5 ml-auto">
                <span className="text-xs text-gray-500">Set all rates:</span>
                <div className="relative w-28">
                  <span className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-400 text-xs">$</span>
                  <input type="number" step="0.01" min="0" placeholder="rate" className="input pl-5 py-1.5 text-sm w-full"
                    value={importGlobalRate} onChange={e => setImportGlobalRate(e.target.value)}
                    onBlur={() => { if (importGlobalRate) applyGlobalRate(importGlobalRate); }} />
                </div>
              </div>
            </div>

            {/* Preview table */}
            <div className="border border-gray-200 rounded-xl overflow-hidden mb-4">
              <div className="max-h-80 overflow-y-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 border-b border-gray-200 sticky top-0 z-10">
                    <tr>
                      <th className="table-head w-8 text-center">✓</th>
                      {tsSettings.guard_name && <th className="table-head">Guard Name</th>}
                      {tsSettings.lic        && <th className="table-head">Lic #</th>}
                      {tsSettings.status     && <th className="table-head text-center">Status</th>}
                      {tsSettings.shifts     && <th className="table-head text-right">Shifts</th>}
                      {tsSettings.hours      && <th className="table-head text-right">Hours</th>}
                      {tsSettings.period     && <th className="table-head">Period</th>}
                      {tsSettings.projects   && <th className="table-head">Projects</th>}
                      {tsSettings.rate       && <th className="table-head text-right">Rate ($/hr)</th>}
                      {tsSettings.gross      && <th className="table-head text-right">Est. Gross</th>}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {filtered.map((row, fi) => {
                      const realIdx = importRows.findIndex(r => r.lic_number === row.lic_number);
                      const gross = row.total_hours * (Number(row.pay_rate) || 0);
                      const visibleCols = 1 + Object.values(tsSettings).filter(Boolean).length;
                      return (
                        <tr key={row.lic_number} className={`transition-colors ${row.included ? 'hover:bg-gray-50' : 'opacity-40 bg-gray-50'}`}>
                          <td className="table-cell text-center">
                            <input type="checkbox" className="w-4 h-4 accent-gray-900 cursor-pointer"
                              checked={row.included} onChange={e => updateImportRow(realIdx, 'included', e.target.checked)} />
                          </td>
                          {tsSettings.guard_name && <td className="table-cell font-medium text-gray-900">{row.guard_name}</td>}
                          {tsSettings.lic        && <td className="table-cell font-mono text-gray-500 text-xs">{row.lic_number}</td>}
                          {tsSettings.status     && (
                            <td className="table-cell text-center">
                              {row.matched ? (
                                <span className="inline-flex items-center gap-1 text-xs text-green-700 bg-green-50 border border-green-200 rounded-full px-2 py-0.5">
                                  <CheckCircle2 size={11} /> Matched
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-full px-2 py-0.5">
                                  <Users size={11} /> New
                                </span>
                              )}
                            </td>
                          )}
                          {tsSettings.shifts   && <td className="table-cell text-right text-gray-600">{row.shift_count}</td>}
                          {tsSettings.hours    && <td className="table-cell text-right font-mono">{row.total_hours.toFixed(1)}h</td>}
                          {tsSettings.period   && (
                            <td className="table-cell text-xs text-gray-500">
                              {row.period_start ? row.period_start.slice(5) : '—'} → {row.period_end ? row.period_end.slice(5) : '—'}
                            </td>
                          )}
                          {tsSettings.projects && (
                            <td className="table-cell text-xs text-gray-500">{(row.projects || []).slice(0, 3).join(', ') || '—'}</td>
                          )}
                          {tsSettings.rate && (
                            <td className="table-cell text-right">
                              <div className="relative w-24 ml-auto">
                                <span className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-400 text-xs">$</span>
                                <input type="number" step="0.01" min="0"
                                  className="input pl-4 py-1 text-xs text-right w-full font-mono"
                                  value={row.pay_rate}
                                  onChange={e => updateImportRow(realIdx, 'pay_rate', e.target.value)} />
                              </div>
                            </td>
                          )}
                          {tsSettings.gross && <td className="table-cell text-right font-semibold text-gray-900">${gross.toFixed(2)}</td>}
                        </tr>
                      );
                    })}
                    {filtered.length === 0 && (
                      <tr><td colSpan={1 + Object.values(tsSettings).filter(Boolean).length} className="text-center py-8 text-gray-400 text-sm">No guards match your search.</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Footer summary + action */}
            <div className="bg-gray-900 rounded-xl px-5 py-4 flex items-center justify-between gap-4">
              <div className="flex gap-6">
                <div>
                  <p className="text-gray-400 text-xs uppercase tracking-wider">Selected</p>
                  <p className="text-white font-bold">{selectedCount} guard{selectedCount !== 1 ? 's' : ''}</p>
                </div>
                <div>
                  <p className="text-gray-400 text-xs uppercase tracking-wider">Total Hours</p>
                  <p className="text-white font-bold">{selectedHours.toFixed(1)}h</p>
                </div>
                <div>
                  <p className="text-gray-400 text-xs uppercase tracking-wider">Total Gross</p>
                  <p className="text-white font-bold">${selectedGross.toFixed(2)}</p>
                </div>
              </div>
              <div className="flex gap-3">
                <button className="px-4 py-2 rounded-lg border border-gray-600 text-gray-300 hover:text-white text-sm font-medium transition-colors"
                  onClick={() => setImportStage('upload')}>← Back</button>
                <button
                  onClick={handleBulkCreate}
                  disabled={importCreating || selectedCount === 0}
                  className="px-5 py-2 rounded-lg bg-white text-gray-900 text-sm font-bold hover:bg-gray-100 transition-colors disabled:opacity-50">
                  {importCreating ? 'Creating…' : `Create ${selectedCount} Payroll Record${selectedCount !== 1 ? 's' : ''}`}
                </button>
              </div>
            </div>
          </Modal>
        );
      })()}

      {importStage === 'done' && (
        <Modal title="Import Complete" onClose={closeImport}>
          <div className="text-center py-6 space-y-4">
            <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mx-auto">
              <CheckCircle2 size={36} className="text-green-600" />
            </div>
            <div>
              <p className="text-gray-900 font-bold text-xl">{importResult?.created ?? 0} payroll records created</p>
              <p className="text-gray-500 text-sm mt-1">All entries are in <strong>Submitted</strong> status — review and approve as needed.</p>
            </div>
            <button className="btn-primary mt-4" onClick={closeImport}>Done</button>
          </div>
        </Modal>
      )}

      {calcModal && (() => {
        const filteredCalcGuards = guards.filter(g =>
          !calcGuardSearch || g.full_name?.toLowerCase().includes(calcGuardSearch.toLowerCase())
        );
        const selectedGuard = guards.find(g => g.id === calcGuardId);
        return (
          <Modal title="Calculate Payroll" onClose={() => setCalcModal(false)}>
            <form onSubmit={handleCalculate} className="space-y-4">
              {error && <p className="text-red-600 text-sm bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</p>}

              {/* Mode toggle */}
              <div>
                <label className="label">Scope</label>
                <div className="flex rounded-xl border border-gray-200 overflow-hidden">
                  {[['all', 'All Guards'], ['single', 'Single Guard']].map(([val, label]) => (
                    <button key={val} type="button"
                      onClick={() => { setCalcMode(val); setCalcGuardId(''); setCalcGuardSearch(''); }}
                      className={`flex-1 py-2 text-sm font-medium transition-colors ${calcMode === val ? 'bg-gray-900 text-white' : 'bg-white text-gray-600 hover:bg-gray-50'}`}>
                      {label}
                    </button>
                  ))}
                </div>
                <p className="text-xs text-gray-400 mt-1.5">
                  {calcMode === 'all'
                    ? 'Calculates a payroll entry for every guard from their timeclock records.'
                    : 'Search for one guard and calculate their payroll for the period.'}
                </p>
              </div>

              {/* Single-guard search */}
              {calcMode === 'single' && (
                <div className="relative">
                  <label className="label">Guard</label>
                  {selectedGuard ? (
                    <div className="flex items-center justify-between border border-gray-200 rounded-xl px-4 py-2.5 bg-gray-50">
                      <span className="text-gray-900 font-medium text-sm">{selectedGuard.full_name}</span>
                      <button type="button" onClick={() => { setCalcGuardId(''); setCalcGuardSearch(''); }}
                        className="text-gray-400 hover:text-gray-700 text-xs underline">Change</button>
                    </div>
                  ) : (
                    <div className="relative">
                      <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                      <input
                        type="text"
                        placeholder="Search guard by name…"
                        className="input pl-8"
                        value={calcGuardSearch}
                        onChange={e => setCalcGuardSearch(e.target.value)}
                        autoComplete="off"
                      />
                      {calcGuardSearch && (
                        <div className="absolute z-20 left-0 right-0 top-full mt-1 bg-white border border-gray-200 rounded-xl shadow-lg max-h-48 overflow-y-auto">
                          {filteredCalcGuards.length === 0
                            ? <p className="px-4 py-3 text-sm text-gray-400">No guards found</p>
                            : filteredCalcGuards.map(g => (
                              <button key={g.id} type="button"
                                onClick={() => { setCalcGuardId(g.id); setCalcGuardSearch(''); }}
                                className="w-full text-left px-4 py-2.5 text-sm text-gray-800 hover:bg-gray-50 transition-colors border-b border-gray-100 last:border-0">
                                {g.full_name}
                              </button>
                            ))
                          }
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* Period + rate */}
              <div className="grid grid-cols-2 gap-4">
                <div><label className="label">Period Start</label><input type="date" className="input" value={calcForm.period_start} onChange={fc('period_start')} required /></div>
                <div><label className="label">Period End</label><input type="date" className="input" value={calcForm.period_end} onChange={fc('period_end')} required /></div>
                <div><label className="label">Pay Date <span className="text-gray-400 font-normal">(optional)</span></label><input type="date" className="input" value={calcForm.pay_date} onChange={fc('pay_date')} /></div>
                <div>
                  <label className="label">Hourly Rate ($)</label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">$</span>
                    <input type="number" step="0.01" min="0.01" className="input pl-6" value={calcForm.hourly_rate} onChange={fc('hourly_rate')} required />
                  </div>
                </div>
              </div>

              {/* Progress bar when running all-guards */}
              {calcProgress && (
                <div className="bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 space-y-2">
                  <div className="flex justify-between text-xs text-gray-600 font-medium">
                    <span>Processing guards…</span>
                    <span>{calcProgress.done} / {calcProgress.total}</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div className="bg-blue-600 h-2 rounded-full transition-all duration-200"
                      style={{ width: `${(calcProgress.done / calcProgress.total) * 100}%` }} />
                  </div>
                  {calcProgress.errors > 0 && (
                    <p className="text-xs text-amber-600">{calcProgress.errors} guard{calcProgress.errors !== 1 ? 's' : ''} skipped (no timeclock data)</p>
                  )}
                </div>
              )}

              <div className="flex justify-end gap-3 pt-4 border-t border-gray-100 mt-2">
                <button type="button" className="btn-secondary" onClick={() => setCalcModal(false)}>Cancel</button>
                <button type="submit" className="btn-primary bg-blue-600 hover:bg-blue-700" disabled={saving}>
                  {saving ? (calcMode === 'all' ? 'Calculating…' : 'Calculating…') : 'Calculate Run'}
                </button>
              </div>
            </form>
          </Modal>
        );
      })()}

      {/* ── Recurring Schedules Modal (feature) ── */}
      {features.recurring && recurringModal && (
        <Modal title="Recurring Pay Schedules" onClose={() => setRecurringModal(false)} size="lg">
          <div className="space-y-4">
            <p className="text-sm text-gray-500">Set a pay cadence per guard. Stored locally as a reference when creating entries.</p>
            <div className="space-y-2 max-h-80 overflow-y-auto">
              {guards.map(g => (
                <div key={g.id} className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-gray-900 truncate">{g.full_name}</p>
                    <p className="text-xs text-gray-400 truncate">{g.email}</p>
                  </div>
                  <select className="input py-1.5 text-sm w-44 flex-shrink-0"
                    value={schedules[g.id] || ''}
                    onChange={ev => saveSchedule(g.id, ev.target.value)}>
                    <option value="">— No schedule —</option>
                    <option value="weekly">Weekly</option>
                    <option value="biweekly">Biweekly</option>
                    <option value="semimonthly">Semi-monthly</option>
                    <option value="monthly">Monthly</option>
                  </select>
                  {schedules[g.id] && (
                    <span className="text-xs bg-indigo-100 text-indigo-700 font-semibold px-2.5 py-1 rounded-full capitalize flex-shrink-0">{schedules[g.id]}</span>
                  )}
                </div>
              ))}
            </div>
            <div className="flex justify-end pt-2 border-t border-gray-100">
              <button className="btn-primary" onClick={() => setRecurringModal(false)}>Done</button>
            </div>
          </div>
        </Modal>
      )}

      {/* ── Feature Panel ── */}
      {featurePanelOpen && (
        <PayrollFeaturePanel
          features={features}
          onToggle={toggleFeature}
          onClose={() => setFeaturePanelOpen(false)}
        />
      )}

      {/* ── Entry detail drawer ── */}
      {detailEntry && (() => {
        const de = detailEntry;
        const guard = guardMap[de.user_id];
        const guardName = guard?.full_name || de.guard_name_import || '—';
        const initials = guardName.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
        const hrs  = de.hours_regular ?? de.hours_worked ?? 0;
        const otHrs = de.hours_overtime ?? 0;
        const rate = de.pay_rate ?? de.hourly_rate ?? 0;
        const regGross = hrs * rate;
        const otGross  = otHrs * rate * 1.5;
        const gross = de.gross ?? de.gross_pay ?? (regGross + otGross);
        const deductions = de.deductions || [];
        const totalDed = de.total_deductions ?? deductions.reduce((s, d) => s + (d.amount || 0), 0);
        const net = de.net ?? (gross - totalDed);
        const isUnlinked = de.user_id?.startsWith('ext:');

        // Parse projects from notes if not stored separately
        const projectsFromNotes = de.notes
          ? de.notes.replace(/^Imported from timesheet\s*·?\s*\d+\s*shifts?\s*·?\s*/i, '').replace(/·\s*$/, '').trim()
          : '';

        const STATUS_COLOURS = {
          submitted:    'text-yellow-700',
          under_review: 'text-purple-600',
          approved:     'text-green-600',
          paid:         'text-emerald-700',
          cancelled:    'text-gray-400',
        };
        const statusColour = STATUS_COLOURS[de.status] || 'text-gray-500';

        return (
          <>
            {/* Backdrop */}
            <div className="fixed inset-0 z-40 bg-black/20 backdrop-blur-[1px]"
              onClick={() => setDetailEntry(null)} />

            {/* Drawer */}
            <div className="fixed right-0 top-0 h-full z-50 w-full max-w-md bg-white shadow-2xl flex flex-col overflow-hidden">

              {/* Header */}
              <div className="flex items-start gap-4 px-6 pt-6 pb-5 border-b border-gray-100">
                <div className="w-12 h-12 rounded-full bg-gray-900 flex items-center justify-center text-white font-bold text-lg flex-shrink-0">
                  {initials}
                </div>
                <div className="flex-1 min-w-0">
                  <h2 className="text-lg font-bold text-gray-900 truncate">{guardName}</h2>
                  <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                    {de.lic_number && <span className="text-xs text-gray-400 font-mono">Lic # {de.lic_number}</span>}
                    {isUnlinked && <span className="text-xs text-orange-500 flex items-center gap-1"><UserX size={11} /> No profile</span>}
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${statusColour}`}>
                      {de.status?.replace('_', ' ')}
                    </span>
                  </div>
                </div>
                <button onClick={() => setDetailEntry(null)} className="text-gray-300 hover:text-gray-700 transition-colors mt-0.5">
                  <X size={20} />
                </button>
              </div>

              {/* Scrollable body */}
              <div className="flex-1 overflow-y-auto px-6 py-5 space-y-6">

                {/* Period */}
                <div>
                  <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Period</p>
                  <div className="flex items-center gap-3 text-sm text-gray-700">
                    <span>{de.period_start ? format(parseISO(de.period_start), 'MMM d, yyyy') : '—'}</span>
                    <span className="text-gray-300">→</span>
                    <span>{de.period_end   ? format(parseISO(de.period_end),   'MMM d, yyyy') : '—'}</span>
                  </div>
                  {de.pay_date && (
                    <p className="text-xs text-gray-400 mt-1">
                      Pay date: {format(parseISO(de.pay_date), 'MMM d, yyyy')}
                    </p>
                  )}
                </div>

                {/* Shift dates (timesheet imports) */}
                {de.shift_dates?.length > 0 && (
                  <div>
                    <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">
                      Shifts from timesheet — {de.shift_dates.length} shift{de.shift_dates.length !== 1 ? 's' : ''}
                    </p>
                    <div className="border border-gray-100 rounded-xl overflow-hidden">
                      {de.shift_dates.map((d, i) => (
                        <div key={i} className={`flex items-center justify-between px-4 py-2.5 text-sm ${i % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'}`}>
                          <div className="flex items-center gap-3">
                            <div className="w-7 h-7 rounded-full bg-gray-100 flex items-center justify-center">
                              <span className="text-xs font-semibold text-gray-500">{i + 1}</span>
                            </div>
                            <span className="text-gray-800 font-medium">
                              {format(parseISO(d), 'EEE, MMM d yyyy')}
                            </span>
                          </div>
                          <span className="text-xs text-gray-400 font-mono">
                            ~{(hrs / de.shift_dates.length).toFixed(1)}h
                          </span>
                        </div>
                      ))}
                    </div>
                    {projectsFromNotes && (
                      <p className="text-xs text-gray-400 mt-2 flex items-center gap-1">
                        <span className="font-medium text-gray-500">Projects:</span> {projectsFromNotes}
                      </p>
                    )}
                  </div>
                )}

                {/* If no shift_dates but has shift_count from notes */}
                {!de.shift_dates?.length && de.notes?.includes('shift') && (
                  <div>
                    <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Timesheet summary</p>
                    <p className="text-sm text-gray-600 bg-gray-50 rounded-xl px-4 py-3">{de.notes}</p>
                  </div>
                )}

                {/* Pay breakdown */}
                <div>
                  <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Pay breakdown</p>
                  <div className="border border-gray-100 rounded-xl overflow-hidden text-sm">
                    {/* Regular */}
                    <div className="flex items-center justify-between px-4 py-3 border-b border-gray-50">
                      <span className="text-gray-600">Regular hours</span>
                      <div className="text-right">
                        <span className="text-gray-400 text-xs mr-2">{hrs.toFixed(1)}h × ${rate.toFixed(2)}/hr</span>
                        <span className="text-gray-900 font-medium">${regGross.toFixed(2)}</span>
                      </div>
                    </div>
                    {/* Overtime */}
                    {otHrs > 0 && (
                      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-50">
                        <span className="text-gray-600">Overtime hours</span>
                        <div className="text-right">
                          <span className="text-gray-400 text-xs mr-2">{otHrs.toFixed(1)}h × ${(rate * 1.5).toFixed(2)}/hr</span>
                          <span className="text-gray-900 font-medium">${otGross.toFixed(2)}</span>
                        </div>
                      </div>
                    )}
                    {/* Gross */}
                    <div className="flex items-center justify-between px-4 py-3 bg-gray-50 border-b border-gray-100">
                      <span className="text-gray-700 font-medium">Gross pay</span>
                      <span className="text-gray-900 font-semibold">${gross.toFixed(2)}</span>
                    </div>
                    {/* Deductions */}
                    {deductions.length > 0 ? deductions.map((d, i) => (
                      <div key={i} className="flex items-center justify-between px-4 py-3 border-b border-gray-50">
                        <span className="text-gray-500">{d.label || 'Deduction'}</span>
                        <span className="text-red-500 font-medium">−${(d.amount || 0).toFixed(2)}</span>
                      </div>
                    )) : totalDed > 0 ? (
                      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-50">
                        <span className="text-gray-500">Deductions</span>
                        <span className="text-red-500 font-medium">−${totalDed.toFixed(2)}</span>
                      </div>
                    ) : (
                      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-50">
                        <span className="text-gray-400 text-xs">No deductions</span>
                        <span className="text-gray-300 text-xs">—</span>
                      </div>
                    )}
                    {/* Net */}
                    <div className="flex items-center justify-between px-4 py-3.5 bg-gray-900">
                      <span className="text-white font-semibold">Net pay</span>
                      <span className="text-white font-bold text-base">${net.toFixed(2)}</span>
                    </div>
                  </div>
                </div>

                {/* Notes */}
                {de.notes && !de.notes.includes('Imported from timesheet') && (
                  <div>
                    <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Notes</p>
                    <p className="text-sm text-gray-600 bg-gray-50 rounded-xl px-4 py-3 leading-relaxed">{de.notes}</p>
                  </div>
                )}
              </div>

              {/* Footer actions */}
              <div className="px-6 py-4 border-t border-gray-100 flex items-center gap-3">
                <button onClick={() => { setDetailEntry(null); openEdit(de); }}
                  className="flex-1 flex items-center justify-center gap-2 btn-secondary text-sm">
                  <Edit2 size={14} /> Edit entry
                </button>
                {isUnlinked && (
                  <button onClick={() => { setDetailEntry(null); openLink(de); }}
                    className="flex-1 flex items-center justify-center gap-2 text-sm px-4 py-2 rounded-lg border border-orange-200 text-orange-700 bg-orange-50 hover:bg-orange-100 transition-colors font-medium">
                    <Link2 size={14} /> Link to guard
                  </button>
                )}
              </div>
            </div>
          </>
        );
      })()}
    </div>
  );
}
