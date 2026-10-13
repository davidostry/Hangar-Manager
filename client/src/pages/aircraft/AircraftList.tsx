
import { useEffect, useState } from "react";
import type { FormEvent } from "react";
import { isAxiosError } from "axios";
import { Link } from "react-router";

import { useAuth } from "../../context/AuthContext";
import { getAircraftList } from "../../services/aircraftService";

import type {
  Aircraft,
  AircraftStatus,
} from "../../types/aircraft";

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
  const isAdmin = user?.role === "admin" || user?.role === "hangar_manager";

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

        if (!isActive) {
          return;
        }
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
        if (!isActive) {
          return;
        }

        setAircraft([]);
        setTotal(0);
        setErrorMessage(getErrorMessage(error));
      } finally {
        if (isActive) {
          setIsLoading(false);
        }
      }
    }

    void loadAircraft();

    return () => {
      isActive = false;
    };
  }, [appliedSearch, status, retryCount]);

  function handleSearchSubmit(
    event: FormEvent<HTMLFormElement>,
  ): void {
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

  return (
    <section className="aircraft-page">
      <div className="page-heading aircraft-page-top">
        <div>
          <p className="page-eyebrow">Fleet Management</p>
          <h1>Aircraft</h1>
          <p className="page-description">
            View, search and filter the aircraft in your fleet.
          </p>
        </div>

        {isAdmin && (
          <Link
            to="/app/aircraft/new"
            className="aircraft-button"
          >
            + Add Aircraft
          </Link>
        )}
      </div>

      <section
        className="aircraft-toolbar"
        aria-label="Aircraft search and filters"
      >
        <form
          className="aircraft-search-form"
          onSubmit={handleSearchSubmit}
        >
          <label
            className="aircraft-search-label"
            htmlFor="aircraft-search"
          >
            Search aircraft
          </label>

          <div className="aircraft-search-controls">
            <input
              id="aircraft-search"
              name="search"
              type="search"
              value={searchInput}
              onChange={(event) =>
                setSearchInput(event.target.value)
              }
              placeholder="Tail number, model, manufacturer..."
            />

            <button type="submit" className="aircraft-button">
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
            Filter by status
          </label>

          <select
            id="aircraft-status"
            value={status}
            onChange={(event) =>
              handleStatusChange(event.target.value)
            }
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
          <span
            className="aircraft-spinner"
            aria-hidden="true"
          />
          <p>Loading aircraft...</p>
        </div>
      )}

      {!isLoading && errorMessage && (
        <div className="aircraft-state aircraft-state-error">
          <h2>Unable to load aircraft</h2>

          <p role="alert">{errorMessage}</p>

          <button
            type="button"
            className="aircraft-button"
            onClick={handleRetry}
          >
            Try again
          </button>
        </div>
      )}

      {!isLoading &&
        !errorMessage &&
        aircraft.length === 0 && (
          <div className="aircraft-state">
            <h2>No aircraft found</h2>

            <p>
              Try changing your search or selecting a different status.
            </p>

            {isAdmin && (
              <Link
                to="/app/aircraft/new"
                className="aircraft-button"
              >
                Add your first aircraft
              </Link>
            )}
          </div>
        )}

      {!isLoading &&
        !errorMessage &&
        aircraft.length > 0 && (
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
                    <AircraftRow
                      key={item.id}
                      aircraft={item}
                      isAdmin={isAdmin}
                    />
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

function AircraftRow({
  aircraft,
  isAdmin,
}: AircraftRowProps) {
  return (
    <tr>
      <td className="aircraft-tail-number">
        {aircraft.tail_number}
      </td>

      <td>{aircraft.manufacturer}</td>

      <td>{aircraft.model}</td>

      <td>{aircraft.serial_number}</td>

      <td>{aircraft.manufacture_year}</td>

      <td>
        <span
          className={`aircraft-status-badge status-${aircraft.status.toLowerCase()}`}
        >
          {aircraft.status}
        </span>
      </td>

      <td>
        <div className="aircraft-row-actions">
          <Link
            to={`/app/aircraft/${aircraft.id}`}
            className="aircraft-button aircraft-button-secondary"
          >
            Details
          </Link>

          {isAdmin && (
            <Link
              to={`/app/aircraft/${aircraft.id}/edit`}
              className="aircraft-button"
            >
              Edit
            </Link>
          )}
        </div>
      </td>
    </tr>
  );
}

export default AircraftList;
