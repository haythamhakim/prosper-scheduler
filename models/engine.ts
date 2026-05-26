import { clinicians, patients } from "@/models/mock-data";
import {
  APPOINTMENT_TYPE_DURATIONS,
  CLINICIAN_TYPE_OPTIONS,
  SCHEDULING_RULES,
} from "@/models/rules";
import {
  Appointment,
  AppointmentType,
  AssessmentOptionsByClinician,
  BookingRecord,
  Clinician,
  ClinicianType,
  Patient,
  SlotOption,
} from "@/models/types";

type ClinicianSlot = Clinician["availableSlots"][number];
type SlotRecord = {
  clinician: Clinician;
  slot: ClinicianSlot;
};

const MS_IN_DAY = 24 * 60 * 60 * 1000;
const INACTIVE_APPOINTMENT_STATUSES = new Set<Appointment["status"]>([
  "CANCELLED",
  "LATE_CANCELLATION",
  "RE_SCHEDULED",
]);

const bookedSlotIds = new Set<string>();
const bookings: BookingRecord[] = [];
const patientById = new Map(patients.map((patient) => [patient.id, patient]));
const slotById = new Map<string, SlotRecord>();
const initialAppointmentsByClinician = new Map<string, Appointment[]>();
const appointmentsByClinician = new Map<string, Appointment[]>();

for (const clinician of clinicians) {
  for (const slot of clinician.availableSlots) {
    slotById.set(slot.id, { clinician, slot });
  }
  const copiedAppointments = clinician.appointments.map((appointment) => ({
    ...appointment,
  }));
  initialAppointmentsByClinician.set(clinician.id, copiedAppointments);
  appointmentsByClinician.set(
    clinician.id,
    copiedAppointments.map((appointment) => ({ ...appointment })),
  );
}

const compareByStartTime = (a: SlotOption, b: SlotOption) =>
  new Date(a.startsAt).getTime() - new Date(b.startsAt).getTime();

function getPatient(patientId: string): Patient | undefined {
  return patientById.get(patientId);
}

function getSlotRecord(slotId: string): SlotRecord | undefined {
  return slotById.get(slotId);
}

function toTimestamp(iso: string): number {
  return new Date(iso).getTime();
}

function toDayKey(iso: string): string {
  return new Date(iso).toISOString().slice(0, 10);
}

function getWeekKey(iso: string): string {
  // Convert a timestamp into an ISO 8601 week key (YYYY-Www).
  const date = new Date(iso);
  const utcDate = new Date(
    Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()),
  );
  const dayOfWeek = utcDate.getUTCDay() || 7;
  utcDate.setUTCDate(utcDate.getUTCDate() + 4 - dayOfWeek);
  const yearStart = new Date(Date.UTC(utcDate.getUTCFullYear(), 0, 1));
  const weekNo = Math.ceil(
    ((utcDate.getTime() - yearStart.getTime()) / MS_IN_DAY + 1) / 7,
  );
  return `${utcDate.getUTCFullYear()}-W${String(weekNo).padStart(2, "0")}`;
}

function isClinicianEligible(patient: Patient, clinician: Clinician): boolean {
  return (
    clinician.states.includes(patient.state) &&
    clinician.insurances.includes(patient.insurance)
  );
}

function getEligibleClinicians(
  patientId: string,
  clinicianType: ClinicianType,
): Clinician[] {
  const patient = getPatient(patientId);
  if (!patient) {
    throw new Error("Patient not found.");
  }

  return clinicians.filter(
    (clinician) =>
      clinician.clinicianType === clinicianType &&
      isClinicianEligible(patient, clinician),
  );
}

function toSlotOption(clinician: Clinician, slot: ClinicianSlot): SlotOption {
  return {
    slotId: slot.id,
    clinicianId: clinician.id,
    clinicianName: `${clinician.firstName} ${clinician.lastName}`,
    startsAt: slot.date,
    lengthMinutes: slot.length,
  };
}

function isSlotBooked(slotId: string): boolean {
  return bookedSlotIds.has(slotId);
}

