import { useEffect, useState } from "react";
import type { FormEvent } from "react";
import { Link, useNavigate } from "react-router";
import {
  ArrowLeft,
  CircleAlert,
  ClipboardList,
  FileText,
  Flag,
  Info,
  LoaderCircle,
  Plane,
  Plus,
  Save,
  SearchCheck,
  ShieldCheck,
  Wrench,
} from "lucide-react";

import { getAircraftList } from "../../services/aircraftService";
import { createMaintenanceReport } from "../../services/maintenanceService";
import type { Aircraft } from "../../types/aircraft";
import type { MaintenanceReport } from "../../types/maintenance";

import "./MaintenanceReportForm.css";

type ReportPriority = MaintenanceReport["priority"];

function MaintenanceReportForm() {
  const navigate = useNavigate();

  const [aircraft, setAircraft] = useState<Aircraft[]>([]);
  const [aircraftLoading, setAircraftLoading] = useState(true);
  const [aircraftError, setAircraftError] = useState("");

  const [aircraftId, setAircraftId] = useState("");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [priority, setPriority] = useState<ReportPriority>("Medium");

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  // Keep the original aircraft request and its existing pagination contract.
  useEffect(() => {
    let cancelled = false;

    async function loadAircraft(): Promise<void> {
      setAircraftLoading(true);
      setAircraftError("");

      try {
        const result = await getAircraftList({ page: 1, page_size: 100 });
        if (cancelled) return;

        setAircraft(result.items);

        if (result.items.length === 0) {
          setAircraftError(
            "No aircraft are available. Add an aircraft before creating a report.",
          );
        }
      } catch {
        if (!cancelled) {
          setAircraftError("Could not load aircraft. Please try again.");
        }
      } finally {
        if (!cancelled) setAircraftLoading(false);
      }
    }

    void loadAircraft();
    return () => {
      cancelled = true;
    };
  }, []);

  // Preserve the original validation and API creation flow.
  async function handleSubmit(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    if (submitting) return;
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
      setError("The description must contain at least 10 characters.");
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
    <section className="hm-maint-form-page">
      <Link to="/app/maintenance" className="hm-maint-form-back">
        <ArrowLeft size={18} aria-hidden="true" />
        Back to Maintenance Reports
      </Link>

      {/* Hero: consistent with the Aircraft and Maintenance list pages. */}
      <header className="hm-maint-form-hero">
        <div className="hm-maint-form-hero-content">
          <p className="hm-maint-form-hero-eyebrow">
            <span className="hm-maint-form-pulse" aria-hidden="true" />
            FLEET OPERATIONS / MAINTENANCE
          </p>
          <p className="hm-maint-form-hero-kicker">NEW MAINTENANCE RECORD</p>
          <h1>New Maintenance Report</h1>
          <p className="hm-maint-form-hero-description">
            Record an aircraft issue so the maintenance team can investigate
            and resolve it.
          </p>
          <div className="hm-maint-form-hero-note">
            <ShieldCheck size={17} aria-hidden="true" />
            Aircraft health &amp; safety
          </div>
        </div>
        <Wrench className="hm-maint-form-hero-watermark" size={240} strokeWidth={0.7} aria-hidden="true" />
        <span className="hm-maint-form-hero-tag">
          <Plus size={16} aria-hidden="true" /> NEW REPORT
        </span>
      </header>

      {/* One form across both sections: native validation and submit still work. */}
      <form
        className="hm-maint-form-content"
        onSubmit={(event) => void handleSubmit(event)}
      >
        <section className="hm-maint-form-panel" aria-labelledby="hm-maint-identification-heading">
          <div className="hm-maint-form-panel-heading">
            <span className="hm-maint-form-section-icon">
              <Plane size={23} aria-hidden="true" />
            </span>
            <div>
              <span className="hm-maint-form-section-eyebrow">SECTION 01 / 02</span>
              <h2 id="hm-maint-identification-heading">Aircraft &amp; Report Information</h2>
              <p>Identify the aircraft and give the issue a clear title.</p>
            </div>
          </div>

          <div className="hm-maint-form-grid">
            <div className="hm-maint-form-field">
              <label htmlFor="report-aircraft">
                <Plane size={16} aria-hidden="true" />
                Aircraft <span className="hm-maint-form-required" aria-hidden="true">*</span>
              </label>
              <select
                id="report-aircraft"
                value={aircraftId}
                onChange={(event) => setAircraftId(event.target.value)}
                required
                disabled={aircraftLoading || aircraft.length === 0 || submitting}
                aria-describedby="hm-maint-aircraft-hint"
              >
                <option value="">
                  {aircraftLoading ? "Loading aircraft..." : "Select an aircraft"}
                </option>
                {aircraft.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.tail_number} — {item.manufacturer} {item.model}
                  </option>
                ))}
              </select>
              <small id="hm-maint-aircraft-hint">
                Select the aircraft where the issue was found.
              </small>
            </div>

            <div className="hm-maint-form-field">
              <label htmlFor="report-title">
                <ClipboardList size={16} aria-hidden="true" />
                Report Title <span className="hm-maint-form-required" aria-hidden="true">*</span>
              </label>
              <input
                id="report-title"
                type="text"
                value={title}
                onChange={(event) => setTitle(event.target.value)}
                placeholder="e.g. Engine vibration"
                minLength={3}
                maxLength={150}
                required
                disabled={submitting}
                aria-describedby="hm-maint-title-hint"
              />
              <small id="hm-maint-title-hint">
                A short, descriptive title (3–150 characters).
              </small>
            </div>
          </div>
        </section>

        <section className="hm-maint-form-panel" aria-labelledby="hm-maint-issue-heading">
          <div className="hm-maint-form-panel-heading">
            <span className="hm-maint-form-section-icon hm-maint-form-section-icon--teal">
              <FileText size={23} aria-hidden="true" />
            </span>
            <div>
              <span className="hm-maint-form-section-eyebrow">SECTION 02 / 02</span>
              <h2 id="hm-maint-issue-heading">Issue &amp; Priority</h2>
              <p>Set the urgency and document what happened.</p>
            </div>
          </div>

          <div className="hm-maint-form-issue-grid">
            <div className="hm-maint-form-field hm-maint-form-priority">
              <label htmlFor="report-priority">
                <Flag size={16} aria-hidden="true" />
                Priority <span className="hm-maint-form-required" aria-hidden="true">*</span>
              </label>
              <select
                id="report-priority"
                value={priority}
                onChange={(event) => setPriority(event.target.value as ReportPriority)}
                required
                disabled={submitting}
                aria-describedby="hm-maint-priority-hint"
              >
                <option value="Low">Low</option>
                <option value="Medium">Medium</option>
                <option value="High">High</option>
                <option value="Critical">Critical</option>
              </select>
              <small id="hm-maint-priority-hint">
                Critical issues should be handled urgently.
              </small>
            </div>

            <div className="hm-maint-form-priority-info" data-priority={priority.toLowerCase()}>
              <Flag size={20} aria-hidden="true" />
              <div>
                <strong>{priority} priority</strong>
                <p>
                  {priority === "Critical"
                    ? "Urgent attention is recommended."
                    : priority === "High"
                      ? "This issue should be reviewed promptly."
                      : priority === "Medium"
                        ? "Standard maintenance review priority."
                        : "Lower-priority maintenance observation."}
                </p>
              </div>
            </div>

            <div className="hm-maint-form-field hm-maint-form-field--full">
              <label htmlFor="report-description">
                <FileText size={16} aria-hidden="true" />
                Issue Description <span className="hm-maint-form-required" aria-hidden="true">*</span>
              </label>
              <textarea
                id="report-description"
                value={description}
                onChange={(event) => setDescription(event.target.value)}
                placeholder="Describe what happened, where the issue was found, and any relevant details..."
                minLength={10}
                maxLength={2000}
                rows={6}
                required
                disabled={submitting}
                aria-describedby="hm-maint-description-hint hm-maint-description-counter"
              />
              <div className="hm-maint-form-description-meta">
                <small id="hm-maint-description-hint">
                  Include observations that may help the maintenance team.
                </small>
                <span id="hm-maint-description-counter" className="hm-maint-form-counter">
                  {description.length}/2000
                </span>
              </div>
            </div>
          </div>
        </section>

        <div className="hm-maint-form-info">
          <Info size={21} aria-hidden="true" />
          <p>
            The new report will start with the status <strong>Open</strong>.
            The server records the reporting user and timestamp automatically.
          </p>
        </div>

        {aircraftError && (
          <div className="hm-maint-form-error" role="alert">
            <CircleAlert size={19} aria-hidden="true" />
            {aircraftError}
          </div>
        )}

        {error && (
          <div className="hm-maint-form-error" role="alert">
            <CircleAlert size={19} aria-hidden="true" />
            {error}
          </div>
        )}

        <div className="hm-maint-form-actions">
          <div className="hm-maint-form-actions-note">
            <SearchCheck size={18} aria-hidden="true" />
            All fields are required
          </div>
          <div className="hm-maint-form-action-buttons">
            <Link to="/app/maintenance" className="hm-maint-form-cancel">
              Cancel
            </Link>
            <button
              type="submit"
              className="hm-maint-form-submit"
              disabled={submitting || aircraftLoading || aircraft.length === 0}
            >
              {submitting ? (
                <>
                  <LoaderCircle className="hm-maint-form-spinner" size={19} aria-hidden="true" />
                  Creating report...
                </>
              ) : (
                <>
                  <Save size={19} aria-hidden="true" />
                  Create Report
                </>
              )}
            </button>
          </div>
        </div>
      </form>
    </section>
  );
}

export default MaintenanceReportForm;
