import { Outlet } from "react-router";
import Header from "./Header";
import "./layout.css";

function Layout() {
  return (
    <div className="app-shell">
      <Header />

      <main className="app-main">
        <Outlet />
      </main>

      <footer className="app-footer">
        <p>HangarManager</p>
        <span>Aircraft Fleet Management System</span>
      </footer>
    </div>
  );
}

export default Layout;