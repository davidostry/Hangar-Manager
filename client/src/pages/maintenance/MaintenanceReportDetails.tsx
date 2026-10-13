import { useEffect, useState, type FormEvent } from "react";
import { isAxiosError } from "axios";
import { Link, useParams } from "react-router";
import {
  ArrowLeft,
  Ban,
  CalendarDays,
  CheckCircle2,
  ClipboardCheck,
  ClipboardList,
  FileText,
  Flag,
  Hash,
  LoaderCircle,
  Plane,
  RotateCcw,
  ShieldCheck,
  UserRound,
  UserRoundCheck,
  Wrench,
  CircleAlert,
} from "lucide-react";

import { useAuth } from "../../context/AuthContext";
import { getUsers } from "../../services/userService";
import {
  getMaintenanceReportById,
  assignMaintenanceReport,
  resolveMaintenanceReport,
  cancelMaintenanceReport,
} from "../../services/maintenanceService";
import type { MaintenanceReport, MaintenanceStatus } from "../../types/maintenance";
import type { UserListItem } from "../../types/users";

import "./MaintenanceReportDetails.css";

function formatDate(value: string | null): string {
  if (!value) return "Not available";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Invalid date";

  return new Intl.DateTimeFormat("en-GB", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

function formatStatus(status: MaintenanceStatus): string {
  return status === "InProgress" ? "In Progress" : status;
}

function getErrorMessage(error: unknown): string {
  if (isAxiosError(error)) {
    if (!error.response) {
      return "Cannot connect to the Backend. Check that the server is running.";
    }

    const data: unknown = error.response.data;
    if (data && typeof data === "object" && "detail" in data) {
      const detail = data.detail;
      if (typeof detail === "string" && detail.trim()) return detail;

      if (Array.isArray(detail)) {
        const messages = detail.map((entry: unknown) => {
          if (
            entry &&
            typeof entry === "object" &&
            "msg" in entry &&
            typeof entry.msg === "string"
          ) {
            return entry.msg;
          }
          return "Invalid input";
        });
        return messages.join("; ");
      }
    }

    return `Request failed (HTTP ${error.response.status}).`;
  }

  return error instanceof Error ? error.message : "An unexpected error occurred.";
}

export default function MaintenanceReportDetails() {
  const { reportId } = useParams();
  const { user } = useAuth();

  // Keep the project's original role permissions unchanged.
  const canManage =
    user?.role === "admin" ||
    user?.role === "hangar_manager" ||
    user?.role === "team_lead";
  const canCancel = user?.role === "admin" || user?.role === "hangar_manager";

  const [report, setReport] = useState<MaintenanceReport | null>(null);
  const [candidates, setCandidates] = useState<UserListItem[]>([]);
  const [assignedTo, setAssignedTo] = useState("");
  const [resolutionNotes, setResolutionNotes] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState("");
  const [actionError, setActionError] = useState("");
  const [actionSuccess, setActionSuccess] = useState("");
  const [retry, setRetry] = useState(0);

  useEffect(() => {
    let active = true;

    async function loadReport(): Promise<void> {
      setIsLoading(true);
      setError("");
      setReport(null);

      if (!reportId) {
        setError("Missing report ID.");
        setIsLoading(false);
        return;
      }

      try {
        const value = await getMaintenanceReportById(reportId);
        if (!active) return;
        setReport(value);
        setAssignedTo(value.assigned_to ?? "");
      } catch (cause: unknown) {
        if (active) setError(getErrorMessage(cause));
      } finally {
        if (active) setIsLoading(false);
      }
    }

    void loadReport();
    return () => {
      active = false;
    };
  }, [reportId, retry]);

  useEffect(() => {
    if (!canManage) return;
    let active = true;

    async function loadCandidates(): Promise<void> {
      try {
        const users = await getUsers();
        if (active) {
          setCandidates(users.filter((item) => item.is_active !== false));
        }
      } catch {
        if (active) setCandidates([]);
      }
    }

    void loadCandidates();
    return () => {
      active = false;
    };
  }, [canManage]);

  async function execute(
    action: () => Promise<MaintenanceReport>,
    successMessage: string,
  ): Promise<void> {
    if (isSaving) return;
    setIsSaving(true);
    setActionError("");
    setActionSuccess("");

    try {
      const updated = await action();
      setReport(updated);
      setAssignedTo(updated.assigned_to ?? "");
      setActionSuccess(successMessage);
    } catch (cause: unknown) {
      setActionError(getErrorMessage(cause));
    } finally {
      setIsSaving(false);
    }
  }

  function handleAssign(event: FormEvent<HTMLFormElement>): void {
    event.preventDefault();
    if (!reportId || !assignedTo || isSaving) return;

    void execute(
      () => assignMaintenanceReport(reportId, assignedTo),
      "Technician assigned. Report is now In Progress.",
    );
  }

  function handleResolve(event: FormEvent<HTMLFormElement>): void {
    event.preventDefault();
    if (!reportId || isSaving || !resolutionNotes.trim()) {
      if (!resolutionNotes.trim()) {
        setActionError("Enter resolution notes before completing this report.");
      }
      return;
    }

    void execute(
      () => resolveMaintenanceReport(reportId, resolutionNotes),
      "Report resolved successfully.",
    );
  }

  function handleCancel(): void {
    if (
      !reportId ||
      isSaving ||
      !window.confirm("Cancel this maintenance report?")
    ) {
      return;
    }

    void execute(
      () => cancelMaintenanceReport(reportId),
      "Report cancelled successfully.",
    );
  }

  if (isLoading) {
    return (
      <section className="hm-maint-detail-page">
        <div className="hm-maint-detail-state" role="status">
          <LoaderCircle className="hm-maint-detail-spinner" size={38} aria-hidden="true" />
          <p>Loading maintenance report...</p>
        </div>
      </section>
    );
  }

  if (error || !report) {
    return (
      <section className="hm-maint-detail-page">
        <Link className="hm-maint-detail-back" to="/app/maintenance">
          <ArrowLeft size={18} aria-hidden="true" />
          Back to Maintenance Reports
        </Link>
        <div className="hm-maint-detail-state hm-maint-detail-state--error" role="alert">
          <CircleAlert size={38} aria-hidden="true" />
          <h1>Unable to load report</h1>
          <p>{error || "Report not found."}</p>
          <button
            type="button"
            className="hm-maint-detail-button hm-maint-detail-button--primary"
            onClick={() => setRetry((value) => value + 1)}
          >
            <RotateCcw size={17} aria-hidden="true" /> Try again
          </button>
        </div>
      </section>
    );
  }

  const isClosed = report.status === "Resolved" || report.status === "Cancelled";

  return (
    <section className="hm-maint-detail-page">
      <Link className="hm-maint-detail-back" to="/app/maintenance">
        <ArrowLeft size={18} aria-hidden="true" />
        Back to Maintenance Reports
      </Link>

      {/* Hero uses real report values; no invented operational metrics. */}
      <header className="hm-maint-detail-hero">
        <div className="hm-maint-detail-hero-content">
          <p className="hm-maint-detail-eyebrow">
            <span className="hm-maint-detail-pulse" aria-hidden="true" />
            FLEET OPERATIONS / MAINTENANCE REPORT
          </p>
          <p className="hm-maint-detail-kicker">AIRCRAFT HEALTH &amp; SAFETY</p>
          <h1>{report.title}</h1>
          <p className="hm-maint-detail-subtitle">
            Review the issue, responsible technician and maintenance lifecycle.
          </p>
          <div className="hm-maint-detail-hero-chips">
            <span className={`hm-maint-detail-chip hm-maint-detail-chip--status status-${report.status.toLowerCase()}`}>
              <span className="hm-maint-detail-chip-dot" aria-hidden="true" />
              {formatStatus(report.status)}
            </span>
            <span className={`hm-maint-detail-chip hm-maint-detail-chip--priority priority-${report.priority.toLowerCase()}`}>
              <Flag size={15} aria-hidden="true" />
              {report.priority} priority
            </span>
          </div>
          <div className="hm-maint-detail-hero-foot">
            <span><Plane size={17} aria-hidden="true" /> {report.aircraft_tail_number || "Aircraft unavailable"}</span>
            <span><CalendarDays size={17} aria-hidden="true" /> {formatDate(report.reported_at)}</span>
          </div>
        </div>
        <Wrench className="hm-maint-detail-hero-art" size={220} strokeWidth={0.8} aria-hidden="true" />
      </header>

      {/* Status feedback stays visible even when an action closes the report. */}
      {actionError && (
        <div className="hm-maint-detail-feedback hm-maint-detail-feedback--error" role="alert">
          <CircleAlert size={19} aria-hidden="true" /> {actionError}
        </div>
      )}
      {actionSuccess && (
        <div className="hm-maint-detail-feedback hm-maint-detail-feedback--success" role="status">
          <CheckCircle2 size={19} aria-hidden="true" /> {actionSuccess}
        </div>
      )}

      {/* Assign / resolve / cancel remain guarded by the original roles and status. */}
      {canManage && !isClosed && (
        <section className="hm-maint-detail-panel hm-maint-detail-actions" aria-labelledby="hm-maint-actions-heading">
          <div className="hm-maint-detail-panel-heading">
            <div className="hm-maint-detail-panel-icon"><Wrench size={23} aria-hidden="true" /></div>
            <div>
              <span className="hm-maint-detail-section-eyebrow">WORKFLOW CONTROL</span>
              <h2 id="hm-maint-actions-heading">Maintenance Actions</h2>
              <p>Assign a technician, resolve the report or cancel it when necessary.</p>
            </div>
          </div>

          <div className="hm-maint-detail-action-grid">
            <form className="hm-maint-detail-action-card" onSubmit={handleAssign}>
              <div className="hm-maint-detail-action-title">
                <UserRoundCheck size={19} aria-hidden="true" />
                <h3>Assign Technician</h3>
              </div>
              <label htmlFor="maintenance-assignee">Assign / Reassign To</label>
              <select
                id="maintenance-assignee"
                value={assignedTo}
                onChange={(event) => setAssignedTo(event.target.value)}
                disabled={isSaving}
                required
              >
                <option value="">Select an active team member</option>
                {candidates.map((candidate) => (
                  <option key={candidate.id} value={candidate.id}>
                    {candidate.display_name} — {candidate.role.replaceAll("_", " ")}
                  </option>
                ))}
              </select>
              <button
                type="submit"
                className="hm-maint-detail-button hm-maint-detail-button--primary"
                disabled={isSaving || !assignedTo || (report.status === "InProgress" && assignedTo === report.assigned_to)}
              >
                {isSaving ? <LoaderCircle className="hm-maint-detail-spinner" size={17} aria-hidden="true" /> : <UserRoundCheck size={17} aria-hidden="true" />}
                {isSaving ? "Saving..." : "Assign Technician"}
              </button>
            </form>

            {Boolean(report.assigned_to) && (
              <form className="hm-maint-detail-action-card" onSubmit={handleResolve}>
                <div className="hm-maint-detail-action-title">
                  <ClipboardCheck size={19} aria-hidden="true" />
                  <h3>Resolve Report</h3>
                </div>
                <label htmlFor="maintenance-resolution-notes">Resolution Notes (required)</label>
                <textarea
                  id="maintenance-resolution-notes"
                  rows={3}
                  value={resolutionNotes}
                  onChange={(event) => setResolutionNotes(event.target.value)}
                  required
                  disabled={isSaving}
                  placeholder="Describe the repair and checks performed"
                />
                <button
                  type="submit"
                  className="hm-maint-detail-button hm-maint-detail-button--primary"
                  disabled={isSaving || !resolutionNotes.trim()}
                >
                  {isSaving ? <LoaderCircle className="hm-maint-detail-spinner" size={17} aria-hidden="true" /> : <CheckCircle2 size={17} aria-hidden="true" />}
                  {isSaving ? "Saving..." : "Resolve Report"}
                </button>
              </form>
            )}
          </div>

          {canCancel && (
            <div className="hm-maint-detail-danger-zone">
              <div>
                <strong>Cancel this report</strong>
                <p>Only use this action when the report should no longer proceed.</p>
              </div>
              <button
                type="button"
                className="hm-maint-detail-button hm-maint-detail-button--danger"
                onClick={handleCancel}
                disabled={isSaving}
              >
                <Ban size={17} aria-hidden="true" /> Cancel Report
              </button>
            </div>
          )}
        </section>
      )}

      <section className="hm-maint-detail-panel" aria-labelledby="hm-maint-info-heading">
        <div className="hm-maint-detail-panel-heading">
          <div className="hm-maint-detail-panel-icon"><ClipboardList size={23} aria-hidden="true" /></div>
          <div>
            <span className="hm-maint-detail-section-eyebrow">REPORT RECORD</span>
            <h2 id="hm-maint-info-heading">Report Information</h2>
            <p>Aircraft identification, responsible staff and relevant dates.</p>
          </div>
        </div>

        <dl className="hm-maint-detail-info-grid">
          <div className="hm-maint-detail-info-field">
            <dt><Hash size={15} aria-hidden="true" /> Report ID</dt>
            <dd className="hm-maint-detail-mono">{report.id}</dd>
          </div>
          <div className="hm-maint-detail-info-field">
            <dt><Plane size={15} aria-hidden="true" /> Aircraft</dt>
            <dd>{report.aircraft_tail_number || "Aircraft unavailable"}</dd>
          </div>
          <div className="hm-maint-detail-info-field">
            <dt><UserRound size={15} aria-hidden="true" /> Reported By</dt>
            <dd>{report.reported_by_name || "Name unavailable"}</dd>
          </div>
          <div className="hm-maint-detail-info-field">
            <dt><UserRoundCheck size={15} aria-hidden="true" /> Assigned To</dt>
            <dd>{report.assigned_to_name || (report.assigned_to ? "Name unavailable" : "Unassigned")}</dd>
          </div>
          <div className="hm-maint-detail-info-field">
            <dt><CalendarDays size={15} aria-hidden="true" /> Reported At</dt>
            <dd>{formatDate(report.reported_at)}</dd>
          </div>
          <div className="hm-maint-detail-info-field">
            <dt><ShieldCheck size={15} aria-hidden="true" /> Completed At</dt>
            <dd>{formatDate(report.completed_at)}</dd>
          </div>
        </dl>
      </section>

      <section className="hm-maint-detail-panel" aria-labelledby="hm-maint-desc-heading">
        <div className="hm-maint-detail-panel-heading">
          <div className="hm-maint-detail-panel-icon hm-maint-detail-panel-icon--teal"><FileText size={23} aria-hidden="true" /></div>
          <div>
            <span className="hm-maint-detail-section-eyebrow">ISSUE &amp; WORK LOG</span>
            <h2 id="hm-maint-desc-heading">Report Description</h2>
            <p>Original issue details and the technician's resolution notes, if available.</p>
          </div>
        </div>
        <div className="hm-maint-detail-description">
          {report.description || "No description provided."}
        </div>
        {report.resolution_notes && (
          <div className="hm-maint-detail-resolution">
            <h3><CheckCircle2 size={19} aria-hidden="true" /> Resolution Notes</h3>
            <p>{report.resolution_notes}</p>
          </div>
        )}
      </section>
    </section>
  );
}
