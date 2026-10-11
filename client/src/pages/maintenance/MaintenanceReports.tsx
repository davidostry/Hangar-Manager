import { useEffect, useState } from "react";
import { Link } from "react-router";
import {
  getMaintenanceReports,
} from "../../services/maintenanceService";
import type { MaintenanceReport } from "../../types/maintenance";
import type { PaginatedResponse } from "../../types/aircraft";
import "./MaintenanceReports.css";

type ReportStatusFilter = "" | MaintenanceReport["status"];
type ReportPriorityFilter = "" | MaintenanceReport["priority"];

const PAGE_SIZE = 10;

function formatDate(value: string | null) {
  if (!value) {
    return "—";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "—";
  }

  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(date);
}

function toClassName(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "-");
}

function MaintenanceReports() {
  const [result, setResult] =
    useState<PaginatedResponse<MaintenanceReport>>({
      items: [],
      total: 0,
      page: 1,
      page_size: PAGE_SIZE,
    });

  const [search, setSearch] = useState("");
  const [status, setStatus] =
    useState<ReportStatusFilter>("");
  const [priority, setPriority] =
    useState<ReportPriorityFilter>("");
  const [page, setPage] = useState(1);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;

    async function loadReports() {
      setLoading(true);
      setError("");

      try {
        const response = await getMaintenanceReports({
          search,
          status: status || undefined,
          priority: priority || undefined,
          page,
          page_size: PAGE_SIZE,
        });

        if (!cancelled) {
          setResult(response);
        }
      } catch {
        if (!cancelled) {
          setError(
            "Could not load maintenance reports. Please try again.",
          );
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    void loadReports();

    return () => {
      cancelled = true;
    };
  }, [search, status, priority, page]);

  const totalPages = Math.max(
    1,
    Math.ceil(result.total / result.page_size),
  );

  function clearFilters() {
    setSearch("");
    setStatus("");
    setPriority("");
    setPage(1);
  }

  return (
    <section className="maintenance-page">
      <div className="page-heading maintenance-page-heading">
        <div>
          <p className="page-eyebrow">Fleet maintenance</p>
          <h1>Maintenance Reports</h1>
          <p className="page-description">
            Track aircraft issues, priorities, and maintenance progress.
          </p>
        </div>

        <Link
          to="/app/maintenance/new"
          className="maintenance-create-button"
        >
          <span aria-hidden="true">+</span>
          New report
        </Link>
      </div>

      <div className="maintenance-toolbar">
        <div className="maintenance-filter-field maintenance-search-field">
          <label htmlFor="maintenance-search">
            Search reports
          </label>

          <input
            id="maintenance-search"
            type="search"
            value={search}
            onChange={(event) => {
              setSearch(event.target.value);
              setPage(1);
            }}
            placeholder="Search title, description or aircraft ID..."
          />
        </div>

        <div className="maintenance-filter-field">
          <label htmlFor="maintenance-status">
            Status
          </label>

          <select
            id="maintenance-status"
            value={status}
            onChange={(event) => {
              setStatus(event.target.value as ReportStatusFilter);
              setPage(1);
            }}
          >
            <option value="">All statuses</option>
            <option value="Open">Open</option>
            <option value="InProgress">In progress</option>
            <option value="Resolved">Resolved</option>
            <option value="Cancelled">Cancelled</option>
          </select>
        </div>

        <div className="maintenance-filter-field">
          <label htmlFor="maintenance-priority">
            Priority
          </label>

          <select
            id="maintenance-priority"
            value={priority}
            onChange={(event) => {
              setPriority(
                event.target.value as ReportPriorityFilter,
              );
              setPage(1);
            }}
          >
            <option value="">All priorities</option>
            <option value="Low">Low</option>
            <option value="Medium">Medium</option>
            <option value="High">High</option>
            <option value="Critical">Critical</option>
          </select>
        </div>

        <button
          type="button"
          className="maintenance-clear-button"
          onClick={clearFilters}
        >
          Clear filters
        </button>
      </div>

      {error && (
        <div className="maintenance-state maintenance-state-error" role="alert">
          <h2>Unable to load reports</h2>
          <p>{error}</p>
          <button
            type="button"
            onClick={() => setPage((current) => current)}
          >
            Retry
          </button>
        </div>
      )}

      {loading && (
        <div className="maintenance-state" role="status">
          <span className="maintenance-spinner" aria-hidden="true" />
          <p>Loading maintenance reports...</p>
        </div>
      )}

      {!loading && !error && result.items.length === 0 && (
        <div className="maintenance-state">
          <span className="maintenance-empty-icon" aria-hidden="true">
            ◇
          </span>
          <h2>No reports found</h2>
          <p>
            There are no reports matching these filters.
          </p>
          <button
            type="button"
            className="maintenance-clear-button"
            onClick={clearFilters}
          >
            Clear filters
          </button>
        </div>
      )}

      {!loading && !error && result.items.length > 0 && (
        <>
          <div className="maintenance-table-wrapper">
            <table className="maintenance-table">
              <thead>
                <tr>
                  <th>Report</th>
                  <th>Aircraft ID</th>
                  <th>Priority</th>
                  <th>Status</th>
                  <th>Reported</th>
                  <th>Assigned to</th>
                </tr>
              </thead>

              <tbody>
                {result.items.map((report) => (
                  <tr key={report.id}>
                    <td className="maintenance-report-cell">
                      <Link to={`/app/maintenance/${report.id}`}>
                        {report.title}
                      </Link>

                      <p className="maintenance-report-description">
                        {report.description}
                      </p>
                    </td>

                    <td>
                      <span
                        className="maintenance-aircraft-id"
                        title={report.aircraft_id}
                      >
                        {report.aircraft_id}
                      </span>
                    </td>

                    <td>
                      <span
                        className={`maintenance-priority-badge priority-${toClassName(
                          report.priority,
                        )}`}
                      >
                        {report.priority}
                      </span>
                    </td>

                    <td>
                      <span
                        className={`maintenance-status-badge status-${toClassName(
                          report.status,
                        )}`}
                      >
                        {report.status === "InProgress"
                          ? "In progress"
                          : report.status}
                      </span>
                    </td>

                    <td>{formatDate(report.reported_at)}</td>

                    <td>
                      {report.assigned_to || "Unassigned"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="maintenance-list-footer">
            <p className="maintenance-results-count">
              Showing {result.items.length} of {result.total} reports
            </p>

            <div className="maintenance-pagination">
              <button
                type="button"
                onClick={() => setPage((current) => current - 1)}
                disabled={page <= 1}
              >
                Previous
              </button>

              <span>
                Page {page} of {totalPages}
              </span>

              <button
                type="button"
                onClick={() => setPage((current) => current + 1)}
                disabled={page >= totalPages}
              >
                Next
              </button>
            </div>
          </div>
        </>
      )}
    </section>
  );
}

export default MaintenanceReports;