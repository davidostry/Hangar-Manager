import { useEffect, useState, type FormEvent } from "react";
import { isAxiosError } from "axios";
import {
  AlertCircle,
  CheckCircle2,
  CircleUserRound,
  Filter,
  LockKeyhole,
  Mail,
  Plus,
  RefreshCw,
  Search,
  ShieldCheck,
  UserCog,
  UserPlus,
  UsersRound,
  X,
} from "lucide-react";

import { useAuth } from "../../context/AuthContext";
import {
  getUsers,
  createUser,
  updateUserRole,
  setUserActive,
} from "../../services/userService";

import type { UserRole } from "../../types/auth";
import type { UserListItem } from "../../types/users";

import "./UsersPage.css";

type RoleFilter = UserRole | "all";
type StatusFilter = "all" | "active" | "inactive";

const ROLE_LABELS: Record<UserRole, string> = {
  admin: "Admin",
  hangar_manager: "Hangar Manager",
  team_lead: "Team Lead",
  technician: "Technician",
};

function isRoleFilter(value: string): value is RoleFilter {
  return (
    value === "all" ||
    value === "admin" ||
    value === "hangar_manager" ||
    value === "team_lead" ||
    value === "technician"
  );
}

function getErrorMessage(error: unknown): string {
  if (isAxiosError(error)) {
    if (!error.response) {
      return "Cannot connect to the Backend.";
    }

    if (error.response.status === 401) {
      return "Your session has expired. Please sign in again.";
    }

    if (error.response.status === 403) {
      return "You do not have permission to view users.";
    }

    const data: unknown = error.response.data;

    if (data && typeof data === "object" && "detail" in data) {
      const detail = data.detail;

      if (typeof detail === "string") {
        return detail;
      }

      if (Array.isArray(detail)) {
        const messages = detail
          .map((item: unknown) => {
            if (
              typeof item === "object" &&
              item !== null &&
              "msg" in item &&
              typeof item.msg === "string"
            ) {
              return item.msg;
            }
            return "Invalid input";
          });

        return messages.join("; ");
      }
    }

    return `Request failed. HTTP ${error.response.status}.`;
  }

  if (error instanceof Error) {
    return error.message;
  }

  return "An unexpected error occurred.";
}

