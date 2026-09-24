import {
  BrowserRouter,
  Navigate,
  Route,
  Routes,
} from "react-router-dom"

import Home from "@/pages/Home"
import SignIn from "@/pages/SignIn"
import SignedOut from "@/pages/SignedOut"
import Verifying from "@/pages/Verifying"
import Dashboard from "@/pages/Dashboard"
import Admin from "@/pages/Admin"
import NotificationsPage from "@/pages/Notifications"
import PermissionsPage from "@/pages/admin/permissions"


import ActivityDashboard from "@/pages/activity/dashboard"
import ActivityMasterAudit from "@/pages/activity/masteraudit"
import ActivityAuditFaliures from "@/pages/activity/auditfaliures"

import RosterImport from "@/pages/activity/imports/roster"
import DepartmentImport from "@/pages/activity/imports/department"
import SWATImport from "@/pages/activity/imports/swat"
import MTF7Import from "@/pages/activity/imports/mtf-7"
import MCDImport from "@/pages/activity/imports/mcd"
import TRUImport from "@/pages/activity/imports/tru"
import TEUImport from "@/pages/activity/imports/teu"
import SARImport from "@/pages/activity/imports/sar"

import DepartmentRequirements from "@/pages/activity/requirements/department"
import SWATRequirements from "@/pages/activity/requirements/swat"
import MTF7Requirements from "@/pages/activity/requirements/mtf-7"
import MCDRequirements from "@/pages/activity/requirements/mcd"
import TRURequirements from "@/pages/activity/requirements/tru"
import TEURequirements from "@/pages/activity/requirements/teu"
import SARRequirements from "@/pages/activity/requirements/sar"

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route
          path="/"
          element={<Home />}
        />
        <Route
          path="/sign-in"
          element={<SignIn />}
        />
        <Route
          path="/signed-out"
          element={<SignedOut />}
        />
        <Route
          path="/verifying"
          element={<Verifying />}
        />
        <Route
          path="/dashboard"
          element={<Dashboard />}
        />


        <Route
          path="/activity/dashboard"
          element={<ActivityDashboard />}
        />
        <Route
          path="/activity/masteraudit"
          element={<ActivityMasterAudit />}
        />
        <Route
          path="/activity/auditfaliures"
          element={<ActivityAuditFaliures />}
        />


        <Route
          path="/activity/imports/roster"
          element={<RosterImport />}
        />
        <Route
          path="/activity/imports/department"
          element={<DepartmentImport />}
        />
        <Route
          path="/activity/imports/swat"
          element={<SWATImport />}
        />
        <Route
          path="/activity/imports/mtf-7"
          element={<MTF7Import />}
        />
        <Route
          path="/activity/imports/mcd"
          element={<MCDImport />}
        />
        <Route
          path="/activity/imports/tru"
          element={<TRUImport />}
        />
        <Route
          path="/activity/imports/teu"
          element={<TEUImport />}
        />
        <Route
          path="/activity/imports/sar"
          element={<SARImport />}
        />


        <Route
          path="/activity/requirements/department"
          element={<DepartmentRequirements />}
        />
        <Route
          path="/activity/requirements/swat"
          element={<SWATRequirements />}
        />
        <Route
          path="/activity/requirements/mtf-7"
          element={<MTF7Requirements />}
        />
        <Route
          path="/activity/requirements/mcd"
          element={<MCDRequirements />}
        />
        <Route
          path="/activity/requirements/tru"
          element={<TRURequirements />}
        />
        <Route
          path="/activity/requirements/teu"
          element={<TEURequirements />}
        />
        <Route
          path="/activity/requirements/sar"
          element={<SARRequirements />}
        />


        <Route
          path="/admin"
          element={<Admin />}
        />
        <Route
          path="/admin/permissions"
          element={<PermissionsPage />}
        />
        <Route
          path="*"
          element={
            <Navigate
              to="/"
              replace
            />
          }
        />
        <Route
          path="/notifications"
          element={<NotificationsPage />}
        />
      </Routes>
    </BrowserRouter>
  )
}