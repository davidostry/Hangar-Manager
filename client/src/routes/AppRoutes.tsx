import {
  BrowserRouter,
  Navigate,
  Route,
  Routes,
} from "react-router";

import Layout from "../components/layout/Layout";
import Dashboard from "../pages/Dashboard";
import Login from "../pages/Login";
import PlaceholderPage from "../pages/PlaceHolderPage"

function AppRoutes() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login />} />

        <Route path="/app" element={<Layout />}>
          <Route
            index
            element={<Navigate to="/app/dashboard" replace />}
          />

          <Route
            path="dashboard"
            element={<Dashboard />}
          />

          <Route
            path="aircraft"
            element={<PlaceholderPage title="Aircraft" />}
          />

          <Route
            path="maintenance"
            element={
              <PlaceholderPage title="Maintenance Reports" />
            }
          />

          <Route
            path="inspections"
            element={<PlaceholderPage title="Inspections" />}
          />
        </Route>

        <Route
          path="/"
          element={<Navigate to="/app/dashboard" replace />}
        />

        <Route
          path="*"
          element={<Navigate to="/app/dashboard" replace />}
        />
      </Routes>
    </BrowserRouter>
  );
}

export default AppRoutes;