function isActiveAppointment(appointment: Appointment): boolean {
  return !INACTIVE_APPOINTMENT_STATUSES.has(appointment.status);
}

function getAppointmentDurationMinutes(
  appointmentType: AppointmentType,
): number {
  return APPOINTMENT_TYPE_DURATIONS[appointmentType];
}

function getAppointmentsForClinician(clinicianId: string): Appointment[] {
  return (appointmentsByClinician.get(clinicianId) ?? []).filter(
    isActiveAppointment,
  );
}

function appointmentsOverlap(
  startsAtA: string,
  durationA: number,
  startsAtB: string,
  durationB: number,
): boolean {
  const startA = toTimestamp(startsAtA);
  const endA = startA + durationA * 60 * 1000;
  const startB = toTimestamp(startsAtB);
  const endB = startB + durationB * 60 * 1000;
  return startA < endB && startB < endA;
}

function hasConflictWithExistingAppointments(
  clinicianId: string,
  startsAt: string,
  lengthMinutes: number,
): boolean {
  const activeAppointments = getAppointmentsForClinician(clinicianId);
  return activeAppointments.some((appointment) =>
    appointmentsOverlap(
      startsAt,
      lengthMinutes,
      appointment.scheduledFor,
      getAppointmentDurationMinutes(appointment.appointmentType),
    ),
  );
}

function getDailyCountForClinician(
  clinicianId: string,
  dayKey: string,
): number {
  return getAppointmentsForClinician(clinicianId).filter(
    (appointment) => toDayKey(appointment.scheduledFor) === dayKey,
  ).length;
}

function getWeeklyCountForClinician(
  clinicianId: string,
  weekKey: string,
): number {
  return getAppointmentsForClinician(clinicianId).filter(
    (appointment) => getWeekKey(appointment.scheduledFor) === weekKey,
  ).length;
}

function isWithinClinicianCapacity(
  clinician: Clinician,
  startsAt: string,
  additionalAppointments: number,
): boolean {
  const dayKey = toDayKey(startsAt);
  const weekKey = getWeekKey(startsAt);
  const dailyCount = getDailyCountForClinician(clinician.id, dayKey);
  const weeklyCount = getWeeklyCountForClinician(clinician.id, weekKey);

  return (
    dailyCount + additionalAppointments <= clinician.maxDailyAppointments &&
    weeklyCount + additionalAppointments <= clinician.maxWeeklyAppointments
  );
}

function canBookPsychologistPairWithinCapacity(
  clinician: Clinician,
  firstStartsAt: string,
  secondStartsAt: string,
): boolean {
  const incrementsByDay = new Map<string, number>();
  const incrementsByWeek = new Map<string, number>();
  const startsAtEntries = [firstStartsAt, secondStartsAt];

  for (const startsAt of startsAtEntries) {
    const dayKey = toDayKey(startsAt);
    const weekKey = getWeekKey(startsAt);
    incrementsByDay.set(dayKey, (incrementsByDay.get(dayKey) ?? 0) + 1);
    incrementsByWeek.set(weekKey, (incrementsByWeek.get(weekKey) ?? 0) + 1);
  }

  for (const [dayKey, increment] of incrementsByDay.entries()) {
    const dailyCount = getDailyCountForClinician(clinician.id, dayKey);
    if (dailyCount + increment > clinician.maxDailyAppointments) {
      return false;
    }
  }

  for (const [weekKey, increment] of incrementsByWeek.entries()) {
    const weeklyCount = getWeeklyCountForClinician(clinician.id, weekKey);
    if (weeklyCount + increment > clinician.maxWeeklyAppointments) {
      return false;
    }
  }

  return true;
}

function isSlotBookable(
  clinician: Clinician,
  slot: ClinicianSlot,
  appointmentType: AppointmentType,
): boolean {
  if (isSlotBooked(slot.id)) {
    return false;
  }
  if (slot.length !== APPOINTMENT_TYPE_DURATIONS[appointmentType]) {
    return false;
  }
  if (
    hasConflictWithExistingAppointments(clinician.id, slot.date, slot.length)
  ) {
    return false;
  }
  return isWithinClinicianCapacity(clinician, slot.date, 1);
}

