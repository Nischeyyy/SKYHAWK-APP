import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Login from './pages/Login.jsx';
import Layout from './components/Layout.jsx';
import Dashboard from './pages/Dashboard.jsx';
import Guards from './pages/Guards.jsx';
import Sites from './pages/Sites.jsx';
import Shifts from './pages/Shifts.jsx';
import OpenShifts from './pages/OpenShifts.jsx';
import ShiftSwaps from './pages/ShiftSwaps.jsx';
import Timeclock from './pages/Timeclock.jsx';
import Incidents from './pages/Incidents.jsx';
import SosAlerts from './pages/SosAlerts.jsx';
import Payroll from './pages/Payroll.jsx';
import Announcements from './pages/Announcements.jsx';
import Compliance from './pages/Compliance.jsx';
import LiveLocations from './pages/LiveLocations.jsx';

// Pathless layout wrapper — only protects its children, doesn't compete with "/"
function ProtectedLayout() {
  const token = localStorage.getItem('mgr_token');
  if (!token) return <Navigate to="/" replace />;
  return <Layout />;
}

export default function App() {
  return (
    <BrowserRouter basename="/manager">
      <Routes>
        {/* Public */}
        <Route path="/" element={<Login />} />

        {/* Protected — pathless layout route, children define their own paths */}
        <Route element={<ProtectedLayout />}>
          <Route path="dashboard"    element={<Dashboard />} />
          <Route path="guards"       element={<Guards />} />
          <Route path="sites"        element={<Sites />} />
          <Route path="shifts"       element={<Shifts />} />
          <Route path="open-shifts"  element={<OpenShifts />} />
          <Route path="swaps"        element={<ShiftSwaps />} />
          <Route path="timeclock"    element={<Timeclock />} />
          <Route path="incidents"    element={<Incidents />} />
          <Route path="sos"          element={<SosAlerts />} />
          <Route path="payroll"      element={<Payroll />} />
          <Route path="announcements" element={<Announcements />} />
          <Route path="compliance"   element={<Compliance />} />
          <Route path="live"         element={<LiveLocations />} />
        </Route>

        {/* Catch-all redirect */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
