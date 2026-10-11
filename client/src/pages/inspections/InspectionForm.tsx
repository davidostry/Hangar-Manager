
import { useEffect, useState } from "react";
import type { FormEvent } from "react";
import { Link, useNavigate } from "react-router";

import { getAircraftList } from "../../services/aircraftService";
import { createInspection } from "../../services/inspectionService";

import type { Aircraft } from "../../types/aircraft";
import type { InspectionCreateRequest } from "../../types/inspection";

import "./Inspections.css";

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

  useEffect(() => {
    let active = true;

    async function loadAircraft() {
      setAircraftLoading(true);
      setAircraftError("");

      try {
        const response = await getAircraftList({
          page: 1,
          page_size: 100,
        });

        if (!active) {
          return;
        }

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
        if (active) {
          setAircraftLoading(false);
        }
      }
    }

    void loadAircraft();

    return () => {
      active = false;
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

    if (inspectionType.trim().length < 3) {
      setError(
        "The inspection type must contain at least 3 characters.",
      );
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

      setError(
        `Could not create the inspection. ${message}`,
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <section className="inspections-page">
      <Link
        to="/app/inspections"
        className="inspection-back-link"
      >
        ← Back to Inspections
      </Link>

      <div className="page-heading">
        <p className="page-eyebrow">Compliance & Safety</p>
        <h1>Schedule an Inspection</h1>
        <p className="page-description">
          Create an inspection task and set the date by which it
          needs to be completed.
        </p>
      </div>

      <section className="inspection-form-card">
        <div className="inspection-form-heading">
          <span
            className="inspection-form-icon"
            aria-hidden="true"
          >
            +
          </span>

          <div>
            <h2>Inspection details</h2>
            <p>
              Complete the details below to schedule the inspection.
            </p>
          </div>
        </div>

        {aircraftError && (
          <div
            className="inspection-form-error"
            role="alert"
          >
            {aircraftError}
          </div>
        )}

        {error && (
          <div
            className="inspection-form-error"
            role="alert"
          >
            {error}
          </div>
        )}

        <form
          className="inspection-create-form"
          onSubmit={handleSubmit}
        >
          <div className="inspection-create-field">
            <label htmlFor="inspection-aircraft">
              Aircraft <span aria-hidden="true">*</span>
            </label>

            <select
              id="inspection-aircraft"
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

            <p className="inspection-form-hint">
              Select the aircraft that needs inspection.
            </p>
          </div>

          <div className="inspection-create-field">
            <label htmlFor="inspection-type">
              Inspection type <span aria-hidden="true">*</span>
            </label>

            <input
              id="inspection-type"
              type="text"
              value={inspectionType}
              onChange={(event) =>
                setInspectionType(event.target.value)
              }
              placeholder="For example: Annual inspection"
              minLength={3}
              maxLength={150}
              required
            />
          </div>

          <div className="inspection-create-field">
            <label htmlFor="inspection-due-date">
              Due date <span aria-hidden="true">*</span>
            </label>

            <input
              id="inspection-due-date"
              type="date"
              value={dueDate}
              onChange={(event) =>
                setDueDate(event.target.value)
              }
              required
            />

            <p className="inspection-form-hint">
              Choose the date by which this inspection should be completed.
            </p>
          </div>

          <div className="inspection-create-field">
            <label htmlFor="inspection-notes">
              Notes
            </label>

            <textarea
              id="inspection-notes"
              value={notes}
              onChange={(event) =>
                setNotes(event.target.value)
              }
              placeholder="Checklist, special instructions, or other details..."
              rows={5}
              maxLength={2000}
            />

            <div className="inspection-form-counter">
              {notes.length}/2000 characters
            </div>
          </div>

          <div className="inspection-form-note">
            New inspections start with the status{" "}
            <strong>Scheduled</strong>. The backend should
            calculate whether an inspection is overdue.
          </div>

          <div className="inspection-form-actions">
            <Link
              to="/app/inspections"
              className="inspection-cancel-link"
            >
              Cancel
            </Link>

            <button
              type="submit"
              className="inspection-button inspection-button-primary"
              disabled={
                submitting ||
                aircraftLoading ||
                aircraft.length === 0
              }
            >
              {submitting
                ? "Creating inspection..."
                : "Schedule inspection"}
            </button>
          </div>
        </form>
      </section>
    </section>
  );
}

export default InspectionForm;
