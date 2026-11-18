import React, { Suspense } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import { LinearProgress } from '@mui/material';
import AppLayout from '../components/layout/AppLayout';
import { RequireAuth, RequireRole } from '../auth/RequireAuth';

const Login = React.lazy(() => import('../pages/Login'));
const Dashboard = React.lazy(() => import('../pages/Dashboard'));
const Projects = React.lazy(() => import('../pages/Projects'));
const ProjectDetail = React.lazy(() => import('../pages/ProjectDetail'));
const Reports = React.lazy(() => import('../pages/Reports'));
const Help = React.lazy(() => import('../pages/Help'));
const HelpTopic = React.lazy(() => import('../pages/HelpTopic'));
const NotFound = React.lazy(() => import('../pages/NotFound'));
const AdminDashboard = React.lazy(() => import('../pages/admin/AdminDashboard'));
const UserManagement = React.lazy(() => import('../pages/admin/UserManagement'));
const ResourceLibrary = React.lazy(() => import('../pages/admin/ResourceLibrary'));
const SupplierManagement = React.lazy(() => import('../pages/admin/SupplierManagement'));
const ConfigTables = React.lazy(() => import('../pages/admin/ConfigTables'));
const AuditLogs = React.lazy(() => import('../pages/admin/AuditLogs'));

// Pages inside AppLayout show their own progress bar under the header; this covers the login route.
const TopProgress = <LinearProgress aria-label="Loading" sx={{ position: 'fixed', top: 0, left: 0, right: 0 }} />;

export const AppRoutes: React.FC = () => (
  <Suspense fallback={TopProgress}>
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route element={<RequireAuth />}>
        <Route element={<AppLayout />}>
          <Route path="/" element={<Dashboard />} />
          <Route path="/projects" element={<Projects />} />
          <Route path="/projects/:id" element={<ProjectDetail />} />
          <Route path="/reports" element={<Reports />} />
          <Route path="/help" element={<Help />} />
          <Route path="/help/:id" element={<HelpTopic />} />
          <Route path="/admin" element={<RequireRole role={['admin', 'manager']} />}>
            <Route index element={<AdminDashboard />} />
            <Route path="users" element={<UserManagement />} />
            <Route path="resources" element={<ResourceLibrary />} />
            <Route path="suppliers" element={<SupplierManagement />} />
            <Route path="config" element={<ConfigTables />} />
            <Route path="audit-logs" element={<RequireRole role="admin" />}>
              <Route index element={<AuditLogs />} />
            </Route>
          </Route>
          <Route path="*" element={<NotFound />} />
        </Route>
      </Route>
      <Route path="/index.html" element={<Navigate to="/" replace />} />
    </Routes>
  </Suspense>
);

export default AppRoutes;
