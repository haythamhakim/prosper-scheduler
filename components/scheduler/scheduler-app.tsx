"use client";

import {
  AppointmentTypesResponse,
  BookResponse,
  FollowUpOptionsResponse,
  PatientsResponse,
  SchedulerOptionsResponse,
} from "@/models/contracts";
import {
  ClinicianType,
  ClinicianTypeOption,
  Patient,
  SlotOption,
} from "@/models/types";
import { AnimatePresence, motion } from "framer-motion";
import { RotateCcw } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

const cardMotion = {
  hidden: { opacity: 0, y: 14 },
  visible: { opacity: 1, y: 0 },
};

const psychologistStepMotion = {
  initial: { opacity: 0 },
  animate: { opacity: 1 },
  exit: { opacity: 0 },
  transition: { duration: 0.45, ease: "easeInOut" as const },
};

function formatInsurance(insurance: Patient["insurance"]) {
  if (insurance === "BCBS") {
    return "Blue Cross Blue Shield";
  }
  return insurance.charAt(0) + insurance.slice(1).toLowerCase();
}

function formatSlot(startsAt: string) {
  const date = new Date(startsAt);
  const dayLabel = new Intl.DateTimeFormat("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
  }).format(date);
  const timeLabel = new Intl.DateTimeFormat("en-US", {
    hour: "numeric",
    minute: "2-digit",
    timeZoneName: "short",
  }).format(date);

  return `${dayLabel} at ${timeLabel}`;
}

function getWeekdayLabel(startsAt: string) {
  return new Intl.DateTimeFormat("en-US", { weekday: "long" }).format(
    new Date(startsAt),
  );
}

function getWeekdaySortOrder(startsAt: string) {
  return new Date(startsAt).getDay();
}

async function loadJson<T>(url: string): Promise<T> {
  const response = await fetch(url);
  const data = (await response.json()) as T & { error?: string };
  if (!response.ok) {
    throw new Error(data.error ?? "Request failed.");
  }
  return data;
}

