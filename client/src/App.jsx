import React from 'react'
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import Home from './pages/Home'
import HowToUse from './pages/HowToUse'
import Features from './pages/Features'
import Pricing from './pages/Pricing'
import SignIn from './pages/SignIn'
import SignUp from './pages/SignUp'
import ProtectedRoute from './components/auth/ProtectedRoute'
import AdminRoute from './components/auth/AdminRoute'
import './index.css'
import './styles.css'
import './landing.css'
import './dashboard.css'
import './dashboard-external.css'
import './custom-theme.css'
import './email-ui-fix.css'

import DashboardLayout from './components/layout/DashboardLayout'
import EmailView from './pages/dashboard/EmailView'
import EmployeesView from './pages/dashboard/EmployeesView'
import ClientsView from './pages/dashboard/ClientsView'
import ProjectsView from './pages/dashboard/ProjectsView'
import AdminsView from './pages/dashboard/AdminsView'
import EmailIdsView from './pages/dashboard/EmailIdsView'
import TasksView from './pages/dashboard/TasksView'
import SubscriptionView from './pages/dashboard/SubscriptionView'

import { UIProvider } from './context/UIContext'

function App() {
  return (
    <UIProvider>
      <Router>
        <Routes>
          {/* Marketing / Public Landing Pages */}
          <Route path="/" element={<Home />} />
          <Route path="/home" element={<Home />} />
          <Route path="/how-to-use" element={<HowToUse />} />
          <Route path="/features" element={<Features />} />
          <Route path="/pricing" element={<Pricing />} />

          {/* Auth Pages */}
          <Route path="/signin" element={<SignIn />} />
          <Route path="/signup" element={<SignUp />} />

          {/* Protected Dashboard Routes */}
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute>
                <DashboardLayout />
              </ProtectedRoute>
            }
          >
            <Route index element={<Navigate to="email/inbox" replace />} />
            <Route path="email/:folder" element={<EmailView />} />
            <Route path="employees" element={<AdminRoute><EmployeesView /></AdminRoute>} />
            <Route path="clients" element={<AdminRoute><ClientsView /></AdminRoute>} />
            <Route path="projects" element={<ProjectsView />} />
            <Route path="admins" element={<AdminRoute><AdminsView /></AdminRoute>} />
            <Route path="emailIds" element={<AdminRoute><EmailIdsView /></AdminRoute>} />
            <Route path="tasks" element={<TasksView />} />
            <Route path="subscription" element={<AdminRoute><SubscriptionView /></AdminRoute>} />
          </Route>

          {/* Fallback */}
          <Route path="*" element={<Navigate to="/signin" replace />} />
        </Routes>
      </Router>
    </UIProvider>
  )
}

export default App
