import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import AppLayout from './components/layout/AppLayout';
import Dashboard from './pages/Dashboard';
import Login from './pages/Login';
import Projects from './pages/Projects';
import ProjectDetail from './pages/ProjectDetail';
import Help from './pages/Help';
import HelpTopic from './pages/HelpTopic';
import AdminLayout from './pages/admin/AdminLayout';
import AdminDashboard from './pages/admin/AdminDashboard';
import UserManagement from './pages/admin/UserManagement';
import ResourceLibrary from './pages/admin/ResourceLibrary';
import SupplierManagement from './pages/admin/SupplierManagement';
import ConfigTables from './pages/admin/ConfigTables';
import AuditLogs from './pages/admin/AuditLogs';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route element={<AppLayout />}>
          <Route path="/" element={<Dashboard />} />
          <Route path="/projects" element={<Projects />} />
          <Route path="/projects/:id" element={<ProjectDetail />} />
          <Route path="/help" element={<Help />} />
          <Route path="/help/:id" element={<HelpTopic />} />
        </Route>
        <Route path="/admin" element={<AdminLayout />}>
          <Route index element={<AdminDashboard />} />
          <Route path="users" element={<UserManagement />} />
          <Route path="resources" element={<ResourceLibrary />} />
          <Route path="suppliers" element={<SupplierManagement />} />
          <Route path="config" element={<ConfigTables />} />
          <Route path="audit-logs" element={<AuditLogs />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;
