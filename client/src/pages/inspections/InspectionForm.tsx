import { useEffect, useState } from "react";
import type { FormEvent } from "react";
import { Link, useNavigate } from "react-router";
import {
  ArrowLeft,
  CalendarDays,
  CircleAlert,
  ClipboardCheck,
  ClipboardList,
  FileText,
  Info,
  LoaderCircle,
  Plane,
  Save,
  ShieldCheck,
} from "lucide-react";

import { getAircraftList } from "../../services/aircraftService";
import { createInspection } from "../../services/inspectionService";
import type { Aircraft } from "../../types/aircraft";
import type { InspectionCreateRequest } from "../../types/inspection";

import "./InspectionForm.css";

function InspectionForm() {
  const navigate = useNavigate();

  const [aircraft, setAircraft] = useState<Aircraft[]>([]);
  const [aircraftLoading, setAircraftLoading] = useState(true);
  const [aircraftError, setAircraftError] = useState("");

  const [aircraftId, setAircraftId] = useState("");
  const [inspectionType, setInspectionType] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [notes, setNotes] = useState("");

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  // Keep the existing aircraft list API and pagination behavior.
  useEffect(() => {
    let active = true;

    async function loadAircraft(): Promise<void> {
      setAircraftLoading(true);
      setAircraftError("");

      try {
        const response = await getAircraftList({ page: 1, page_size: 100 });
        if (!active) return;

        setAircraft(response.items);
        if (response.items.length === 0) {
          setAircraftError(
            "No aircraft are available. Add an aircraft before scheduling an inspection.",
          );
        }
      } catch {
        if (active) {
          setAircraftError(
            "Could not load the aircraft list. Please try again.",
          );
        }
      } finally {
        if (active) setAircraftLoading(false);
      }
    }

    void loadAircraft();
    return () => {
      active = false;
    };
  }, []);

  // Preserve field validation and the inspection creation API call.
  async function handleSubmit(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    if (submitting) return;
    setError("");

    if (!aircraftId) {
      setError("Please select an aircraft.");
      return;
    }
    if (inspectionType.trim().length < 3) {
      setError("The inspection type must contain at least 3 characters.");
      return;
    }
    if (!dueDate) {
      setError("Please select a due date.");
      return;
    }

    const payload: InspectionCreateRequest = {
      aircraft_id: aircraftId,
      inspection_type: inspectionType.trim(),
      due_date: dueDate,
      notes: notes.trim() || null,
    };

    setSubmitting(true);
    try {
      await createInspection(payload);
      navigate("/app/inspections");
    } catch (submissionError: unknown) {
      const message =
        submissionError instanceof Error
          ? submissionError.message
          : "An unexpected error occurred.";
      setError(`Could not create the inspection. ${message}`);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <section className="hm-inspection-form-page">
      <Link to="/app/inspections" className="hm-inspection-form-back">
        <ArrowLeft size={17} aria-hidden="true" />
        Back to Inspections
      </Link>

      {/* Compact aviation hero. */}
      <header className="hm-inspection-form-hero">
        <div className="hm-inspection-form-hero-content">
          <p className="hm-inspection-form-eyebrow">
            <span className="hm-inspection-form-pulse" aria-hidden="true" />
            COMPLIANCE &amp; SAFETY / INSPECTION SCHEDULING
          </p>
          <p className="hm-inspection-form-kicker">NEW INSPECTION RECORD</p>
          <h1>Schedule an Inspection</h1>
          <p className="hm-inspection-form-hero-description">
            Create an inspection task and set the date by which it needs to be completed.
          </p>
          <div className="hm-inspection-form-hero-footer">
            <span className="hm-inspection-form-hero-caption">
              <ShieldCheck size={17} aria-hidden="true" />
              Aircraft safety &amp; compliance
            </span>
            <span className="hm-inspection-form-hero-chip">
              <CalendarDays size={16} aria-hidden="true" />
              NEW SCHEDULE
            </span>
          </div>
        </div>
        <ClipboardCheck className="hm-inspection-form-hero-art" size={245} strokeWidth={0.75} aria-hidden="true" />
      </header>

      {/* Native HTML validation and all original form fields are retained. */}
      <form className="hm-inspection-form" onSubmit={(event) => void handleSubmit(event)}>
        {aircraftError && (
          <div className="hm-inspection-form-alert" role="alert">
            <CircleAlert size={20} aria-hidden="true" />
            <span>{aircraftError}</span>
          </div>
        )}
        {error && (
          <div className="hm-inspection-form-alert" role="alert">
            <CircleAlert size={20} aria-hidden="true" />
            <span>{error}</span>
          </div>
        )}

        <section className="hm-inspection-form-panel" aria-labelledby="inspection-identity-heading">
          <div className="hm-inspection-form-panel-heading">
            <span className="hm-inspection-form-section-icon">
              <Plane size={23} aria-hidden="true" />
            </span>
            <div>
              <p className="hm-inspection-form-section-eyebrow">SECTION 01 / 02</p>
              <h2 id="inspection-identity-heading">Aircraft &amp; Inspection</h2>
              <p className="hm-inspection-form-section-description">
                Identify the aircraft and the type of inspection required.
              </p>
            </div>
          </div>

          <div className="hm-inspection-form-grid">
            <div className="hm-inspection-form-field">
              <label htmlFor="inspection-aircraft">
                <Plane size={17} aria-hidden="true" />
                Aircraft <span className="hm-inspection-form-required" aria-hidden="true">*</span>
              </label>
              <select
                id="inspection-aircraft"
                value={aircraftId}
                onChange={(event) => setAircraftId(event.target.value)}
                aria-describedby="inspection-aircraft-hint"
                required
                disabled={aircraftLoading || aircraft.length === 0 || submitting}
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
              <small id="inspection-aircraft-hint">Select the aircraft that needs inspection.</small>
            </div>

            <div className="hm-inspection-form-field">
              <label htmlFor="inspection-type">
                <ClipboardList size={17} aria-hidden="true" />
                Inspection Type <span className="hm-inspection-form-required" aria-hidden="true">*</span>
              </label>
              <input
                id="inspection-type"
                type="text"
                value={inspectionType}
                onChange={(event) => setInspectionType(event.target.value)}
                placeholder="e.g. Annual inspection"
                aria-describedby="inspection-type-hint"
                minLength={3}
                maxLength={150}
                required
                disabled={submitting}
              />
              <small id="inspection-type-hint">Name the required inspection (3–150 characters).</small>
            </div>
          </div>
        </section>

        <section className="hm-inspection-form-panel" aria-labelledby="inspection-schedule-heading">
          <div className="hm-inspection-form-panel-heading">
            <span className="hm-inspection-form-section-icon hm-inspection-form-section-icon--teal">
              <CalendarDays size={23} aria-hidden="true" />
            </span>
            <div>
              <p className="hm-inspection-form-section-eyebrow">SECTION 02 / 02</p>
              <h2 id="inspection-schedule-heading">Schedule &amp; Instructions</h2>
              <p className="hm-inspection-form-section-description">
                Set the due date and add any useful instructions for the team.
              </p>
            </div>
          </div>

          <div className="hm-inspection-form-schedule-grid">
            <div className="hm-inspection-form-field">
              <label htmlFor="inspection-due-date">
                <CalendarDays size={17} aria-hidden="true" />
                Due Date <span className="hm-inspection-form-required" aria-hidden="true">*</span>
              </label>
              <input
                id="inspection-due-date"
                type="date"
                value={dueDate}
                onChange={(event) => setDueDate(event.target.value)}
                aria-describedby="inspection-due-date-hint"
                required
                disabled={submitting}
              />
              <small id="inspection-due-date-hint">
                Choose the date by which this inspection should be completed.
              </small>
            </div>

            <div className="hm-inspection-form-note">
              <Info size={20} aria-hidden="true" />
              <div>
                <strong>Scheduled by default</strong>
                <p>
                  New inspections start with the status <b>Scheduled</b>. The Backend determines whether an inspection is overdue.
                </p>
              </div>
            </div>

            <div className="hm-inspection-form-field hm-inspection-form-field--full">
              <label htmlFor="inspection-notes">
                <FileText size={17} aria-hidden="true" />
                Notes <span className="hm-inspection-form-optional">Optional</span>
              </label>
              <textarea
                id="inspection-notes"
                value={notes}
                onChange={(event) => setNotes(event.target.value)}
                placeholder="Checklist, special instructions, or other details..."
                aria-describedby="inspection-notes-hint"
                rows={5}
                maxLength={2000}
                disabled={submitting}
              />
              <div className="hm-inspection-form-notes-bottom">
                <small id="inspection-notes-hint">Add relevant instructions for the inspection team.</small>
                <span className="hm-inspection-form-counter">{notes.length}/2000 characters</span>
              </div>
            </div>
          </div>
        </section>

        <div className="hm-inspection-form-actions">
          <span className="hm-inspection-form-actions-note">
            <ShieldCheck size={17} aria-hidden="true" />
            3 required fields
          </span>
          <div className="hm-inspection-form-action-buttons">
            <Link to="/app/inspections" className="hm-inspection-form-cancel">
              Cancel
            </Link>
            <button
              type="submit"
              className="hm-inspection-form-submit"
              disabled={submitting || aircraftLoading || aircraft.length === 0}
            >
              {submitting ? (
                <>
                  <LoaderCircle className="hm-inspection-form-spinner" size={19} aria-hidden="true" />
                  Creating inspection...
                </>
              ) : (
                <>
                  <Save size={19} aria-hidden="true" />
                  Schedule Inspection
                </>
              )}
            </button>
          </div>
        </div>
      </form>
    </section>
  );
}

export default InspectionForm;
