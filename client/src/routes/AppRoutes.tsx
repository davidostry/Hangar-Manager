
import {
  BrowserRouter,
  Navigate,
  Route,
  Routes,
} from "react-router";

import Layout from "../components/Layout/Layout";
import ProtectedRoute from "../components/auth/ProtectedRoute";

import Dashboard from "../pages/Dashboard";
import Login from "../pages/Login";

import AircraftList from "../pages/aircraft/AircraftList";
import AircraftDetails from "../pages/aircraft/AircraftDetails";
import AircraftFormPage from "../pages/aircraft/AircraftFormPage";

import MaintenanceReports from "../pages/maintenance/MaintenanceReports";
import MaintenanceReportForm from "../pages/maintenance/MaintenanceReportForm";
import MaintenanceReportDetails from "../pages/maintenance/MaintenanceReportDetails";

import Inspections from "../pages/inspections/Inspections";
import InspectionForm from "../pages/inspections/InspectionForm";

// Users Management
import UsersPage from "../pages/users/UsersPage";

function AppRoutes() {
  return (
    <BrowserRouter>
      <Routes>

        {/* ========================================
            PUBLIC ROUTES
        ======================================== */}

        <Route
          path="/login"
          element={<Login />}
        />

        {/* ========================================
            PROTECTED APP
        ======================================== */}

        <Route
          path="/app"
          element={
            <ProtectedRoute>
              <Layout />
            </ProtectedRoute>
          }
        >

          <Route
            index
            element={
              <Navigate
                to="/app/dashboard"
                replace
              />
            }
          />

          {/* Dashboard */}
          <Route
            path="dashboard"
            element={<Dashboard />}
          />

          {/* ========================================
              AIRCRAFT
          ======================================== */}

          <Route
            path="aircraft"
            element={<AircraftList />}
          />

          <Route
            path="aircraft/new"
            element={
              <ProtectedRoute allowedRoles={["admin", "hangar_manager"]}>
                <AircraftFormPage mode="create" />
              </ProtectedRoute>
            }
          />

          <Route
            path="aircraft/:aircraftId/edit"
            element={
              <ProtectedRoute allowedRoles={["admin", "hangar_manager"]}>
                <AircraftFormPage mode="edit" />
              </ProtectedRoute>
            }
          />

          <Route
            path="aircraft/:aircraftId"
            element={<AircraftDetails />}
          />

          {/* ========================================
              MAINTENANCE
          ======================================== */}

          <Route
            path="maintenance"
            element={<MaintenanceReports />}
          />

          <Route
            path="maintenance/new"
            element={<MaintenanceReportForm />}
          />

          <Route
            path="maintenance/:reportId"
            element={<MaintenanceReportDetails />}
          />

          {/* ========================================
              INSPECTIONS
          ======================================== */}

          <Route
            path="inspections"
            element={<Inspections />}
          />

          <Route
            path="inspections/new"
            element={
              <ProtectedRoute allowedRoles={["admin", "hangar_manager"]}>
                <InspectionForm />
              </ProtectedRoute>
            }
          />

          {/* ========================================
              USERS MANAGEMENT
          ======================================== */}

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

        {/* ========================================
            REDIRECTS
        ======================================== */}

        <Route
          path="/"
          element={
            <Navigate
              to="/app/dashboard"
              replace
            />
          }
        />

        <Route
          path="*"
          element={
            <Navigate
              to="/app/dashboard"
              replace
            />
          }
        />

      </Routes>
    </BrowserRouter>
  );
}

export default AppRoutes;
