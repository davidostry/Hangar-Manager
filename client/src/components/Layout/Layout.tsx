
import { Outlet } from "react-router";
import Header from "./Header";
import "./layout.css";

function Layout() {
  const currentYear = new Date().getFullYear();

  return (
    <div className="app-shell">
      <Header />

      <main className="app-main">
        <Outlet />
      </main>

      <footer className="app-footer">
        <p>
          © {currentYear} HangarManager. All rights reserved.
        </p>

        <span>Aircraft Fleet Management System</span>
      </footer>
    </div>
  );
}

export default Layout;