function UsersPage() {
  const { user } = useAuth();
  const isAdmin = user?.role === "admin";
  const isTeamLead = user?.role === "team_lead";

  const [users, setUsers] = useState<UserListItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");

  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState<RoleFilter>("all");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");

  const [retryCount, setRetryCount] = useState(0);
  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName] = useState("");
  const [newEmail, setNewEmail] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [newRole, setNewRole] = useState<UserRole>("technician");

  const [savingId, setSavingId] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [actionError, setActionError] = useState("");
  const [actionSuccess, setActionSuccess] = useState("");

  // Load the directory. Backend authorization remains authoritative.
  useEffect(() => {
    let isActive = true;

    async function loadUsers(): Promise<void> {
      setIsLoading(true);
      setErrorMessage("");

      try {
        const result = await getUsers();
        if (isActive) setUsers(result);
      } catch (error: unknown) {
        if (isActive) {
          setUsers([]);
          setErrorMessage(getErrorMessage(error));
        }
      } finally {
        if (isActive) setIsLoading(false);
      }
    }

    void loadUsers();
    return () => { isActive = false; };
  }, [retryCount]);

  // Preserve the original role-based directory visibility.
  const visibleUsers = isTeamLead
    ? users.filter((item) => item.role === "technician")
    : users;

  const normalizedSearch = search.trim().toLowerCase();
  const filteredUsers = visibleUsers
    .filter((item) => {
      const matchesSearch =
        normalizedSearch.length === 0 ||
        item.display_name.toLowerCase().includes(normalizedSearch) ||
        item.email.toLowerCase().includes(normalizedSearch);

      const matchesRole = roleFilter === "all" || item.role === roleFilter;
      const matchesStatus =
        statusFilter === "all" ||
        (statusFilter === "active" && item.is_active === true) ||
        (statusFilter === "inactive" && item.is_active === false);

      return matchesSearch && matchesRole && matchesStatus;
    })
    .sort((a, b) => a.display_name.localeCompare(b.display_name));

  const hasFilters = search !== "" || roleFilter !== "all" || statusFilter !== "all";

  function handleRefresh(): void {
    setRetryCount((current) => current + 1);
  }

  function clearFilters(): void {
    setSearch("");
    setRoleFilter("all");
    setStatusFilter("all");
  }

  async function handleCreate(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    if (isCreating) return;

    setIsCreating(true);
    setActionError("");
    setActionSuccess("");

    try {
      await createUser({
        display_name: newName.trim(),
        email: newEmail.trim(),
        password: newPassword,
        role: newRole,
      });

      setNewName("");
      setNewEmail("");
      setNewPassword("");
      setNewRole("technician");
      setShowCreate(false);
      setActionSuccess("User created successfully.");
      handleRefresh();
    } catch (cause: unknown) {
      setActionError(getErrorMessage(cause));
    } finally {
      setIsCreating(false);
    }
  }

  async function handleRoleChange(item: UserListItem, role: UserRole): Promise<void> {
    if (role === item.role) return;
    if (!window.confirm(`Change ${item.display_name}'s role to ${ROLE_LABELS[role]}?`)) return;

    setSavingId(item.id);
    setActionError("");
    setActionSuccess("");

    try {
      await updateUserRole(item.id, role);
      setActionSuccess(`Role updated for ${item.display_name}.`);
      handleRefresh();
    } catch (cause: unknown) {
      setActionError(getErrorMessage(cause));
    } finally {
      setSavingId(null);
    }
  }

  async function handleActiveChange(item: UserListItem): Promise<void> {
    const activate = item.is_active === false;
    if (!window.confirm(`${activate ? "Reactivate" : "Deactivate"} ${item.display_name}?`)) return;

    setSavingId(item.id);
    setActionError("");
    setActionSuccess("");

    try {
      await setUserActive(item.id, activate);
      setActionSuccess(`${item.display_name} ${activate ? "reactivated" : "deactivated"}.`);
      handleRefresh();
    } catch (cause: unknown) {
      setActionError(getErrorMessage(cause));
    } finally {
      setSavingId(null);
    }
  }

  return (
    <section className="hm-users-page">
      {/* Main page hero */}
      <header className="hm-users-hero">
        <div className="hm-users-hero-content">
          <p className="hm-users-eyebrow">
            <span className="hm-users-pulse" aria-hidden="true" />
            WORKSPACE / ACCESS MANAGEMENT
          </p>
          <p className="hm-users-kicker">TEAM DIRECTORY & PERMISSIONS</p>
          <h1>Users</h1>
          <p className="hm-users-hero-description">
            {isTeamLead
              ? "View the technicians in your organization."
              : "Manage your team's accounts, roles and access to fleet operations."}
          </p>
          <span className="hm-users-hero-caption">
            <ShieldCheck size={17} aria-hidden="true" />
            Secure fleet access management
          </span>
        </div>

        <UsersRound className="hm-users-hero-art" size={224} strokeWidth={0.85} aria-hidden="true" />
        <div className="hm-users-hero-actions">
          {isAdmin && (
            <button
              type="button"
              className="hm-users-button hm-users-button--primary"
              onClick={() => setShowCreate((current) => !current)}
              aria-expanded={showCreate}
              aria-controls="hm-users-create-section"
            >
              {showCreate ? <X size={18} /> : <UserPlus size={18} />}
              {showCreate ? "Close Form" : "Add User"}
            </button>
          )}
          <button
            type="button"
            className="hm-users-button hm-users-button--outline"
            onClick={handleRefresh}
            disabled={isLoading}
          >
            <RefreshCw size={17} className={isLoading ? "hm-users-icon-spin" : ""} />
            Refresh
          </button>
        </div>
      </header>

      {/* Admin-only create form; API behavior is unchanged */}
      {isAdmin && showCreate && (
        <section id="hm-users-create-section" className="hm-users-surface hm-users-create-panel">
          <div className="hm-users-panel-heading">
            <span className="hm-users-panel-icon"><UserPlus size={23} aria-hidden="true" /></span>
            <div>
              <p className="hm-users-section-eyebrow">NEW TEAM MEMBER</p>
              <h2>Create User</h2>
              <p>Set up a new account and assign the appropriate access level.</p>
            </div>
          </div>

          <form onSubmit={(event) => void handleCreate(event)}>
            <div className="hm-users-create-grid">
              <div className="hm-users-field">
                <label htmlFor="new-user-name"><CircleUserRound size={16} /> Full name</label>
                <input
                  id="new-user-name"
                  value={newName}
                  onChange={(event) => setNewName(event.target.value)}
                  placeholder="e.g. Alex Morgan"
                  minLength={1}
                  required
                  disabled={isCreating}
                />
              </div>
              <div className="hm-users-field">
                <label htmlFor="new-user-email"><Mail size={16} /> Email address</label>
                <input
                  id="new-user-email"
                  type="email"
                  value={newEmail}
                  onChange={(event) => setNewEmail(event.target.value)}
                  placeholder="name@example.com"
                  required
                  disabled={isCreating}
                />
              </div>
              <div className="hm-users-field">
                <label htmlFor="new-user-password"><LockKeyhole size={16} /> Password (8+ characters)</label>
                <input
                  id="new-user-password"
                  type="password"
                  value={newPassword}
                  onChange={(event) => setNewPassword(event.target.value)}
                  minLength={8}
                  required
                  autoComplete="new-password"
                  disabled={isCreating}
                />
              </div>
              <div className="hm-users-field">
                <label htmlFor="new-user-role"><UserCog size={16} /> Role</label>
                <select
                  id="new-user-role"
                  value={newRole}
                  onChange={(event) => setNewRole(event.target.value as UserRole)}
                  disabled={isCreating}
                >
                  {Object.entries(ROLE_LABELS).map(([key, label]) => (
                    <option key={key} value={key}>{label}</option>
                  ))}
                </select>
              </div>
            </div>
            <div className="hm-users-create-footer">
              <span><ShieldCheck size={16} /> Account roles determine system access.</span>
              <button type="submit" className="hm-users-button hm-users-button--primary" disabled={isCreating}>
                <Plus size={17} /> {isCreating ? "Creating..." : "Create User"}
              </button>
            </div>
          </form>
        </section>
      )}

      {/* Feedback for successful or failed user actions */}
      {actionError && (
        <div className="hm-users-notice hm-users-notice--error" role="alert">
          <AlertCircle size={19} aria-hidden="true" /> {actionError}
        </div>
      )}
      {actionSuccess && (
        <div className="hm-users-notice hm-users-notice--success" role="status">
          <CheckCircle2 size={19} aria-hidden="true" /> {actionSuccess}
        </div>
      )}

      {/* Search and filters */}
      <section className="hm-users-toolbar" aria-label="User filters">
        <div className="hm-users-field hm-users-field--search">
          <label htmlFor="users-search"><Search size={16} /> Search users</label>
          <div className="hm-users-search-box">
            <Search size={19} aria-hidden="true" />
            <input
              id="users-search"
              type="search"
              placeholder="Search by name or email..."
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
          </div>
        </div>

        <div className="hm-users-field">
          <label htmlFor="users-role"><UserCog size={16} /> Role</label>
          <select
            id="users-role"
            value={roleFilter}
            onChange={(event) => {
              const value = event.target.value;
              if (isRoleFilter(value)) setRoleFilter(value);
            }}
          >
            <option value="all">All roles</option>
            {!isTeamLead && (
              <>
                <option value="admin">Admin</option>
                <option value="hangar_manager">Hangar Manager</option>
                <option value="team_lead">Team Lead</option>
              </>
            )}
            <option value="technician">Technician</option>
          </select>
        </div>

        <div className="hm-users-field">
          <label htmlFor="users-status"><Filter size={16} /> Status</label>
          <select
            id="users-status"
            value={statusFilter}
            onChange={(event) => {
              const value = event.target.value;
              if (value === "all" || value === "active" || value === "inactive") {
                setStatusFilter(value);
              }
            }}
          >
            <option value="all">All statuses</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </select>
        </div>
        {hasFilters && (
          <button type="button" className="hm-users-clear" onClick={clearFilters}>
            <X size={16} /> Clear filters
          </button>
        )}
      </section>

      <section className="hm-users-directory" aria-labelledby="hm-users-directory-heading">
        <div className="hm-users-directory-heading">
          <div>
            <p className="hm-users-section-eyebrow">OPERATIONS OVERVIEW</p>
            <h2 id="hm-users-directory-heading">Team Directory</h2>
            <p>Team members, assigned roles and account status.</p>
          </div>
          {!isLoading && !errorMessage && (
            <span className="hm-users-total-badge">
              <UsersRound size={16} /> {filteredUsers.length} users
            </span>
          )}
        </div>

        {isLoading && (
          <div className="hm-users-state" role="status">
            <RefreshCw size={29} className="hm-users-icon-spin" aria-hidden="true" />
            <p>Loading users...</p>
          </div>
        )}

        {!isLoading && errorMessage && (
          <div className="hm-users-state hm-users-state--error" role="alert">
            <AlertCircle size={30} aria-hidden="true" />
            <h3>Unable to load users</h3>
            <p>{errorMessage}</p>
            <button type="button" className="hm-users-button hm-users-button--primary" onClick={handleRefresh}>
              <RefreshCw size={17} /> Try again
            </button>
          </div>
        )}

        {!isLoading && !errorMessage && filteredUsers.length === 0 && (
          <div className="hm-users-state">
            <Search size={30} aria-hidden="true" />
            <h3>No users found</h3>
            <p>Try changing your search or filters.</p>
            {hasFilters && (
              <button type="button" className="hm-users-button hm-users-button--subtle" onClick={clearFilters}>
                Clear filters
              </button>
            )}
          </div>
        )}

        {!isLoading && !errorMessage && filteredUsers.length > 0 && (
          <>
            <div className="hm-users-table-wrapper">
              <table className="hm-users-table">
                <thead>
                  <tr>
                    <th scope="col">Name</th>
                    <th scope="col">Email</th>
                    <th scope="col">Role</th>
                    <th scope="col">Status</th>
                    {isAdmin && <th scope="col">Actions</th>}
                  </tr>
                </thead>
                <tbody>
                  {filteredUsers.map((item) => (
                    <tr key={item.id}>
                      <td data-label="Name">
                        <div className="hm-users-person">
                          <span className="hm-users-avatar" aria-hidden="true">
                            {item.display_name.trim().charAt(0).toUpperCase() || "U"}
                          </span>
                          <strong>{item.display_name}</strong>
                        </div>
                      </td>
                      <td data-label="Email" className="hm-users-email">{item.email}</td>
                      <td data-label="Role">
                        <span className={`hm-users-role hm-users-role--${item.role}`}>
                          <ShieldCheck size={13} aria-hidden="true" />
                          {ROLE_LABELS[item.role]}
                        </span>
                      </td>
                      <td data-label="Status">
                        <span className={`hm-users-status ${
                          item.is_active === true
                            ? "hm-users-status--active"
                            : item.is_active === false
                              ? "hm-users-status--inactive"
                              : "hm-users-status--unknown"
                        }`}>
                          <span className="hm-users-status-dot" aria-hidden="true" />
                          {item.is_active === true
                            ? "Active"
                            : item.is_active === false
                              ? "Inactive"
                              : "Not provided"}
                        </span>
                      </td>
                      {isAdmin && (
                        <td data-label="Actions" className="hm-users-actions-cell">
                          <div className="hm-users-row-actions">
                            <label htmlFor={`role-${item.id}`} className="hm-users-visually-hidden">
                              Change role for {item.display_name}
                            </label>
                            <select
                              id={`role-${item.id}`}
                              aria-label={`Change role for ${item.display_name}`}
                              title={`Change role for ${item.display_name}`}
                              value={item.role}
                              disabled={savingId !== null}
                              onChange={(event) => void handleRoleChange(item, event.target.value as UserRole)}
                            >
                              {Object.entries(ROLE_LABELS).map(([key, label]) => (
                                <option key={key} value={key}>{label}</option>
                              ))}
                            </select>
                            <button
                              type="button"
                              className={`hm-users-toggle ${item.is_active === false ? "hm-users-toggle--activate" : "hm-users-toggle--deactivate"}`}
                              disabled={savingId !== null || item.id === user?.id}
                              onClick={() => void handleActiveChange(item)}
                            >
                              {savingId === item.id
                                ? "Saving..."
                                : item.is_active === false
                                  ? "Reactivate"
                                  : "Deactivate"}
                            </button>
                          </div>
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="hm-users-directory-footer">
              Showing <strong>{filteredUsers.length}</strong> of <strong>{visibleUsers.length}</strong> users
            </div>
          </>
        )}
      </section>
    </section>
  );
}

export default UsersPage;
