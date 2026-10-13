import { useEffect, useState } from "react";
import type { FormEvent } from "react";
import { isAxiosError } from "axios";
import { Link, useSearchParams } from "react-router";
import {
  ArrowRight,
  ChevronLeft,
  ChevronRight,
  CircleAlert,
  Pencil,
  Plane,
  Plus,
  RefreshCw,
  RotateCcw,
  Search,
  SlidersHorizontal,
} from "lucide-react";

import { useAuth } from "../../context/AuthContext";
import { getAircraftList } from "../../services/aircraftService";
import type { Aircraft, AircraftStatus } from "../../types/aircraft";
import "./AircraftList.css";

type StatusFilter = AircraftStatus | "All";

const PAGE_SIZE = 10;

const STATUS_OPTIONS: StatusFilter[] = [
  "All",
  "Available",
  "Maintenance",
  "Inspection",
  "Grounded",
];

function isStatusFilter(value: string | null): value is StatusFilter {
  return value !== null && STATUS_OPTIONS.some((option) => option === value);
}

function getErrorMessage(error: unknown): string {
  if (isAxiosError(error)) {
    if (!error.response) {
      return "Cannot connect to the Backend. Check that the server is running.";
    }

    const responseData: unknown = error.response.data;
    const detail =
      typeof responseData === "object" &&
      responseData !== null &&
      "detail" in responseData
        ? responseData.detail
        : undefined;

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
    }

    return `Failed to load aircraft. HTTP status: ${error.response.status}.`;
  }

  return error instanceof Error
    ? error.message
    : "An unexpected error occurred while loading aircraft.";
}

