
import {
  BrowserRouter,
  Navigate,
  Route,
  Routes,
} from "react-router";

// Layout and authentication
import Layout from "../components/Layout/Layout";
import ProtectedRoute from "../components/auth/ProtectedRoute";

// General pages
import Login from "../pages/Login";
import Dashboard from "../pages/Dashboard";
import ProfilePage from "../pages/ProfilePage";

// Aircraft pages
import AircraftList from "../pages/aircraft/AircraftList";
import AircraftDetails from "../pages/aircraft/AircraftDetails";
import AircraftFormPage from "../pages/aircraft/AircraftFormPage";

// Maintenance pages
import MaintenanceReports from "../pages/maintenance/MaintenanceReports";
import MaintenanceReportForm from "../pages/maintenance/MaintenanceReportForm";
import MaintenanceReportDetails from "../pages/maintenance/MaintenanceReportDetails";

// Inspections pages
import Inspections from "../pages/inspections/Inspections";
import InspectionForm from "../pages/inspections/InspectionForm";

// Users Management
import UsersPage from "../pages/users/UsersPage";

export default function AppRoutes() {
  return (
    <BrowserRouter>
      <Routes>
        {/* ====================================
            PUBLIC ROUTES
        ==================================== */}

        <Route
          path="/login"
          element={<Login />}
        />

        {/* ====================================
            PROTECTED APPLICATION
        ==================================== */}

        <Route
          path="/app"
          element={
            <ProtectedRoute>
              <Layout />
            </ProtectedRoute>
          }
        >
          {/* DEFAULT REDIRECT */}
          <Route
            index
            element={
              <Navigate to="/app/dashboard" replace />
            }
          />

          {/* ====================================
              DASHBOARD
          ==================================== */}

          <Route
            path="dashboard"
            element={<Dashboard />}
          />

          {/* ====================================
              PROFILE
              All authenticated users
          ==================================== */}

          <Route
            path="profile"
            element={<ProfilePage />}
          />

          {/* ====================================
              AIRCRAFT
          ==================================== */}

          {/* Aircraft List */}
          <Route
            path="aircraft"
            element={<AircraftList />}
          />

          {/* Create Aircraft - Admin Only */}
          <Route
            path="aircraft/new"
            element={
              <ProtectedRoute allowedRoles={["admin"]}>
                <AircraftFormPage mode="create" />
              </ProtectedRoute>
            }
          />

          {/* Edit Aircraft - Admin Only */}
          <Route
            path="aircraft/:aircraftId/edit"
            element={
              <ProtectedRoute allowedRoles={["admin"]}>
                <AircraftFormPage mode="edit" />
              </ProtectedRoute>
            }
          />

          {/* Aircraft Details */}
          <Route
            path="aircraft/:aircraftId"
            element={<AircraftDetails />}
          />

          {/* ====================================
              MAINTENANCE
          ==================================== */}

          {/* Maintenance Reports List */}
          <Route
            path="maintenance"
            element={<MaintenanceReports />}
          />

          {/* Create Maintenance Report */}
          <Route
            path="maintenance/new"
            element={<MaintenanceReportForm />}
          />

          {/* Maintenance Report Details */}
          <Route
            path="maintenance/:reportId"
            element={<MaintenanceReportDetails />}
          />

          {/* ====================================
              INSPECTIONS
          ==================================== */}

          {/* Inspections List */}
          <Route
            path="inspections"
            element={<Inspections />}
          />

          {/* Create Inspection */}
          <Route
            path="inspections/new"
            element={<InspectionForm />}
          />

          {/* ====================================
              USERS MANAGEMENT
          ==================================== */}

          <Route
            path="users"
            element={
              <ProtectedRoute
                allowedRoles={[
                  "admin",
                  "hangar_manager",
                  "team_lead",
                ]}
              >
                <UsersPage />
              </ProtectedRoute>
            }
          />
        </Route>

        {/* ====================================
            REDIRECTS
        ==================================== */}

        {/* Root URL */}
        <Route
          path="/"
          element={
            <Navigate to="/app/dashboard" replace />
          }
        />

        {/* Unknown URLs */}
        <Route
          path="*"
          element={
            <Navigate to="/app/dashboard" replace />
          }
        />
      </Routes>
    </BrowserRouter>
  );
}