export function optimizeSlotsForMaxAppointments(
  startsAtOptions: string[],
  durationMinutes: number,
): string[] {
  const sorted = [...startsAtOptions].sort(
    (a, b) => toTimestamp(a) - toTimestamp(b),
  );
  const selected: string[] = [];
  let nextAvailableTime = Number.NEGATIVE_INFINITY;

  for (const startsAt of sorted) {
    const startTime = toTimestamp(startsAt);
    if (startTime >= nextAvailableTime) {
      selected.push(startsAt);
      nextAvailableTime = startTime + durationMinutes * 60 * 1000;
    }
  }

  return selected;
}

function optimizeSlotOptionsByDay(
  slotOptions: SlotOption[],
  durationMinutes: number,
): SlotOption[] {
  const byDay = new Map<string, SlotOption[]>();
  for (const slot of slotOptions) {
    const dayKey = toDayKey(slot.startsAt);
    const current = byDay.get(dayKey) ?? [];
    current.push(slot);
    byDay.set(dayKey, current);
  }

  const kept: SlotOption[] = [];
  for (const daySlots of byDay.values()) {
    const keptStartsAt = new Set(
      optimizeSlotsForMaxAppointments(
        daySlots.map((slot) => slot.startsAt),
        durationMinutes,
      ),
    );
    kept.push(...daySlots.filter((slot) => keptStartsAt.has(slot.startsAt)));
  }

  return kept.sort(compareByStartTime);
}

function assertSlotDuration(
  slot: ClinicianSlot | undefined,
  expectedDurationMinutes: number,
): asserts slot is ClinicianSlot {
  if (!slot || slot.length !== expectedDurationMinutes) {
    throw new Error("Selected slot is no longer available.");
  }
}

function getSlotOptionById(slotId: string): SlotOption | undefined {
  const slotRecord = getSlotRecord(slotId);
  if (!slotRecord) {
    return undefined;
  }
  return toSlotOption(slotRecord.clinician, slotRecord.slot);
}

function isValidSecondPsychologistSession(
  firstSlot: SlotOption,
  secondSlot: SlotOption,
): boolean {
  const firstTime = toTimestamp(firstSlot.startsAt);
  const secondTime = toTimestamp(secondSlot.startsAt);
  const sameDay =
    toDayKey(firstSlot.startsAt) === toDayKey(secondSlot.startsAt);
  const maxGapDays = SCHEDULING_RULES.PSYCHOLOGIST.maxGapDays;

  if (secondTime <= firstTime) {
    return false;
  }
  if (SCHEDULING_RULES.PSYCHOLOGIST.requiresDifferentDays && sameDay) {
    return false;
  }

  return secondTime - firstTime <= maxGapDays * MS_IN_DAY;
}

function buildAssessmentPairs(
  clinician: Clinician,
  firstSessionOptions: SlotOption[],
): AssessmentOptionsByClinician["sessionPairs"] {
  const pairs: AssessmentOptionsByClinician["sessionPairs"] = [];
  const sorted = firstSessionOptions
    .map((option) => ({ ...option }))
    .sort(compareByStartTime);

  for (let i = 0; i < sorted.length; i += 1) {
    for (let j = i + 1; j < sorted.length; j += 1) {
      const first = sorted[i];
      const second = sorted[j];
      if (!isValidSecondPsychologistSession(first, second)) {
        continue;
      }
      if (
        !isWithinClinicianCapacity(clinician, first.startsAt, 1) ||
        !isWithinClinicianCapacity(clinician, second.startsAt, 1)
      ) {
        continue;
      }
      if (
        !canBookPsychologistPairWithinCapacity(
          clinician,
          first.startsAt,
          second.startsAt,
        )
      ) {
        continue;
      }
      pairs.push({ first, second });
    }
  }

  return pairs;
}