function AircraftList() {
  const { user } = useAuth();
  const isAdmin = user?.role === "admin";

  const [searchParams, setSearchParams] = useSearchParams();
  const statusFromUrl = searchParams.get("status");
  const status: StatusFilter = isStatusFilter(statusFromUrl)
    ? statusFromUrl
    : "All";

  const [aircraft, setAircraft] = useState<Aircraft[]>([]);
  const [total, setTotal] = useState(0);
  const [searchInput, setSearchInput] = useState("");
  const [appliedSearch, setAppliedSearch] = useState("");
  const [page, setPage] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");
  const [retryCount, setRetryCount] = useState(0);

  // Query parameters make links such as /app/aircraft?status=Maintenance work.
  function handleStatusChange(value: string): void {
    if (!isStatusFilter(value)) return;

    const nextParams = new URLSearchParams(searchParams);
    if (value === "All") {
      nextParams.delete("status");
    } else {
      nextParams.set("status", value);
    }
    setSearchParams(nextParams);
    setPage(1);
  }

  useEffect(() => {
    let active = true;

    async function loadAircraft(): Promise<void> {
      setIsLoading(true);
      setErrorMessage("");

      try {
        const result = await getAircraftList({
          search: appliedSearch || undefined,
          status: status === "All" ? undefined : status,
          page,
          page_size: PAGE_SIZE,
        });

        if (!active) return;

        // Keep compatibility with both response shapes used by the existing service.
        if (Array.isArray(result)) {
          setTotal(result.length);
          setAircraft(result.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE));
        } else if (result && Array.isArray(result.items)) {
          setAircraft(result.items);
          setTotal(result.total);
        } else {
          throw new Error("Invalid aircraft response from the Backend.");
        }
      } catch (error: unknown) {
        if (!active) return;
        setAircraft([]);
        setTotal(0);
        setErrorMessage(getErrorMessage(error));
      } finally {
        if (active) setIsLoading(false);
      }
    }

    void loadAircraft();
    return () => {
      active = false;
    };
  }, [appliedSearch, status, page, retryCount]);

  function handleSearchSubmit(event: FormEvent<HTMLFormElement>): void {
    event.preventDefault();
    setAppliedSearch(searchInput.trim());
    setPage(1);
  }

  function handleClearSearch(): void {
    setSearchInput("");
    setAppliedSearch("");
    setPage(1);
  }

  function handleResetFilters(): void {
    setSearchInput("");
    setAppliedSearch("");
    setPage(1);
    const nextParams = new URLSearchParams(searchParams);
    nextParams.delete("status");
    setSearchParams(nextParams);
  }

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const hasFilters = Boolean(appliedSearch) || status !== "All";
  const firstResult = total === 0 ? 0 : (page - 1) * PAGE_SIZE + 1;
  const lastResult = Math.min(page * PAGE_SIZE, total);

  return (
    <section className="aircraft-page">
      <div className="page-heading aircraft-page-top">
        <div>
          <p className="page-eyebrow">Fleet Management</p>
          <h1>Aircraft</h1>
          <p className="page-description">
            Explore your fleet, check aircraft status and manage registered aircraft.
          </p>
        </div>

        {isAdmin && (
          <Link to="/app/aircraft/new" className="aircraft-button aircraft-button-primary">
            <Plus size={18} strokeWidth={2.3} aria-hidden="true" />
            Add Aircraft
          </Link>
        )}
      </div>

      <section className="aircraft-toolbar" aria-label="Aircraft search and filters">
        <form className="aircraft-search-form" onSubmit={handleSearchSubmit}>
          <label className="aircraft-search-label" htmlFor="aircraft-search">
            Search aircraft
          </label>
          <div className="aircraft-search-controls">
            <div className="aircraft-search-input-wrap">
              <Search className="aircraft-search-icon" size={19} aria-hidden="true" />
              <input
                id="aircraft-search"
                name="search"
                type="search"
                value={searchInput}
                onChange={(event) => setSearchInput(event.target.value)}
                placeholder="Tail number, model, manufacturer..."
              />
            </div>
            <button type="submit" className="aircraft-button aircraft-button-primary">
              Search
            </button>
            {(searchInput || appliedSearch) && (
              <button
                type="button"
                className="aircraft-button aircraft-button-secondary"
                onClick={handleClearSearch}
              >
                Clear
              </button>
            )}
          </div>
        </form>

        <div className="aircraft-status-filter">
          <label htmlFor="aircraft-status">
            <SlidersHorizontal size={16} aria-hidden="true" />
            Filter by status
          </label>
          <select
            id="aircraft-status"
            value={status}
            onChange={(event) => handleStatusChange(event.target.value)}
          >
            <option value="All">All statuses</option>
            <option value="Available">Available</option>
            <option value="Maintenance">Maintenance</option>
            <option value="Inspection">Inspection</option>
            <option value="Grounded">Grounded</option>
          </select>
        </div>
      </section>

      <div className="aircraft-list-meta" aria-live="polite">
        <div className="aircraft-meta-heading">
          <span className="aircraft-meta-icon" aria-hidden="true"><Plane size={17} /></span>
          <strong>Fleet inventory</strong>
          {!isLoading && !errorMessage && (
            <span className="aircraft-count-pill">{total} aircraft</span>
          )}
        </div>
        <div className="aircraft-meta-actions">
          {hasFilters && (
            <button
              type="button"
              className="aircraft-text-button"
              onClick={handleResetFilters}
            >
              <RotateCcw size={15} aria-hidden="true" />
              Reset filters
            </button>
          )}
          <button
            type="button"
            className="aircraft-text-button"
            onClick={() => setRetryCount((count) => count + 1)}
            disabled={isLoading}
          >
            <RefreshCw size={15} aria-hidden="true" />
            Refresh
          </button>
        </div>
      </div>

      {isLoading && (
        <div className="aircraft-state" role="status">
          <span className="aircraft-spinner" aria-hidden="true" />
          <p>Loading aircraft...</p>
        </div>
      )}

      {!isLoading && errorMessage && (
        <div className="aircraft-state aircraft-state-error">
          <CircleAlert size={28} aria-hidden="true" />
          <h2>Unable to load aircraft</h2>
          <p role="alert">{errorMessage}</p>
          <button
            type="button"
            className="aircraft-button aircraft-button-primary"
            onClick={() => setRetryCount((count) => count + 1)}
          >
            <RefreshCw size={17} aria-hidden="true" />
            Try again
          </button>
        </div>
      )}

      {!isLoading && !errorMessage && aircraft.length === 0 && (
        <div className="aircraft-state aircraft-state-empty">
          <Plane size={32} aria-hidden="true" />
          <h2>No aircraft found</h2>
          <p>Try changing your search or selecting a different status.</p>
          {hasFilters ? (
            <button
              type="button"
              className="aircraft-button aircraft-button-secondary"
              onClick={handleResetFilters}
            >
              Clear all filters
            </button>
          ) : isAdmin ? (
            <Link to="/app/aircraft/new" className="aircraft-button aircraft-button-primary">
              <Plus size={17} aria-hidden="true" />
              Add your first aircraft
            </Link>
          ) : null}
        </div>
      )}

      {!isLoading && !errorMessage && aircraft.length > 0 && (
        <>
          <div className="aircraft-table-wrapper">
            <table className="aircraft-table">
              <thead>
                <tr>
                  <th scope="col">Tail Number</th>
                  <th scope="col">Manufacturer</th>
                  <th scope="col">Model</th>
                  <th scope="col">Serial Number</th>
                  <th scope="col">Year</th>
                  <th scope="col">Status</th>
                  <th scope="col">Actions</th>
                </tr>
              </thead>
              <tbody>
                {aircraft.map((item) => (
                  <AircraftRow key={item.id} aircraft={item} isAdmin={isAdmin} />
                ))}
              </tbody>
            </table>
          </div>

          <div className="aircraft-list-footer">
            <p className="aircraft-results-count">
              Showing <strong>{firstResult}–{lastResult}</strong> of <strong>{total}</strong> aircraft
            </p>
            {totalPages > 1 && (
              <nav className="aircraft-pagination" aria-label="Aircraft pages">
                <button
                  type="button"
                  className="aircraft-pagination-button"
                  disabled={page === 1 || isLoading}
                  onClick={() => setPage((current) => Math.max(1, current - 1))}
                >
                  <ChevronLeft size={17} aria-hidden="true" />
                  Previous
                </button>
                <span className="aircraft-page-number">Page {page} of {totalPages}</span>
                <button
                  type="button"
                  className="aircraft-pagination-button"
                  disabled={page >= totalPages || isLoading}
                  onClick={() => setPage((current) => Math.min(totalPages, current + 1))}
                >
                  Next
                  <ChevronRight size={17} aria-hidden="true" />
                </button>
              </nav>
            )}
          </div>
        </>
      )}
    </section>
  );
}

