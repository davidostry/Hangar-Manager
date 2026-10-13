import { useEffect, useState, type FormEvent } from "react";
import { isAxiosError } from "axios";
import { Link, useParams } from "react-router";

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
    if (!error.response) return "Cannot connect to the Backend.";
    const data: unknown = error.response.data;
    if (data && typeof data === "object" && "detail" in data) {
      if (typeof data.detail === "string") return data.detail;
      if (Array.isArray(data.detail)) {
        return data.detail.map((entry: { msg?: string }) => entry.msg || "Invalid input").join("; ");
      }
    }
    return `Request failed (HTTP ${error.response.status}).`;
  }
  return error instanceof Error ? error.message : "An unexpected error occurred.";
}

export default function MaintenanceReportDetails() {
  const { reportId } = useParams();
  const { user } = useAuth();
  const canManage = user?.role === "admin" || user?.role === "hangar_manager" || user?.role === "team_lead";
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
    async function loadReport() {
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
        if (active) {
          setReport(value);
          setAssignedTo(value.assigned_to ?? "");
        }
      } catch (cause: unknown) {
        if (active) setError(getErrorMessage(cause));
      } finally {
        if (active) setIsLoading(false);
      }
    }
    void loadReport();
    return () => { active = false; };
  }, [reportId, retry]);

  useEffect(() => {
    if (!canManage) return;
    let active = true;
    async function loadCandidates() {
      try {
        const users = await getUsers();
        if (active) setCandidates(users.filter((item) => item.is_active !== false));
      } catch {
        if (active) setCandidates([]);
      }
    }
    void loadCandidates();
    return () => { active = false; };
  }, [canManage]);

  async function execute(action: () => Promise<MaintenanceReport>, success: string) {
    setIsSaving(true);
    setActionError("");
    setActionSuccess("");
    try {
      const updated = await action();
      setReport(updated);
      setAssignedTo(updated.assigned_to ?? "");
      setActionSuccess(success);
    } catch (cause: unknown) {
      setActionError(getErrorMessage(cause));
    } finally {
      setIsSaving(false);
    }
  }

  function handleAssign(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!reportId || !assignedTo) return;
    void execute(
      () => assignMaintenanceReport(reportId, assignedTo),
      "Technician assigned. Report is now In Progress.",
    );
  }

  function handleResolve(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!reportId || !resolutionNotes.trim()) {
      setActionError("Enter resolution notes before completing this report.");
      return;
    }
    void execute(
      () => resolveMaintenanceReport(reportId, resolutionNotes),
      "Report resolved successfully.",
    );
  }

  function handleCancel() {
    if (!reportId || !window.confirm("Cancel this maintenance report?")) return;
    void execute(() => cancelMaintenanceReport(reportId), "Report cancelled successfully.");
  }

  if (isLoading) {
    return (
      <section className="maintenance-detail-page">
        <div className="maintenance-detail-state" role="status">Loading maintenance report...</div>
      </section>
    );
  }

  if (error || !report) {
    return (
      <section className="maintenance-detail-page">
        <Link className="maintenance-back-link" to="/app/maintenance">Back to Maintenance Reports</Link>
        <div className="maintenance-detail-state maintenance-state-error" role="alert">
          <h1>Unable to load report</h1>
          <p>{error || "Report not found."}</p>
          <button className="maintenance-button" type="button" onClick={() => setRetry((value) => value + 1)}>Try again</button>
        </div>
      </section>
    );
  }

  const isClosed = report.status === "Resolved" || report.status === "Cancelled";
  return (
    <section className="maintenance-detail-page">
      <Link className="maintenance-back-link" to="/app/maintenance">Back to Maintenance Reports</Link>
      <div className="page-heading maintenance-detail-heading">
        <p className="page-eyebrow">Maintenance Report</p>
        <h1>{report.title}</h1>
        <p className="page-description">Review the report and manage its maintenance lifecycle.</p>
      </div>

      <div className="maintenance-detail-summary">
        <div><span className="maintenance-detail-label">Priority</span>
          <span className={`maintenance-priority priority-${report.priority.toLowerCase()}`}>{report.priority}</span>
        </div>
        <div><span className="maintenance-detail-label">Current Status</span>
          <span className={`maintenance-status status-${report.status.toLowerCase()}`}>{formatStatus(report.status)}</span>
        </div>
      </div>

      {canManage && !isClosed && (
        <section className="maintenance-detail-card">
          <h2>Maintenance Actions</h2>
          <p>Assign an active team member before resolving the report. Changes are saved using the dedicated Backend actions.</p>
          <form className="maintenance-status-form" onSubmit={handleAssign}>
            <div className="maintenance-status-control">
              <label htmlFor="maintenance-assignee">Assign / Reassign To</label>
              <select id="maintenance-assignee" value={assignedTo} onChange={(event) => setAssignedTo(event.target.value)} disabled={isSaving} required>
                <option value="">Select an active team member</option>
                {candidates.map((candidate) => (
                  <option key={candidate.id} value={candidate.id}>{candidate.display_name} — {candidate.role.replaceAll("_", " ")}</option>
                ))}
              </select>
            </div>
            <button className="maintenance-button" type="submit" disabled={isSaving || !assignedTo || (report.status === "InProgress" && assignedTo === report.assigned_to)}>
              {isSaving ? "Saving..." : "Assign Technician"}
            </button>
          </form>

          {Boolean(report.assigned_to) && (
            <form className="maintenance-status-form" onSubmit={handleResolve}>
              <div className="maintenance-status-control">
                <label htmlFor="maintenance-resolution-notes">Resolution Notes (required)</label>
                <textarea id="maintenance-resolution-notes" rows={3} value={resolutionNotes} onChange={(event) => setResolutionNotes(event.target.value)} required disabled={isSaving} placeholder="Describe the repair and checks performed" />
              </div>
              <button className="maintenance-button" disabled={isSaving || !resolutionNotes.trim()} type="submit">
                {isSaving ? "Saving..." : "Resolve Report"}
              </button>
            </form>
          )}
          {canCancel && (
            <button type="button" className="maintenance-button" onClick={handleCancel} disabled={isSaving}>Cancel Report</button>
          )}
          {actionError && <p className="maintenance-status-message maintenance-status-message-error" role="alert">{actionError}</p>}
          {actionSuccess && <p className="maintenance-status-message maintenance-status-message-success" role="status">{actionSuccess}</p>}
        </section>
      )}

      {actionError && (isClosed || !canManage) && <p role="alert">{actionError}</p>}
      {actionSuccess && isClosed && <p role="status">{actionSuccess}</p>}

      <section className="maintenance-detail-card">
        <h2>Report Information</h2>
        <dl className="maintenance-detail-grid">
          <div className="maintenance-detail-field"><dt>Report ID</dt><dd className="maintenance-detail-uuid">{report.id}</dd></div>
          <div className="maintenance-detail-field"><dt>Aircraft</dt><dd>{report.aircraft_tail_number || "Aircraft unavailable"}</dd></div>
          <div className="maintenance-detail-field"><dt>Reported By</dt><dd>{report.reported_by_name || "Name unavailable"}</dd></div>
          <div className="maintenance-detail-field"><dt>Assigned To</dt><dd>{report.assigned_to_name || (report.assigned_to ? "Name unavailable" : "Unassigned")}</dd></div>
          <div className="maintenance-detail-field"><dt>Reported At</dt><dd>{formatDate(report.reported_at)}</dd></div>
          <div className="maintenance-detail-field"><dt>Completed At</dt><dd>{formatDate(report.completed_at)}</dd></div>
        </dl>
      </section>

      <section className="maintenance-detail-card">
        <h2>Description</h2>
        <p className="maintenance-detail-description">{report.description || "No description provided."}</p>
        {report.resolution_notes && <><h3>Resolution Notes</h3><p className="maintenance-detail-description">{report.resolution_notes}</p></>}
      </section>
    </section>
  );
}
