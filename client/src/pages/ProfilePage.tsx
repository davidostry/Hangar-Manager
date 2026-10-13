import { Link } from "react-router";
import {
  ArrowLeft,
  ArrowRight,
  BadgeCheck,
  ClipboardCheck,
  IdCard,
  LayoutDashboard,
  Mail,
  Plane,
  ShieldCheck,
  UserRound,
  UsersRound,
  Wrench,
} from "lucide-react";

import { useAuth } from "../context/AuthContext";
import type { UserRole } from "../types/auth";

import "./ProfilePage.css";

const ROLE_LABELS: Record<UserRole, string> = {
  admin: "Administrator",
  hangar_manager: "Hangar Manager",
  team_lead: "Team Lead",
  technician: "Technician",
};

const ROLE_DESCRIPTIONS: Record<UserRole, string> = {
  admin: "Your account has the Administrator role.",
  hangar_manager: "Your account has the Hangar Manager role.",
  team_lead: "Your account has the Team Lead role.",
  technician: "Your account has the Technician role.",
};

function getInitials(name: string): string {
  const initials = name
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part.charAt(0))
    .join("")
    .toUpperCase();

  return initials || "U";
}

export default function ProfilePage() {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <section className="hm-profile-page">
        <div className="hm-profile-feedback" role="status">
          <span className="hm-profile-loading-spinner" aria-hidden="true" />
          <p>Loading your profile...</p>
        </div>
      </section>
    );
  }

  if (!user) {
    return (
      <section className="hm-profile-page">
        <div className="hm-profile-feedback">
          <UserRound size={32} aria-hidden="true" />
          <h1>Session unavailable</h1>
          <p>Sign in to view your account details.</p>
          <Link to="/login" className="hm-profile-primary-link">
            Go to sign in <ArrowRight size={18} aria-hidden="true" />
          </Link>
        </div>
      </section>
    );
  }

  const canViewUsers =
    user.role === "admin" ||
    user.role === "hangar_manager" ||
    user.role === "team_lead";

  const roleLabel = ROLE_LABELS[user.role];

  return (
    <section className="hm-profile-page" aria-labelledby="hm-profile-title">
      <Link to="/app/dashboard" className="hm-profile-back-link">
        <ArrowLeft size={17} aria-hidden="true" />
        Back to Dashboard
      </Link>

      <header className="hm-profile-hero">
        <div className="hm-profile-hero-decor" aria-hidden="true">
          <UserRound size={230} strokeWidth={0.7} />
        </div>

        <div className="hm-profile-kicker">
          <span className="hm-profile-kicker-dot" aria-hidden="true" />
          WORKSPACE / ACCOUNT OVERVIEW
        </div>

        <p className="hm-profile-overline">PERSONAL WORKSPACE</p>
        <h1 id="hm-profile-title">My Profile</h1>
        <p className="hm-profile-hero-description">
          Your account details and access to HangarManager.
        </p>

        <div className="hm-profile-hero-identity">
          <div className="hm-profile-avatar" aria-hidden="true">
            {getInitials(user.display_name || user.email)}
          </div>
          <div className="hm-profile-identity-text">
            <strong>{user.display_name || user.email}</strong>
            <span>{user.email}</span>
          </div>
          <span className="hm-profile-hero-role">
            <BadgeCheck size={17} aria-hidden="true" />
            {roleLabel}
          </span>
        </div>
      </header>

      <div className="hm-profile-main-grid">
        <section className="hm-profile-panel" aria-labelledby="hm-profile-info-heading">
          <div className="hm-profile-panel-heading">
            <span className="hm-profile-heading-icon">
              <IdCard size={23} aria-hidden="true" />
            </span>
            <div>
              <span className="hm-profile-section-kicker">ACCOUNT RECORD</span>
              <h2 id="hm-profile-info-heading">Personal Information</h2>
              <p>Details from your authenticated account.</p>
            </div>
          </div>

          <dl className="hm-profile-field-grid">
            <div className="hm-profile-field">
              <dt><UserRound size={17} aria-hidden="true" /> Display Name</dt>
              <dd>{user.display_name || "Not provided"}</dd>
            </div>
            <div className="hm-profile-field">
              <dt><Mail size={17} aria-hidden="true" /> Email Address</dt>
              <dd>{user.email}</dd>
            </div>
            <div className="hm-profile-field">
              <dt><ShieldCheck size={17} aria-hidden="true" /> Assigned Role</dt>
              <dd>{roleLabel}</dd>
            </div>
            <div className="hm-profile-field">
              <dt><IdCard size={17} aria-hidden="true" /> Account ID</dt>
              <dd className="hm-profile-identifier">{user.id}</dd>
            </div>
          </dl>
        </section>

        <aside className="hm-profile-panel hm-profile-access-panel" aria-labelledby="hm-profile-access-heading">
          <div className="hm-profile-panel-heading">
            <span className="hm-profile-heading-icon hm-profile-heading-icon-teal">
              <ShieldCheck size={23} aria-hidden="true" />
            </span>
            <div>
              <span className="hm-profile-section-kicker">WORKSPACE ACCESS</span>
              <h2 id="hm-profile-access-heading">Account &amp; Access</h2>
              <p>Current session and assigned role.</p>
            </div>
          </div>

          <div className="hm-profile-access-status">
            <span className="hm-profile-access-dot" aria-hidden="true" />
            <div>
              <strong>Signed in</strong>
              <span>Your session is currently authenticated.</span>
            </div>
          </div>

          <div className="hm-profile-role-card">
            <span>YOUR ROLE</span>
            <strong>{roleLabel}</strong>
            <p>{ROLE_DESCRIPTIONS[user.role]}</p>
          </div>

          <p className="hm-profile-admin-hint">
            Account changes and role assignments are managed through your organization's administration process.
          </p>
        </aside>
      </div>

      <section className="hm-profile-panel hm-profile-workspace-panel" aria-labelledby="hm-profile-workspace-heading">
        <div className="hm-profile-panel-heading">
          <span className="hm-profile-heading-icon">
            <LayoutDashboard size={23} aria-hidden="true" />
          </span>
          <div>
            <span className="hm-profile-section-kicker">QUICK NAVIGATION</span>
            <h2 id="hm-profile-workspace-heading">Your Workspace</h2>
            <p>Go directly to the tools you use in HangarManager.</p>
          </div>
        </div>

        <div className="hm-profile-shortcuts">
          <Link to="/app/dashboard" className="hm-profile-shortcut">
            <LayoutDashboard size={21} aria-hidden="true" />
            <span>Dashboard</span>
            <ArrowRight size={17} aria-hidden="true" />
          </Link>
          <Link to="/app/aircraft" className="hm-profile-shortcut">
            <Plane size={21} aria-hidden="true" />
            <span>Aircraft</span>
            <ArrowRight size={17} aria-hidden="true" />
          </Link>
          <Link to="/app/maintenance" className="hm-profile-shortcut">
            <Wrench size={21} aria-hidden="true" />
            <span>Maintenance</span>
            <ArrowRight size={17} aria-hidden="true" />
          </Link>
          <Link to="/app/inspections" className="hm-profile-shortcut">
            <ClipboardCheck size={21} aria-hidden="true" />
            <span>Inspections</span>
            <ArrowRight size={17} aria-hidden="true" />
          </Link>
          {canViewUsers && (
            <Link to="/app/users" className="hm-profile-shortcut">
              <UsersRound size={21} aria-hidden="true" />
              <span>Users</span>
              <ArrowRight size={17} aria-hidden="true" />
            </Link>
          )}
        </div>
      </section>
    </section>
  );
}
