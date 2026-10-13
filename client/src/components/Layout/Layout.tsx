
import { Outlet } from "react-router";
import Sidebar from "./Sidebar";

import "./layout.css";
import "./sidebar.css";

function Layout() {
  return (
    <div className="app-shell app-shell--sidebar">
      <Sidebar />

      <div className="app-workspace">
        <main className="app-main">
          <Outlet />
        </main>

        <footer className="app-footer">
          <p>HangarManager</p>
          <span>
            Aircraft Fleet Management System · © 2026
            HangarManager. All rights reserved.
          </span>
        </footer>
      </div>
    </div>
  );
}

export default Layout;
