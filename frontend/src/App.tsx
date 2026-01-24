import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import AppLayout from './components/layout/AppLayout';
import Dashboard from './pages/Dashboard';
import Login from './pages/Login';
import Projects from './pages/Projects';
import Help from './pages/Help';
import HelpTopic from './pages/HelpTopic';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route element={<AppLayout />}>
          <Route path="/" element={<Dashboard />} />
          <Route path="/projects" element={<Projects />} />
          <Route path="/help" element={<Help />} />
          <Route path="/help/:id" element={<HelpTopic />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;
