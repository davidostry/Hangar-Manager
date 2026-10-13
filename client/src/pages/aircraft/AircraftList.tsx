import { useEffect, useState } from "react";
import type { FormEvent } from "react";
import { isAxiosError } from "axios";
import { Link } from "react-router";
import {
  CircleAlert,
  Eye,
  Filter,
  Pencil,
  Plane,
  Plus,
  RotateCcw,
  Search,
  X,
} from "lucide-react";

import { useAuth } from "../../context/AuthContext";
import { getAircraftList } from "../../services/aircraftService";

import type { Aircraft, AircraftStatus } from "../../types/aircraft";

import "./AircraftList.css";

type StatusFilter = AircraftStatus | "All";

function getErrorMessage(error: unknown): string {
  if (isAxiosError(error)) {
    if (!error.response) {
      return "Cannot connect to the Backend. Check that the server is running.";
    }

    const responseData = error.response.data as
      | { detail?: unknown }
      | undefined;

    const detail = responseData?.detail;

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

  if (error instanceof Error) {
    return error.message;
  }

  return "An unexpected error occurred while loading aircraft.";
}

function AircraftList() {
  const { user } = useAuth();
  const isAdmin =
    user?.role === "admin" || user?.role === "hangar_manager";

  const [aircraft, setAircraft] = useState<Aircraft[]>([]);
  const [total, setTotal] = useState(0);
  const [searchInput, setSearchInput] = useState("");
  const [appliedSearch, setAppliedSearch] = useState("");
  const [status, setStatus] = useState<StatusFilter>("All");
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");
  const [retryCount, setRetryCount] = useState(0);

  useEffect(() => {
    let isActive = true;

    async function loadAircraft(): Promise<void> {
      setIsLoading(true);
      setErrorMessage("");

      try {
        const result = await getAircraftList({
          search: appliedSearch || undefined,
          status: status === "All" ? undefined : status,
          page: 1,
          page_size: 100,
        });

        if (!isActive) return;

        if (Array.isArray(result)) {
          setAircraft(result);
          setTotal(result.length);
        } else if (result && Array.isArray(result.items)) {
          setAircraft(result.items);
          setTotal(result.total);
        } else {
          throw new Error("Invalid aircraft response");
        }
      } catch (error: unknown) {
        if (!isActive) return;

        setAircraft([]);
        setTotal(0);
        setErrorMessage(getErrorMessage(error));
      } finally {
        if (isActive) setIsLoading(false);
      }
    }

    void loadAircraft();

    return () => {
      isActive = false;
    };
  }, [appliedSearch, status, retryCount]);

  function handleSearchSubmit(event: FormEvent<HTMLFormElement>): void {
    event.preventDefault();
    setAppliedSearch(searchInput.trim());
  }

  function handleClearSearch(): void {
    setSearchInput("");
    setAppliedSearch("");
  }

  function handleStatusChange(value: string): void {
    if (
      value === "All" ||
      value === "Available" ||
      value === "Maintenance" ||
      value === "Inspection" ||
      value === "Grounded"
    ) {
      setStatus(value);
    }
  }

  function handleRetry(): void {
    setRetryCount((current) => current + 1);
  }

  const hasFilters = appliedSearch !== "" || status !== "All";

  return (
    <section className="aircraft-page">
      {/* Page heading and permission-based primary action */}
      <div className="page-heading aircraft-page-top">
        <div className="aircraft-page-copy">
          <p className="aircraft-kicker">Fleet Operations / Aircraft Register</p>
          <p className="page-eyebrow">Fleet Management</p>
          <h1>Aircraft</h1>
          <p className="page-description">
            View, search and filter the aircraft in your fleet.
          </p>
        </div>

        {/* Decorative airplane — same treatment as the Add Aircraft form. */}
        <div className="aircraft-hero-mark" aria-hidden="true">
          <Plane size={128} strokeWidth={0.8} />
        </div>

        {isAdmin && (
          <Link to="/app/aircraft/new" className="aircraft-button aircraft-add-button">
            <Plus size={19} strokeWidth={2.4} aria-hidden="true" />
            Add Aircraft
          </Link>
        )}
      </div>

      {/* Search runs on submit; status filtering runs on selection */}
      <section className="aircraft-toolbar" aria-label="Aircraft search and filters">
        <form className="aircraft-search-form" onSubmit={handleSearchSubmit}>
          <label className="aircraft-field-label" htmlFor="aircraft-search">
            <Search size={16} aria-hidden="true" />
            Search aircraft
          </label>

          <div className="aircraft-search-controls">
            <div className="aircraft-search-input">
              <Search size={19} aria-hidden="true" />
              <input
                id="aircraft-search"
                name="search"
                type="search"
                value={searchInput}
                onChange={(event) => setSearchInput(event.target.value)}
                placeholder="Tail number, model, manufacturer..."
              />
            </div>

            <button type="submit" className="aircraft-button aircraft-search-button">
              <Search size={18} aria-hidden="true" />
              Search
            </button>

            {(searchInput || appliedSearch) && (
              <button
                type="button"
                className="aircraft-button aircraft-button-secondary aircraft-clear-button"
                onClick={handleClearSearch}
              >
                <X size={17} aria-hidden="true" />
                Clear
              </button>
            )}
          </div>
        </form>

        <div className="aircraft-status-filter">
          <label className="aircraft-field-label" htmlFor="aircraft-status">
            <Filter size={16} aria-hidden="true" />
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

      {isLoading && (
        <div className="aircraft-state" role="status">
          <span className="aircraft-spinner" aria-hidden="true" />
          <p>Loading aircraft...</p>
        </div>
      )}

      {!isLoading && errorMessage && (
        <div className="aircraft-state aircraft-state-error">
          <CircleAlert size={30} aria-hidden="true" />
          <h2>Unable to load aircraft</h2>
          <p role="alert">{errorMessage}</p>
          <button type="button" className="aircraft-button" onClick={handleRetry}>
            <RotateCcw size={18} aria-hidden="true" />
            Try again
          </button>
        </div>
      )}

      {!isLoading && !errorMessage && aircraft.length === 0 && (
        <div className="aircraft-state aircraft-state-empty">
          <Plane size={32} aria-hidden="true" />
          <h2>{hasFilters ? "No aircraft found" : "No aircraft registered yet"}</h2>
          <p>
            {hasFilters
              ? "Try changing your search or selecting a different status."
              : "Add an aircraft to start building your fleet register."}
          </p>
          {isAdmin && (
            <Link to="/app/aircraft/new" className="aircraft-button">
              <Plus size={18} aria-hidden="true" />
              Add your first aircraft
            </Link>
          )}
        </div>
      )}

      {!isLoading && !errorMessage && aircraft.length > 0 && (
        <>
          <div className="aircraft-list-heading">
            <div>
              <h2>Fleet Register</h2>
              <p>Aircraft and their current operational status</p>
            </div>
            <span className="aircraft-total-pill">
              <Plane size={15} aria-hidden="true" />
              {total} aircraft
            </span>
          </div>

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

          <p className="aircraft-results-count">
            Showing {aircraft.length} of {total} aircraft
          </p>
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
      <td className="aircraft-tail-cell" data-label="Tail Number">
        <Link to={`/app/aircraft/${aircraft.id}`} className="aircraft-tail-link">
          <Plane size={16} strokeWidth={2} aria-hidden="true" />
          <span>{aircraft.tail_number}</span>
        </Link>
      </td>
      <td data-label="Manufacturer">{aircraft.manufacturer}</td>
      <td data-label="Model">{aircraft.model}</td>
      <td data-label="Serial Number">{aircraft.serial_number}</td>
      <td data-label="Year">{aircraft.manufacture_year}</td>
      <td data-label="Status">
        <span className={`aircraft-status-badge status-${aircraft.status.toLowerCase()}`}>
          {aircraft.status}
        </span>
      </td>
      <td data-label="Actions">
        <div className="aircraft-row-actions">
          <Link
            to={`/app/aircraft/${aircraft.id}`}
            className="aircraft-action aircraft-action-details"
          >
            <Eye size={16} aria-hidden="true" />
            Details
          </Link>

          {isAdmin && (
            <Link
              to={`/app/aircraft/${aircraft.id}/edit`}
              className="aircraft-action aircraft-action-edit"
            >
              <Pencil size={15} aria-hidden="true" />
              Edit
            </Link>
          )}
        </div>
      </td>
    </tr>
  );
}

export default AircraftList;
