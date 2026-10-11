import { useEffect, useState } from "react";
import type { FormEvent } from "react";
import { isAxiosError } from "axios";
import { Link } from "react-router";

import { getMaintenanceReports } from "../../services/maintenanceService";

import type {
  MaintenancePriority,
  MaintenanceReport,
  MaintenanceStatus,
} from "../../types/maintenance";

import "./MaintenanceReports.css";

type StatusFilter = MaintenanceStatus | "All";
type PriorityFilter = MaintenancePriority | "All";

const PAGE_SIZE = 10;

function getErrorMessage(error: unknown): string {
  if (isAxiosError(error)) {
    if (!error.response) {
      return "Cannot connect to the Backend. Check that the server is running.";
    }

    const data = error.response.data as
      | { detail?: unknown }
      | undefined;

    const detail = data?.detail;

    if (typeof detail === "string" && detail.trim()) {
      return detail;
    }

    if (Array.isArray(detail)) {
      const messages = detail
        .filter(
          (item): item is { msg: string } =>
            typeof item === "object" &&
            item !== null &&
            "msg" in item &&
            typeof item.msg === "string",
        )
        .map((item) => item.msg);

      if (messages.length > 0) {
        return messages.join(" ");
      }

      return "Please check the submitted information.";
    }

    return `Failed to load reports. HTTP status: ${error.response.status}.`;
  }

  if (error instanceof Error) {
    return error.message;
  }

  return "An unexpected error occurred.";
}

