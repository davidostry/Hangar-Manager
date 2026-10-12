import { useEffect, useState } from "react";
import type { FormEvent } from "react";
import { Link, useNavigate } from "react-router";
import { getAircraftList } from "../../services/aircraftService";
import {
  createMaintenanceReport,
} from "../../services/maintenanceService";
import type { Aircraft } from "../../types/aircraft";
import type { MaintenanceReport } from "../../types/maintenance";
import "./MaintenanceReports.css";

type ReportPriority = MaintenanceReport["priority"];

function MaintenanceReportForm() {
  const navigate = useNavigate();

  const [aircraft, setAircraft] = useState<Aircraft[]>([]);
  const [aircraftLoading, setAircraftLoading] = useState(true);
  const [aircraftError, setAircraftError] = useState("");

  const [aircraftId, setAircraftId] = useState("");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [priority, setPriority] =
    useState<ReportPriority>("Medium");

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;

    async function loadAircraft() {
      setAircraftLoading(true);
      setAircraftError("");

      try {
        const result = await getAircraftList({
          page: 1,
          page_size: 100,
        });

        if (cancelled) {
          return;
        }

        setAircraft(result.items);

        if (result.items.length === 0) {
          setAircraftError(
            "No aircraft are available. Add an aircraft before creating a report.",
          );
        }
      } catch {
        if (!cancelled) {
          setAircraftError(
            "Could not load aircraft. Please try again.",
          );
        }
      } finally {
        if (!cancelled) {
          setAircraftLoading(false);
        }
      }
    }

    void loadAircraft();

    return () => {
      cancelled = true;
    };
  }, []);

  async function handleSubmit(
    event: FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();
    setError("");

    if (!aircraftId) {
      setError("Please select an aircraft.");
      return;
    }

    if (title.trim().length < 3) {
      setError("The title must contain at least 3 characters.");
      return;
    }

    if (description.trim().length < 10) {
      setError(
        "The description must contain at least 10 characters.",
      );
      return;
    }

    setSubmitting(true);

    try {
      const report = await createMaintenanceReport({
        aircraft_id: aircraftId,
        title: title.trim(),
        description: description.trim(),
        priority,
      });

      navigate(`/app/maintenance/${report.id}`);
    } catch {
      setError(
        "The report could not be created. Check the details and try again.",
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <section className="maintenance-page">
      <div className="page-heading">
        <p className="page-eyebrow">Fleet maintenance</p>
        <h1>New Maintenance Report</h1>
        <p className="page-description">
          Record an aircraft issue so the maintenance team can
          investigate and resolve it.
        </p>
      </div>

      <div className="maintenance-form-card">
        <div className="maintenance-form-heading">
          <span className="maintenance-form-icon" aria-hidden="true">
            +
          </span>

          <div>
            <h2>Create a report</h2>
            <p>
              Enter the aircraft and issue details below.
            </p>
          </div>
        </div>

        {aircraftError && (
          <div className="maintenance-form-error" role="alert">
            {aircraftError}
          </div>
        )}

        {error && (
          <div className="maintenance-form-error" role="alert">
            {error}
          </div>
        )}

        <form
          className="maintenance-create-form"
          onSubmit={handleSubmit}
        >
          <div className="maintenance-create-field">
            <label htmlFor="report-aircraft">
              Aircraft <span aria-hidden="true">*</span>
            </label>

            <select
              id="report-aircraft"
              value={aircraftId}
              onChange={(event) =>
                setAircraftId(event.target.value)
              }
              required
              disabled={
                aircraftLoading || aircraft.length === 0
              }
            >
              <option value="">
                {aircraftLoading
                  ? "Loading aircraft..."
                  : "Select an aircraft"}
              </option>

              {aircraft.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.tail_number} — {item.manufacturer}{" "}
                  {item.model}
                </option>
              ))}
            </select>

            <p className="maintenance-form-hint">
              Select the aircraft where the issue was found.
            </p>
          </div>

          <div className="maintenance-create-field">
            <label htmlFor="report-title">
              Report title <span aria-hidden="true">*</span>
            </label>

            <input
              id="report-title"
              type="text"
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              placeholder="For example: Engine vibration"
              minLength={3}
              maxLength={150}
              required
            />
          </div>

          <div className="maintenance-create-field">
            <label htmlFor="report-priority">
              Priority <span aria-hidden="true">*</span>
            </label>

            <select
              id="report-priority"
              value={priority}
              onChange={(event) =>
                setPriority(event.target.value as ReportPriority)
              }
              required
            >
              <option value="Low">Low</option>
              <option value="Medium">Medium</option>
              <option value="High">High</option>
              <option value="Critical">Critical</option>
            </select>

            <p className="maintenance-form-hint">
              Critical issues should be handled urgently.
            </p>
          </div>

          <div className="maintenance-create-field">
            <label htmlFor="report-description">
              Issue description{" "}
              <span aria-hidden="true">*</span>
            </label>

            <textarea
              id="report-description"
              value={description}
              onChange={(event) =>
                setDescription(event.target.value)
              }
              placeholder="Describe what happened, where the issue was found, and any relevant details..."
              minLength={10}
              maxLength={2000}
              rows={6}
              required
            />

            <div className="maintenance-description-counter">
              {description.length}/2000 characters
            </div>
          </div>

          <div className="maintenance-form-note">
            The new report will start with the status{" "}
            <strong>Open</strong>. The server is responsible
            for recording the reporting user and timestamp.
          </div>

          <div className="maintenance-form-actions">
            <Link
              to="/app/maintenance"
              className="maintenance-cancel-link"
            >
              Cancel
            </Link>

            <button
              type="submit"
              disabled={
                submitting ||
                aircraftLoading ||
                aircraft.length === 0
              }
            >
              {submitting
                ? "Creating report..."
                : "Create report"}
            </button>
          </div>
        </form>
      </div>
    </section>
  );
}

export default MaintenanceReportForm;