export function getAssessmentOptionsGroupedByClinician(
  patientId: string,
): AssessmentOptionsByClinician[] {
  const patient = getPatient(patientId);
  if (!patient) {
    throw new Error("Patient not found.");
  }

  const eligibleClinicians = getEligibleClinicians(patientId, "PSYCHOLOGIST");

  const groups = eligibleClinicians
    .map((clinician) => {
      const unoptimized = clinician.availableSlots
        .filter((slot) =>
          isSlotBookable(clinician, slot, "ASSESSMENT_SESSION_1"),
        )
        .map((slot) => toSlotOption(clinician, slot))
        .sort(compareByStartTime);

      const optimized = optimizeSlotOptionsByDay(
        unoptimized,
        SCHEDULING_RULES.PSYCHOLOGIST.durationMinutes,
      );

      const sessionPairs = buildAssessmentPairs(clinician, optimized);
      const firstSessionOptions = optimized.filter((slot) =>
        sessionPairs.some((pair) => pair.first.slotId === slot.slotId),
      );

      return {
        clinicianId: clinician.id,
        clinicianName: `${clinician.firstName} ${clinician.lastName}`,
        firstSessionOptions,
        sessionPairs,
      };
    })
    .filter((group) => group.sessionPairs.length > 0);

  return groups;
}

export function getSchedulerOptions(
  patientId: string,
  clinicianType: ClinicianType,
): SlotOption[] {
  if (clinicianType === "PSYCHOLOGIST") {
    return getAssessmentOptionsGroupedByClinician(patientId)
      .flatMap((group) => group.firstSessionOptions)
      .sort(compareByStartTime);
  }

  const eligibleClinicians = getEligibleClinicians(patientId, clinicianType);
  const options = eligibleClinicians
    .flatMap((clinician) =>
      clinician.availableSlots
        .filter((slot) => isSlotBookable(clinician, slot, "THERAPY_INTAKE"))
        .map((slot) => toSlotOption(clinician, slot)),
    )
    .sort(compareByStartTime);

  return options;
}

export function getPsychologistFollowUpOptions(
  patientId: string,
  firstSlotId: string,
): SlotOption[] {
  const firstSlot = getSlotOptionById(firstSlotId);
  if (!firstSlot) {
    throw new Error("First assessment session was not found.");
  }

  const eligibleClinicians = getEligibleClinicians(patientId, "PSYCHOLOGIST");
  const clinician = eligibleClinicians.find(
    (candidate) => candidate.id === firstSlot.clinicianId,
  );

  if (!clinician) {
    throw new Error("Selected clinician is not eligible for this patient.");
  }

  const groupedOptions = getAssessmentOptionsGroupedByClinician(patientId);
  const clinicianGroup = groupedOptions.find(
    (group) => group.clinicianId === clinician.id,
  );
  if (!clinicianGroup) {
    return [];
  }

  const followUps = clinicianGroup.sessionPairs
    .filter((pair) => pair.first.slotId === firstSlotId)
    .map((pair) => pair.second)
    .sort(compareByStartTime);

  return followUps;
}

function addAppointmentsForBooking(
  clinicianId: string,
  patientId: string,
  appointmentEntries: { startsAt: string; appointmentType: AppointmentType }[],
) {
  const existing = appointmentsByClinician.get(clinicianId) ?? [];
  const created = appointmentEntries.map((entry) => ({
    id: `appt-${crypto.randomUUID()}`,
    patientId,
    clinicianId,
    scheduledFor: entry.startsAt,
    appointmentType: entry.appointmentType,
    status: "UPCOMING" as const,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  }));
  appointmentsByClinician.set(clinicianId, [...existing, ...created]);
}

type BookingInput = {
  patientId: string;
  clinicianType: ClinicianType;
  slotId?: string;
  firstSlotId?: string;
  secondSlotId?: string;
};

function requirePatient(patientId: string): Patient {
  const patient = getPatient(patientId);
  if (!patient) {
    throw new Error("Patient not found.");
  }
  return patient;
}