function formatDate(value: string): string {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "Invalid date";
  }

  return new Intl.DateTimeFormat("en-GB", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

function formatStatus(status: MaintenanceStatus): string {
  switch (status) {
    case "Open":
      return "Open";
    case "InProgress":
      return "In Progress";
    case "Resolved":
      return "Resolved";
    case "Cancelled":
      return "Cancelled";
  }
}

function MaintenanceReports() {
  const [reports, setReports] = useState<MaintenanceReport[]>([]);
  const [total, setTotal] = useState(0);

  const [searchInput, setSearchInput] = useState("");
  const [appliedSearch, setAppliedSearch] = useState("");

  const [status, setStatus] = useState<StatusFilter>("All");
  const [priority, setPriority] = useState<PriorityFilter>("All");

  const [page, setPage] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");
  const [retryCount, setRetryCount] = useState(0);

  useEffect(() => {
    let isActive = true;

    async function loadReports(): Promise<void> {
      setIsLoading(true);
      setErrorMessage("");

      try {
        const result = await getMaintenanceReports({
          search: appliedSearch || undefined,
          status: status === "All" ? undefined : status,
          priority: priority === "All" ? undefined : priority,
          page,
          page_size: PAGE_SIZE,
        });

        if (!isActive) {
          return;
        }

        setReports(result.items);
        setTotal(result.total);
      } catch (error: unknown) {
        if (!isActive) {
          return;
        }

        setReports([]);
        setTotal(0);
        setErrorMessage(getErrorMessage(error));
      } finally {
        if (isActive) {
          setIsLoading(false);
        }
      }
    }

    void loadReports();

    return () => {
      isActive = false;
    };
  }, [appliedSearch, status, priority, page, retryCount]);

  function handleSearchSubmit(
    event: FormEvent<HTMLFormElement>,
  ): void {
    event.preventDefault();
    setPage(1);
    setAppliedSearch(searchInput.trim());
  }

  function handleClearSearch(): void {
    setSearchInput("");
    setAppliedSearch("");
    setPage(1);
  }

  function handleStatusChange(value: string): void {
    if (
      value === "All" ||
      value === "Open" ||
      value === "InProgress" ||
      value === "Resolved" ||
      value === "Cancelled"
    ) {
      setStatus(value);
      setPage(1);
    }
  }

  function handlePriorityChange(value: string): void {
    if (
      value === "All" ||
      value === "Low" ||
      value === "Medium" ||
      value === "High" ||
      value === "Critical"
    ) {
      setPriority(value);
      setPage(1);
    }
  }

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <section className="maintenance-page">
      <div className="page-heading">
        <p className="page-eyebrow">Aircraft Care</p>

        <h1>Maintenance Reports</h1>

        <p className="page-description">
          Review reported issues and monitor maintenance progress
          across your aircraft fleet.
        </p>
      </div>

      <section
        className="maintenance-toolbar"
        aria-label="Search and filter maintenance reports"
      >
        <form
          className="maintenance-search-form"
          onSubmit={handleSearchSubmit}
        >
          <label htmlFor="maintenance-search">
            Search reports
          </label>

          <div className="maintenance-search-controls">
            <input
              id="maintenance-search"
              type="search"
              value={searchInput}
              onChange={(event) =>
                setSearchInput(event.target.value)
              }
              placeholder="Search title, description or aircraft ID"
            />

            <button
              type="submit"
              className="maintenance-button"
            >
              Search
            </button>

            {(searchInput || appliedSearch) && (
              <button
                type="button"
                className="maintenance-button maintenance-button-secondary"
                onClick={handleClearSearch}
              >
                Clear
              </button>
            )}
          </div>
        </form>

        <div className="maintenance-filter">
          <label htmlFor="maintenance-status">
            Status
          </label>

          <select
            id="maintenance-status"
            value={status}
            onChange={(event) =>
              handleStatusChange(event.target.value)
            }
          >
            <option value="All">All statuses</option>
            <option value="Open">Open</option>
            <option value="InProgress">In Progress</option>
            <option value="Resolved">Resolved</option>
            <option value="Cancelled">Cancelled</option>
          </select>
        </div>

        <div className="maintenance-filter">
          <label htmlFor="maintenance-priority">
            Priority
          </label>

          <select
            id="maintenance-priority"
            value={priority}
            onChange={(event) =>
              handlePriorityChange(event.target.value)
            }
          >
            <option value="All">All priorities</option>
            <option value="Low">Low</option>
            <option value="Medium">Medium</option>
            <option value="High">High</option>
            <option value="Critical">Critical</option>
          </select>
        </div>
      </section>

      {isLoading && (
        <div className="maintenance-state" role="status">
          <span
            className="maintenance-spinner"
            aria-hidden="true"
          />
          <p>Loading maintenance reports...</p>
        </div>
      )}

      {!isLoading && errorMessage && (
        <div className="maintenance-state maintenance-state-error">
          <h2>Unable to load reports</h2>

          <p role="alert">{errorMessage}</p>

          <button
            type="button"
            className="maintenance-button"
            onClick={() => setRetryCount((count) => count + 1)}
          >
            Try again
          </button>
        </div>
      )}

      {!isLoading &&
        !errorMessage &&
        reports.length === 0 && (
          <div className="maintenance-state">
            <h2>No maintenance reports found</h2>

            <p>
              Try changing your search or selecting different filters.
            </p>
          </div>
        )}

      {!isLoading &&
        !errorMessage &&
        reports.length > 0 && (
          <>
            <div className="maintenance-table-wrapper">
              <table className="maintenance-table">
                <thead>
                  <tr>
                    <th scope="col">Report</th>
                    <th scope="col">Aircraft ID</th>
                    <th scope="col">Priority</th>
                    <th scope="col">Status</th>
                    <th scope="col">Reported</th>
                    <th scope="col">Assigned To</th>
                  </tr>
                </thead>

                <tbody>
                  {reports.map((report) => (
                    <tr key={report.id}>
                      <td>
                        <div className="maintenance-report-cell">
                          <Link
                            className="maintenance-report-link"
                            to={`/app/maintenance/${report.id}`}
                            aria-label={`View details for ${report.title}`}
                          >
                            {report.title}
                          </Link>

                          <p className="maintenance-report-description">
                            {report.description}
                          </p>
                        </div>
                      </td>

                      <td>
                        <span
                          className="maintenance-aircraft-id"
                          title={report.aircraft_id}
                        >
                          {report.aircraft_id.slice(0, 8)}
                        </span>
                      </td>

                      <td>
                        <span
                          className={`maintenance-priority priority-${report.priority.toLowerCase()}`}
                        >
                          {report.priority}
                        </span>
                      </td>

                      <td>
                        <span
                          className={`maintenance-status status-${report.status.toLowerCase()}`}
                        >
                          {formatStatus(report.status)}
                        </span>
                      </td>

                      <td>{formatDate(report.reported_at)}</td>

                      <td>
                        {report.assigned_to
                          ? report.assigned_to.slice(0, 8)
                          : "Unassigned"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="maintenance-pagination">
              <p>
                Showing {reports.length} of {total} reports
              </p>

              <div className="maintenance-pagination-controls">
                <button
                  type="button"
                  className="maintenance-button maintenance-button-secondary"
                  disabled={page <= 1}
                  onClick={() =>
                    setPage((current) => Math.max(1, current - 1))
                  }
                >
                  Previous
                </button>

                <span>
                  Page {page} of {totalPages}
                </span>

                <button
                  type="button"
                  className="maintenance-button maintenance-button-secondary"
                  disabled={page >= totalPages}
                  onClick={() =>
                    setPage((current) =>
                      Math.min(totalPages, current + 1),
                    )
                  }
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