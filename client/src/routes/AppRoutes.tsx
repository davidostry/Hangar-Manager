import {
  BrowserRouter,
  Navigate,
  Route,
  Routes,
} from "react-router";

import Layout from "../components/layout/Layout";
import ProtectedRoute from "../components/auth/ProtectedRoute";

import Dashboard from "../pages/Dashboard";
import Login from "../pages/Login";
import PlaceholderPage from "../pages/PlaceholderPage";
import AircraftList from "../pages/aircraft/AircraftList";
import MaintenanceReports from "../pages/maintenance/MaintenanceReports";
import MaintenanceReportDetails from "../pages/maintenance/MaintenanceReportDetails";

function AppRoutes() {
  return (
    <BrowserRouter>
      <Routes>
        <Route
          path="/login"
          element={<Login />}
        />

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

          <Route
            path="dashboard"
            element={<Dashboard />}
          />

          <Route
            path="aircraft"
            element={<AircraftList />}
          />

          <Route
            path="maintenance"
            element={<MaintenanceReports />}
          />

          <Route
            path="maintenance/:reportId"
            element={<MaintenanceReportDetails />}
          />

          <Route
            path="inspections"
            element={
              <PlaceholderPage title="Inspections" />
            }
          />
        </Route>

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