function createBookingRecord(input: {
  patientId: string;
  clinicianType: ClinicianType;
  clinicianId: string;
  slotIds: string[];
  appointmentTypes: AppointmentType[];
}): BookingRecord {
  const booking: BookingRecord = {
    id: `booking-${crypto.randomUUID()}`,
    patientId: input.patientId,
    clinicianType: input.clinicianType,
    clinicianId: input.clinicianId,
    slotIds: input.slotIds,
    appointmentTypes: input.appointmentTypes,
    createdAt: new Date().toISOString(),
  };
  bookings.push(booking);
  return booking;
}

function bookTherapistAppointment(input: BookingInput, patient: Patient) {
  if (!input.slotId) {
    throw new Error("Therapist booking requires one selected slot.");
  }
  const slotRecord = getSlotRecord(input.slotId);
  if (!slotRecord || isSlotBooked(input.slotId)) {
    throw new Error("Selected slot is no longer available.");
  }
  if (slotRecord.clinician.clinicianType !== "THERAPIST") {
    throw new Error("Selected slot must belong to a therapist.");
  }
  if (!isClinicianEligible(patient, slotRecord.clinician)) {
    throw new Error("Selected clinician is not eligible for this patient.");
  }
  assertSlotDuration(
    slotRecord.slot,
    SCHEDULING_RULES.THERAPIST.durationMinutes,
  );
  if (
    !isSlotBookable(slotRecord.clinician, slotRecord.slot, "THERAPY_INTAKE")
  ) {
    throw new Error("Selected slot is no longer bookable.");
  }

  const slot = toSlotOption(slotRecord.clinician, slotRecord.slot);

  bookedSlotIds.add(input.slotId);
  addAppointmentsForBooking(slotRecord.clinician.id, patient.id, [
    { startsAt: slot.startsAt, appointmentType: "THERAPY_INTAKE" },
  ]);

  const booking = createBookingRecord({
    patientId: patient.id,
    clinicianType: "THERAPIST",
    clinicianId: slotRecord.clinician.id,
    slotIds: [input.slotId],
    appointmentTypes: ["THERAPY_INTAKE"],
  });

  return {
    booking,
    patientName: `${patient.firstName} ${patient.lastName}`,
    clinicianName: slot.clinicianName,
    slots: [slot],
  };
}

function requirePsychologistSlotIds(input: BookingInput): {
  firstSlotId: string;
  secondSlotId: string;
} {
  if (!input.firstSlotId || !input.secondSlotId) {
    throw new Error("Psychologist booking requires both assessment sessions.");
  }

  if (input.firstSlotId === input.secondSlotId) {
    throw new Error("Assessment sessions must be on two different slots.");
  }

  return {
    firstSlotId: input.firstSlotId,
    secondSlotId: input.secondSlotId,
  };
}

