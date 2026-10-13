import { useEffect, useState } from "react";
import { Link } from "react-router";
import {
  AlertCircle,
  ArrowUpRight,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  ClipboardList,
  Flag,
  LoaderCircle,
  Plane,
  Plus,
  RefreshCw,
  Search,
  SlidersHorizontal,
  UserRound,
  Wrench,
  X,
} from "lucide-react";

import { getMaintenanceReports } from "../../services/maintenanceService";
import type { MaintenanceReport } from "../../types/maintenance";
import type { PaginatedResponse } from "../../types/aircraft";

import "./MaintenanceReports.css";

type ReportStatusFilter = "" | MaintenanceReport["status"];
type ReportPriorityFilter = "" | MaintenanceReport["priority"];

const PAGE_SIZE = 10;

const DATE_FORMATTER = new Intl.DateTimeFormat("en-GB", {
  day: "2-digit",
  month: "short",
  year: "numeric",
});

function formatDate(value: string | null): string {
  if (!value) return "—";

  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "—" : DATE_FORMATTER.format(date);
}

function toClassName(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "-");
}

function formatStatus(status: MaintenanceReport["status"]): string {
  return status === "InProgress" ? "In progress" : status;
}

function MaintenanceReports() {
  const [result, setResult] = useState<PaginatedResponse<MaintenanceReport>>({
    items: [],
    total: 0,
    page: 1,
    page_size: PAGE_SIZE,
  });

  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<ReportStatusFilter>("");
  const [priority, setPriority] = useState<ReportPriorityFilter>("");
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [retryCount, setRetryCount] = useState(0);

  useEffect(() => {
    let cancelled = false;

    async function loadReports(): Promise<void> {
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

        if (!cancelled) setResult(response);
      } catch {
        if (!cancelled) {
          setError("Could not load maintenance reports. Please try again.");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void loadReports();

    return () => {
      cancelled = true;
    };
  }, [search, status, priority, page, retryCount]);

  const totalPages = Math.max(
    1,
    Math.ceil(result.total / (result.page_size || PAGE_SIZE)),
  );
  const hasFilters = Boolean(search || status || priority);

  function clearFilters(): void {
    setSearch("");
    setStatus("");
    setPriority("");
    setPage(1);
  }

  return (
    <section className="hm-maintenance-list">
      {/* Hero / page introduction */}
      <header className="hm-maintenance-hero">
        <div className="hm-maintenance-hero-copy">
          <div className="hm-maintenance-overline">
            <span className="hm-maintenance-pulse" aria-hidden="true" />
            FLEET OPERATIONS / MAINTENANCE CENTER
          </div>

          <p className="hm-maintenance-kicker">AIRCRAFT HEALTH & SAFETY</p>
          <h1>Maintenance Reports</h1>
          <p className="hm-maintenance-hero-description">
            Track aircraft issues, manage priorities and follow every report
            from discovery to resolution.
          </p>

          <div className="hm-maintenance-hero-bottom">
            <span className="hm-maintenance-hero-caption">
              <ClipboardList size={17} aria-hidden="true" />
              Maintenance operations register
            </span>

            <Link to="/app/maintenance/new" className="hm-maintenance-create">
              <Plus size={19} strokeWidth={2.5} aria-hidden="true" />
              New report
            </Link>
          </div>
        </div>
        <Wrench className="hm-maintenance-hero-watermark" size={238} strokeWidth={0.7} aria-hidden="true" />
      </header>

      {/* Search and filters */}
      <section className="hm-maintenance-filters" aria-label="Search and filter maintenance reports">
        <div className="hm-maintenance-filter hm-maintenance-filter--search">
          <label htmlFor="maintenance-search">
            <Search size={17} aria-hidden="true" />
            Search reports
          </label>
          <div className="hm-maintenance-input-wrap">
            <Search size={20} aria-hidden="true" />
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
        </div>

        <div className="hm-maintenance-filter">
          <label htmlFor="maintenance-status">
            <SlidersHorizontal size={17} aria-hidden="true" />
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

        <div className="hm-maintenance-filter">
          <label htmlFor="maintenance-priority">
            <Flag size={17} aria-hidden="true" />
            Priority
          </label>
          <select
            id="maintenance-priority"
            value={priority}
            onChange={(event) => {
              setPriority(event.target.value as ReportPriorityFilter);
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
          className="hm-maintenance-clear"
          onClick={clearFilters}
          disabled={!hasFilters}
        >
          <X size={17} aria-hidden="true" />
          Clear filters
        </button>
      </section>

      <div className="hm-maintenance-section-heading">
        <div>
          <p className="hm-maintenance-section-kicker">OPERATIONS OVERVIEW</p>
          <h2>Report Register</h2>
          <p>Current aircraft maintenance records and their progress.</p>
        </div>
        <span className="hm-maintenance-total" aria-live="polite">
          <ClipboardList size={16} aria-hidden="true" />
          {loading ? "Loading" : error ? "Unavailable" : `${result.total} reports`}
        </span>
      </div>

      {/* Request states */}
      {loading && (
        <div className="hm-maintenance-state" role="status">
          <LoaderCircle className="hm-maintenance-spinner" size={36} aria-hidden="true" />
          <h3>Loading maintenance reports</h3>
          <p>Retrieving the latest maintenance records...</p>
        </div>
      )}

      {!loading && error && (
        <div className="hm-maintenance-state hm-maintenance-state--error" role="alert">
          <AlertCircle size={35} aria-hidden="true" />
          <h3>Unable to load reports</h3>
          <p>{error}</p>
          <button
            type="button"
            className="hm-maintenance-retry"
            onClick={() => setRetryCount((current) => current + 1)}
          >
            <RefreshCw size={17} aria-hidden="true" />
            Try again
          </button>
        </div>
      )}

      {!loading && !error && result.items.length === 0 && (
        <div className="hm-maintenance-state">
          <ClipboardList size={36} aria-hidden="true" />
          <h3>No reports found</h3>
          <p>
            {hasFilters
              ? "No maintenance reports match the selected filters."
              : "There are no maintenance reports to display yet."}
          </p>
          {hasFilters && (
            <button type="button" className="hm-maintenance-retry" onClick={clearFilters}>
              <X size={17} aria-hidden="true" />
              Clear filters
            </button>
          )}
        </div>
      )}

      {/* Report table - becomes stacked cards on smaller screens */}
      {!loading && !error && result.items.length > 0 && (
        <>
          <div className="hm-maintenance-table-wrap">
            <table className="hm-maintenance-table">
              <thead>
                <tr>
                  <th scope="col">Report</th>
                  <th scope="col">Aircraft</th>
                  <th scope="col">Priority</th>
                  <th scope="col">Status</th>
                  <th scope="col">Reported</th>
                  <th scope="col">Assigned to</th>
                </tr>
              </thead>
              <tbody>
                {result.items.map((report) => (
                  <tr key={report.id}>
                    <td className="hm-maintenance-report-cell" data-label="Report">
                      <Link
                        to={`/app/maintenance/${report.id}`}
                        className="hm-maintenance-report-link"
                      >
                        <span>{report.title}</span>
                        <ArrowUpRight size={16} aria-hidden="true" />
                      </Link>
                      <p className="hm-maintenance-report-description">
                        {report.description}
                      </p>
                    </td>
                    <td data-label="Aircraft">
                      <span
                        className="hm-maintenance-aircraft"
                        title={report.aircraft_tail_number || "Aircraft unavailable"}
                      >
                        <Plane size={16} aria-hidden="true" />
                        {report.aircraft_tail_number || "Aircraft unavailable"}
                      </span>
                    </td>
                    <td data-label="Priority">
                      <span className={`hm-maintenance-chip hm-maintenance-priority-${toClassName(report.priority)}`}>
                        <span className="hm-maintenance-chip-dot" aria-hidden="true" />
                        {report.priority}
                      </span>
                    </td>
                    <td data-label="Status">
                      <span className={`hm-maintenance-chip hm-maintenance-status-${toClassName(report.status)}`}>
                        <span className="hm-maintenance-chip-dot" aria-hidden="true" />
                        {formatStatus(report.status)}
                      </span>
                    </td>
                    <td data-label="Reported">
                      <span className="hm-maintenance-muted-cell">
                        <CalendarDays size={15} aria-hidden="true" />
                        {formatDate(report.reported_at)}
                      </span>
                    </td>
                    <td data-label="Assigned to">
                      <span className="hm-maintenance-muted-cell hm-maintenance-assignee">
                        <UserRound size={15} aria-hidden="true" />
                        {report.assigned_to_name || (report.assigned_to ? "Name unavailable" : "Unassigned")}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="hm-maintenance-list-footer">
            <p className="hm-maintenance-results-count">
              Showing <strong>{result.items.length}</strong> of <strong>{result.total}</strong> reports
            </p>
            <nav className="hm-maintenance-pagination" aria-label="Maintenance reports pages">
              <button
                type="button"
                onClick={() => setPage((current) => Math.max(1, current - 1))}
                disabled={page <= 1}
              >
                <ChevronLeft size={17} aria-hidden="true" />
                Previous
              </button>
              <span>Page <strong>{page}</strong> of {totalPages}</span>
              <button
                type="button"
                onClick={() => setPage((current) => Math.min(totalPages, current + 1))}
                disabled={page >= totalPages}
              >
                Next
                <ChevronRight size={17} aria-hidden="true" />
              </button>
            </nav>
          </div>
        </>
      )}
    </section>
  );
}

export default MaintenanceReports;