export function SchedulerApp() {
  const [patients, setPatients] = useState<Patient[]>([]);
  const [appointmentTypes, setAppointmentTypes] = useState<
    ClinicianTypeOption[]
  >([]);
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
  const [selectedType, setSelectedType] = useState<ClinicianType | null>(null);
  const [slotOptions, setSlotOptions] = useState<SlotOption[]>([]);
  const [firstSession, setFirstSession] = useState<SlotOption | null>(null);
  const [followUpOptions, setFollowUpOptions] = useState<SlotOption[]>([]);
  const [secondSession, setSecondSession] = useState<SlotOption | null>(null);
  const [selectedTherapistSlot, setSelectedTherapistSlot] =
    useState<SlotOption | null>(null);
  const [selectedDay, setSelectedDay] = useState<string | null>(null);
  const [confirmation, setConfirmation] = useState<BookResponse | null>(null);
  const [showResetConfirmation, setShowResetConfirmation] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isBooking, setIsBooking] = useState(false);
  const [isResetting, setIsResetting] = useState(false);

  useEffect(() => {
    async function bootstrap() {
      try {
        setIsLoading(true);
        const [patientsData, appointmentTypeData] = await Promise.all([
          loadJson<PatientsResponse>("/api/patients"),
          loadJson<AppointmentTypesResponse>("/api/appointment-types"),
        ]);
        setPatients(patientsData.patients);
        setAppointmentTypes(appointmentTypeData.appointmentTypes);
      } catch (requestError) {
        setError(
          requestError instanceof Error
            ? requestError.message
            : "Unable to load scheduler.",
        );
      } finally {
        setIsLoading(false);
      }
    }

    void bootstrap();
  }, []);

  useEffect(() => {
    async function fetchSchedulerOptions() {
      if (!selectedPatient || !selectedType) {
        return;
      }

      try {
        setIsLoading(true);
        setError(null);
        const data = await loadJson<SchedulerOptionsResponse>(
          `/api/scheduler/options?patientId=${selectedPatient.id}&schedulingTrack=${selectedType}`,
        );
        setSlotOptions(data.options);
      } catch (requestError) {
        setError(
          requestError instanceof Error
            ? requestError.message
            : "Unable to load available slots.",
        );
      } finally {
        setIsLoading(false);
      }
    }

    void fetchSchedulerOptions();
  }, [selectedPatient, selectedType]);

  useEffect(() => {
    async function fetchFollowUps() {
      if (
        !selectedPatient ||
        !firstSession ||
        selectedType !== "PSYCHOLOGIST"
      ) {
        return;
      }

      try {
        setIsLoading(true);
        setError(null);
        const data = await loadJson<FollowUpOptionsResponse>(
          `/api/scheduler/follow-up-options?patientId=${selectedPatient.id}&firstSlotId=${firstSession.slotId}`,
        );
        setFollowUpOptions(data.options);
      } catch (requestError) {
        setError(
          requestError instanceof Error
            ? requestError.message
            : "Unable to load follow-up options.",
        );
      } finally {
        setIsLoading(false);
      }
    }

    if (firstSession) {
      void fetchFollowUps();
    }
  }, [firstSession, selectedPatient, selectedType]);

  const therapistOptions = useMemo(
    () => slotOptions.filter((slot) => slot.lengthMinutes === 60),
    [slotOptions],
  );

  const psychologistFirstSessionOptions = useMemo(
    () => slotOptions.filter((slot) => slot.lengthMinutes === 90),
    [slotOptions],
  );

  const availableDayOptions = useMemo(() => {
    const sourceOptions =
      selectedType === "THERAPIST"
        ? therapistOptions
        : selectedType === "PSYCHOLOGIST"
          ? psychologistFirstSessionOptions
          : [];
    const uniqueByDay = new Map<string, number>();
    for (const slot of sourceOptions) {
      const dayLabel = getWeekdayLabel(slot.startsAt);
      if (!uniqueByDay.has(dayLabel)) {
        uniqueByDay.set(dayLabel, getWeekdaySortOrder(slot.startsAt));
      }
    }
    return Array.from(uniqueByDay.entries())
      .sort((a, b) => a[1] - b[1])
      .map(([dayLabel]) => dayLabel);
  }, [psychologistFirstSessionOptions, selectedType, therapistOptions]);

  const filteredTherapistOptions = useMemo(() => {
    const day =
      selectedDay && availableDayOptions.includes(selectedDay)
        ? selectedDay
        : null;
    if (!day) {
      return therapistOptions;
    }
    return therapistOptions.filter(
      (slot) => getWeekdayLabel(slot.startsAt) === day,
    );
  }, [availableDayOptions, selectedDay, therapistOptions]);

  const filteredPsychologistFirstSessionOptions = useMemo(() => {
    const day =
      selectedDay && availableDayOptions.includes(selectedDay)
        ? selectedDay
        : null;
    if (!day) {
      return psychologistFirstSessionOptions;
    }
    return psychologistFirstSessionOptions.filter(
      (slot) => getWeekdayLabel(slot.startsAt) === day,
    );
  }, [availableDayOptions, psychologistFirstSessionOptions, selectedDay]);

  const effectiveSelectedDay = useMemo(() => {
    if (!selectedDay) {
      return null;
    }
    return availableDayOptions.includes(selectedDay) ? selectedDay : null;
  }, [availableDayOptions, selectedDay]);

  const effectiveSelectedTherapistSlot = useMemo(() => {
    if (!selectedTherapistSlot) {
      return null;
    }
    return filteredTherapistOptions.some(
      (slot) => slot.slotId === selectedTherapistSlot.slotId,
    )
      ? selectedTherapistSlot
      : null;
  }, [filteredTherapistOptions, selectedTherapistSlot]);

  const effectiveFirstSession = useMemo(() => {
    if (!firstSession) {
      return null;
    }
    return filteredPsychologistFirstSessionOptions.some(
      (slot) => slot.slotId === firstSession.slotId,
    )
      ? firstSession
      : null;
  }, [filteredPsychologistFirstSessionOptions, firstSession]);

  const effectiveSecondSession = useMemo(() => {
    if (!secondSession) {
      return null;
    }
    return followUpOptions.some((slot) => slot.slotId === secondSession.slotId)
      ? secondSession
      : null;
  }, [followUpOptions, secondSession]);

  const canBookTherapist =
    selectedType === "THERAPIST" && effectiveSelectedTherapistSlot;
  const canBookPsychologist =
    selectedType === "PSYCHOLOGIST" &&
    effectiveFirstSession &&
    effectiveSecondSession;
  const psychologistStep = effectiveFirstSession ? 2 : 1;

  function clearFeedback() {
    setConfirmation(null);
    setError(null);
  }

  function clearAppointmentSelections() {
    setSlotOptions([]);
    setFirstSession(null);
    setSecondSession(null);
    setFollowUpOptions([]);
    setSelectedTherapistSlot(null);
    setSelectedDay(null);
  }

  function handlePatientSelect(patient: Patient) {
    setSelectedPatient(patient);
    setSelectedType(null);
    clearAppointmentSelections();
    clearFeedback();
  }

  function handleAppointmentTypeSelect(type: ClinicianType) {
    if (selectedType === type) {
      clearFeedback();
      return;
    }
    setSelectedType(type);
    clearAppointmentSelections();
    clearFeedback();
  }

  function handleFirstSessionSelect(slot: SlotOption) {
    setFirstSession(slot);
    setSecondSession(null);
    setFollowUpOptions([]);
    clearFeedback();
  }

  function handlePsychologistStepBack() {
    setFirstSession(null);
    setSecondSession(null);
    setFollowUpOptions([]);
    clearFeedback();
  }

  function resetSchedulerState() {
    setSelectedPatient(null);
    setSelectedType(null);
    clearAppointmentSelections();
    clearFeedback();
  }

  async function bookAppointment() {
    if (!selectedPatient || !selectedType) {
      return;
    }

    try {
      setError(null);
      setIsBooking(true);

      const payload =
        selectedType === "THERAPIST"
          ? {
              patientId: selectedPatient.id,
              schedulingTrack: selectedType,
              slotId: effectiveSelectedTherapistSlot?.slotId,
            }
          : {
              patientId: selectedPatient.id,
              schedulingTrack: selectedType,
              firstSlotId: effectiveFirstSession?.slotId,
              secondSlotId: effectiveSecondSession?.slotId,
            };

      const response = await fetch("/api/scheduler/book", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = (await response.json()) as BookResponse & { error?: string };
      if (!response.ok) {
        throw new Error(data.error ?? "Could not complete booking.");
      }

      setConfirmation(data);
      setSlotOptions((current) =>
        current.filter(
          (slot) =>
            slot.slotId !== effectiveSelectedTherapistSlot?.slotId &&
            slot.slotId !== effectiveFirstSession?.slotId &&
            slot.slotId !== effectiveSecondSession?.slotId,
        ),
      );
      setFollowUpOptions((current) =>
        current.filter(
          (slot) => slot.slotId !== effectiveSecondSession?.slotId,
        ),
      );
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "Could not complete booking.",
      );
    } finally {
      setIsBooking(false);
    }
  }

  async function resetAllBookings() {
    try {
      setError(null);
      setIsResetting(true);
      const response = await fetch("/api/scheduler/reset", {
        method: "POST",
      });
      const data = (await response.json()) as { error?: string };
      if (!response.ok) {
        throw new Error(data.error ?? "Could not reset bookings.");
      }
      resetSchedulerState();
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "Could not reset bookings.",
      );
    } finally {
      setIsResetting(false);
    }
  }

  function handleResetClick() {
    if (isResetting) {
      return;
    }
    setShowResetConfirmation(true);
  }

  function closeResetConfirmation() {
    if (isResetting) {
      return;
    }
    setShowResetConfirmation(false);
  }

  function confirmResetBookings() {
    if (isResetting) {
      return;
    }
    setShowResetConfirmation(false);
    void resetAllBookings();
  }

  return (
    <div className="scheduler-shell">
      <section className="scheduler-header">
        <div className="scheduler-header-top">
          <button
            type="button"
            className="reset-button"
            onClick={handleResetClick}
            disabled={isResetting}
            aria-label="Reset all scheduled appointments"
            title="Resets all scheduled appointments"
            data-tooltip="Resets all scheduled appointments"
          >
            <span className="reset-icon" aria-hidden="true">
              <RotateCcw size={18} strokeWidth={1.9} />
            </span>
          </button>
        </div>
        <div className="scheduler-header-content">
          <p className="eyebrow">Prosper Health</p>
          <h1>Your scheduling assistant</h1>
          <p>
            Pick your account, choose appointment type, and confirm your
            session.
          </p>
        </div>
      </section>

      <section className="scheduler-step">
        {selectedPatient ? (
          <div className="welcome-back-card">
            <h2>Welcome back, {selectedPatient.firstName}!</h2>
            <div className="welcome-back-account">
              <span className="avatar">{selectedPatient.avatar}</span>
              <div>
                <p className="account-name">
                  {selectedPatient.firstName} {selectedPatient.lastName}
                </p>
                <p className="account-meta">
                  {selectedPatient.state} |{" "}
                  {formatInsurance(selectedPatient.insurance)}
                </p>
              </div>
            </div>
            <button
              type="button"
              className="switch-account-button"
              onClick={resetSchedulerState}
            >
              Select a different account
            </button>
          </div>
        ) : (
          <>
            <h2>Select your account</h2>
            {isLoading && patients.length === 0 ? (
              <p className="hint">Loading accounts...</p>
            ) : null}
            <div className="account-grid">
              {patients.map((patient) => {
                return (
                  <button
                    key={patient.id}
                    type="button"
                    className="account-card"
                    onClick={() => handlePatientSelect(patient)}
                  >
                    <span className="avatar">{patient.avatar}</span>
                    <div>
                      <p className="account-name">
                        {patient.firstName} {patient.lastName}
                      </p>
                      <p className="account-meta">
                        {patient.state} | {formatInsurance(patient.insurance)}
                      </p>
                    </div>
                  </button>
                );
              })}
            </div>
          </>
        )}
      </section>

      {selectedPatient ? (
        <motion.section
          className="scheduler-step"
          initial="hidden"
          animate="visible"
          variants={cardMotion}
        >
          <h2>Select appointment type</h2>
          <div className="type-grid">
            {appointmentTypes.map((type) => {
              const isActive = selectedType === type.id;
              return (
                <button
                  key={type.id}
                  type="button"
                  className={`type-card ${isActive ? "active" : ""}`}
                  onClick={() => handleAppointmentTypeSelect(type.id)}
                >
                  <p className="type-title">{type.label}</p>
                  <p>{type.description}</p>
                  <p className="duration-pill">
                    {type.durationMinutes} minutes
                  </p>
                </button>
              );
            })}
          </div>
        </motion.section>
      ) : null}

      {selectedPatient && selectedType === "THERAPIST" ? (
        <motion.section
          className="scheduler-step"
          initial="hidden"
          animate="visible"
          variants={cardMotion}
        >
          <h3>Filter by day first</h3>
          <div className="day-filter-row">
            <button
              type="button"
              className={`day-chip ${effectiveSelectedDay === null ? "active" : ""}`}
              onClick={() => setSelectedDay(null)}
            >
              Any day
            </button>
            {availableDayOptions.map((day) => (
              <button
                key={day}
                type="button"
                className={`day-chip ${effectiveSelectedDay === day ? "active" : ""}`}
                onClick={() => setSelectedDay(day)}
              >
                {day}
              </button>
            ))}
          </div>
          <h2>Select your therapy session</h2>
          <div className="slot-list">
            {filteredTherapistOptions.map((slot) => (
              <button
                key={slot.slotId}
                type="button"
                className={`slot-card ${
                  effectiveSelectedTherapistSlot?.slotId === slot.slotId
                    ? "active"
                    : ""
                }`}
                onClick={() => setSelectedTherapistSlot(slot)}
              >
                <p className="slot-primary">{formatSlot(slot.startsAt)}</p>
                <p>{slot.clinicianName}</p>
              </button>
            ))}
          </div>
          {filteredTherapistOptions.length === 0 && !isLoading ? (
            <p className="hint">
              No therapist slots currently match this patient profile.
            </p>
          ) : null}
        </motion.section>
      ) : null}

      {selectedPatient && selectedType === "PSYCHOLOGIST" ? (
        <motion.section
          className="scheduler-step"
          initial="hidden"
          animate="visible"
          variants={cardMotion}
        >
          <div className="assessment-stepper-header">
            {psychologistStep === 2 ? (
              <button
                type="button"
                className="assessment-back-button"
                onClick={handlePsychologistStepBack}
                aria-label="Go back to first assessment session"
              >
                <span className="assessment-back-icon" aria-hidden="true">
                  ←
                </span>
                Back
              </button>
            ) : null}
            <p className="assessment-stepper-label">
              Session {psychologistStep} of 2
            </p>
          </div>

          <AnimatePresence mode="wait" initial={false}>
            {psychologistStep === 1 ? (
              <motion.div
                key="psychologist-step-1"
                className="assessment-stepper-panel"
                {...psychologistStepMotion}
              >
                <h3>Filter by day first</h3>
                <div className="day-filter-row">
                  <button
                    type="button"
                    className={`day-chip ${effectiveSelectedDay === null ? "active" : ""}`}
                    onClick={() => setSelectedDay(null)}
                  >
                    Any day
                  </button>
                  {availableDayOptions.map((day) => (
                    <button
                      key={day}
                      type="button"
                      className={`day-chip ${effectiveSelectedDay === day ? "active" : ""}`}
                      onClick={() => setSelectedDay(day)}
                    >
                      {day}
                    </button>
                  ))}
                </div>
                <h2>Select your first assessment session</h2>
                <div className="slot-list">
                  {filteredPsychologistFirstSessionOptions.map((slot) => (
                    <button
                      key={slot.slotId}
                      type="button"
                      className={`slot-card ${effectiveFirstSession?.slotId === slot.slotId ? "active" : ""}`}
                      onClick={() => handleFirstSessionSelect(slot)}
                    >
                      <p className="slot-primary">
                        {formatSlot(slot.startsAt)}
                      </p>
                      <p>{slot.clinicianName}</p>
                    </button>
                  ))}
                </div>
                {filteredPsychologistFirstSessionOptions.length === 0 &&
                !isLoading ? (
                  <p className="hint">
                    No psychologist options currently match this patient
                    profile.
                  </p>
                ) : null}
              </motion.div>
            ) : (
              <motion.div
                key="psychologist-step-2"
                className="assessment-stepper-panel"
                {...psychologistStepMotion}
              >
                <h2>Select your second assessment session</h2>
                <p className="hint">
                  Session 2 must be on a different day and no more than 7 days
                  after session 1.
                </p>
                {effectiveFirstSession ? (
                  <p className="hint">
                    First session: {formatSlot(effectiveFirstSession.startsAt)}
                  </p>
                ) : null}
                <div className="slot-list">
                  {followUpOptions.map((slot) => (
                    <button
                      key={slot.slotId}
                      type="button"
                      className={`slot-card ${
                        effectiveSecondSession?.slotId === slot.slotId
                          ? "active"
                          : ""
                      }`}
                      onClick={() => setSecondSession(slot)}
                    >
                      <p className="slot-primary">
                        {formatSlot(slot.startsAt)}
                      </p>
                      <p>{slot.clinicianName}</p>
                    </button>
                  ))}
                </div>
                {followUpOptions.length === 0 && !isLoading ? (
                  <p className="hint">
                    No second-session options are available within 7 days for
                    this first session.
                  </p>
                ) : null}
              </motion.div>
            )}
          </AnimatePresence>
        </motion.section>
      ) : null}

      {(canBookTherapist || canBookPsychologist) && !confirmation ? (
        <section className="scheduler-actions">
          <button
            type="button"
            className="book-button"
            onClick={() => void bookAppointment()}
            disabled={isBooking}
          >
            {isBooking ? "Confirming..." : "Confirm appointment"}
          </button>
        </section>
      ) : null}

      {error ? <p className="error-message">{error}</p> : null}

      <AnimatePresence>
        {showResetConfirmation ? (
          <motion.div
            className="confirmation-modal-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={(event) => {
              if (event.target === event.currentTarget) {
                closeResetConfirmation();
              }
            }}
          >
            <motion.section
              className="confirmation-card reset-confirmation-card"
              initial={{ opacity: 0, y: 20, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 20, scale: 0.96 }}
              onClick={(event) => event.stopPropagation()}
            >
              <h3>Reset all scheduled appointments?</h3>
              <p>
                This clears every booked appointment and returns the scheduler
                to its initial state.
              </p>
              <div className="reset-confirmation-actions">
                <button
                  type="button"
                  className="reset-confirmation-cancel"
                  onClick={closeResetConfirmation}
                  disabled={isResetting}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  className="reset-confirmation-confirm"
                  onClick={confirmResetBookings}
                  disabled={isResetting}
                >
                  {isResetting ? "Resetting..." : "Yes, reset"}
                </button>
              </div>
            </motion.section>
          </motion.div>
        ) : null}

        {confirmation ? (
          <motion.div
            className="confirmation-modal-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={(event) => {
              if (event.target === event.currentTarget) {
                resetSchedulerState();
              }
            }}
          >
            <motion.section
              className="confirmation-card"
              initial={{ opacity: 0, y: 20, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 20, scale: 0.96 }}
              onClick={(event) => event.stopPropagation()}
            >
              <motion.div
                className="checkmark"
                initial={{ scale: 0 }}
                animate={{ scale: 1, rotate: 360 }}
                transition={{ type: "spring", stiffness: 240, damping: 16 }}
              >
                ✓
              </motion.div>
              <h3>Thanks, your appointment has been confirmed.</h3>
              <p>
                {confirmation.patientName} is booked with{" "}
                {confirmation.clinicianName}.
              </p>
              <ul className="confirmation-list">
                {confirmation.slots.map((slot) => (
                  <li key={slot.slotId}>{formatSlot(slot.startsAt)}</li>
                ))}
              </ul>
            </motion.section>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
}