function getValidatedPsychologistSelection(
  input: BookingInput,
  patient: Patient,
) {
  const { firstSlotId, secondSlotId } = requirePsychologistSlotIds(input);

  const firstSlotRecord = getSlotRecord(firstSlotId);
  const secondSlotRecord = getSlotRecord(secondSlotId);
  if (!firstSlotRecord || !secondSlotRecord) {
    throw new Error("Selected session was not found.");
  }

  if (isSlotBooked(firstSlotId) || isSlotBooked(secondSlotId)) {
    throw new Error("One of the selected slots is no longer available.");
  }
  if (firstSlotRecord.clinician.clinicianType !== "PSYCHOLOGIST") {
    throw new Error("Selected first session must belong to a psychologist.");
  }
  if (secondSlotRecord.clinician.clinicianType !== "PSYCHOLOGIST") {
    throw new Error("Selected second session must belong to a psychologist.");
  }
  if (!isClinicianEligible(patient, firstSlotRecord.clinician)) {
    throw new Error("Selected clinician is not eligible for this patient.");
  }

  const requiredDuration = SCHEDULING_RULES.PSYCHOLOGIST.durationMinutes;
  assertSlotDuration(firstSlotRecord.slot, requiredDuration);
  assertSlotDuration(secondSlotRecord.slot, requiredDuration);
  if (
    !isSlotBookable(
      firstSlotRecord.clinician,
      firstSlotRecord.slot,
      "ASSESSMENT_SESSION_1",
    )
  ) {
    throw new Error("Selected first session slot is no longer bookable.");
  }
  if (
    !isSlotBookable(
      secondSlotRecord.clinician,
      secondSlotRecord.slot,
      "ASSESSMENT_SESSION_2",
    )
  ) {
    throw new Error("Selected second session slot is no longer bookable.");
  }

  const firstSlot = toSlotOption(
    firstSlotRecord.clinician,
    firstSlotRecord.slot,
  );
  const secondSlot = toSlotOption(
    secondSlotRecord.clinician,
    secondSlotRecord.slot,
  );

  if (
    SCHEDULING_RULES.PSYCHOLOGIST.requiresSameClinician &&
    firstSlot.clinicianId !== secondSlot.clinicianId
  ) {
    throw new Error("Assessment sessions must be with the same psychologist.");
  }

  if (toTimestamp(secondSlot.startsAt) <= toTimestamp(firstSlot.startsAt)) {
    throw new Error("Second session must be after the first session.");
  }
  if (
    SCHEDULING_RULES.PSYCHOLOGIST.requiresDifferentDays &&
    toDayKey(secondSlot.startsAt) === toDayKey(firstSlot.startsAt)
  ) {
    throw new Error("Assessment sessions must be on different days.");
  }
  if (!isValidSecondPsychologistSession(firstSlot, secondSlot)) {
    throw new Error("Second session must be within 7 days.");
  }
  if (
    !canBookPsychologistPairWithinCapacity(
      firstSlotRecord.clinician,
      firstSlot.startsAt,
      secondSlot.startsAt,
    )
  ) {
    throw new Error(
      "Selected sessions exceed clinician daily or weekly limits.",
    );
  }

  return {
    firstSlotId,
    secondSlotId,
    firstSlotRecord,
    firstSlot,
    secondSlot,
  };
}

function bookPsychologistAppointment(input: BookingInput, patient: Patient) {
  const selection = getValidatedPsychologistSelection(input, patient);

  bookedSlotIds.add(selection.firstSlot.slotId);
  bookedSlotIds.add(selection.secondSlot.slotId);
  addAppointmentsForBooking(selection.firstSlot.clinicianId, patient.id, [
    {
      startsAt: selection.firstSlot.startsAt,
      appointmentType: "ASSESSMENT_SESSION_1",
    },
    {
      startsAt: selection.secondSlot.startsAt,
      appointmentType: "ASSESSMENT_SESSION_2",
    },
  ]);

  const booking = createBookingRecord({
    patientId: patient.id,
    clinicianType: "PSYCHOLOGIST",
    clinicianId: selection.firstSlot.clinicianId,
    slotIds: [selection.firstSlotId, selection.secondSlotId],
    appointmentTypes: ["ASSESSMENT_SESSION_1", "ASSESSMENT_SESSION_2"],
  });

  return {
    booking,
    patientName: `${patient.firstName} ${patient.lastName}`,
    clinicianName: selection.firstSlot.clinicianName,
    slots: [selection.firstSlot, selection.secondSlot].sort(compareByStartTime),
  };
}

export function bookAppointment(input: BookingInput) {
  const patient = requirePatient(input.patientId);

  if (input.clinicianType === "THERAPIST") {
    return bookTherapistAppointment(input, patient);
  }

  return bookPsychologistAppointment(input, patient);
}

export function getPatients() {
  return patients.map((patient) => ({ ...patient }));
}

export function getAppointmentTypes() {
  return CLINICIAN_TYPE_OPTIONS.map((clinicianType) => ({
    ...clinicianType,
  }));
}

//for testing/starting over, you can click the reset button in the top right corner to clear all bookings
export function clearAllBookings() {
  bookedSlotIds.clear();
  bookings.length = 0;
  appointmentsByClinician.clear();
  for (const [
    clinicianId,
    appointments,
  ] of initialAppointmentsByClinician.entries()) {
    appointmentsByClinician.set(
      clinicianId,
      appointments.map((appointment) => ({ ...appointment })),
    );
  }
}