interface AircraftRowProps {
  aircraft: Aircraft;
  isAdmin: boolean;
}

function AircraftRow({ aircraft, isAdmin }: AircraftRowProps) {
  return (
    <tr>
      <td>
        <Link className="aircraft-tail-number" to={`/app/aircraft/${aircraft.id}`}>
          <Plane size={17} strokeWidth={2} aria-hidden="true" />
          {aircraft.tail_number}
        </Link>
      </td>
      <td>{aircraft.manufacturer}</td>
      <td className="aircraft-model-cell">{aircraft.model}</td>
      <td><span className="aircraft-serial">{aircraft.serial_number}</span></td>
      <td>{aircraft.manufacture_year}</td>
      <td>
        <span className={`aircraft-status-badge status-${aircraft.status.toLowerCase()}`}>
          {aircraft.status}
        </span>
      </td>
      <td>
        <div className="aircraft-row-actions">
          <Link
            to={`/app/aircraft/${aircraft.id}`}
            className="aircraft-action-link"
            aria-label={`View details for ${aircraft.tail_number}`}
          >
            Details <ArrowRight size={15} aria-hidden="true" />
          </Link>
          {isAdmin && (
            <Link
              to={`/app/aircraft/${aircraft.id}/edit`}
              className="aircraft-action-link aircraft-action-edit"
              aria-label={`Edit ${aircraft.tail_number}`}
            >
              <Pencil size={14} aria-hidden="true" /> Edit
            </Link>
          )}
        </div>
      </td>
    </tr>
  );
}

export default AircraftList;
