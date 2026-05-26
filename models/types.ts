export const INSURANCE_PAYERS = ["AETNA", "BCBS", "CIGNA", "UNITED"] as const;
export type InsurancePayer = (typeof INSURANCE_PAYERS)[number];

export const US_STATE_ABBREVIATIONS = [
  "AL",
  "AK",
  "AZ",
  "AR",
  "CA",
  "CO",
  "CT",
  "DE",
  "FL",
  "GA",
  "HI",
  "ID",
  "IL",
  "IN",
  "IA",
  "KS",
  "KY",
  "LA",
  "ME",
  "MD",
  "MA",
  "MI",
  "MN",
  "MS",
  "MO",
  "MT",
  "NE",
  "NV",
  "NH",
  "NJ",
  "NM",
  "NY",
  "NC",
  "ND",
  "OH",
  "OK",
  "OR",
  "PA",
  "RI",
  "SC",
  "SD",
  "TN",
  "TX",
  "UT",
  "VT",
  "VA",
  "WA",
  "WV",
  "WI",
  "WY",
] as const;
export type UsStateAbbreviation = (typeof US_STATE_ABBREVIATIONS)[number];

export const CLINICIAN_TYPES = ["THERAPIST", "PSYCHOLOGIST"] as const;
export type ClinicianType = (typeof CLINICIAN_TYPES)[number];

export const APPOINTMENT_TYPES = [
  "ASSESSMENT_SESSION_1",
  "ASSESSMENT_SESSION_2",
  "THERAPY_INTAKE",
] as const;
export type AppointmentType = (typeof APPOINTMENT_TYPES)[number];

export const APPOINTMENT_STATUSES = [
  "UPCOMING",
  "OCCURRED",
  "NO_SHOW",
  "RE_SCHEDULED",
  "CANCELLED",
  "LATE_CANCELLATION",
] as const;
export type AppointmentStatus = (typeof APPOINTMENT_STATUSES)[number];

export interface Patient {
  id: string;
  firstName: string;
  lastName: string;
  state: UsStateAbbreviation;
  insurance: InsurancePayer;
  avatar: string;
  createdAt: string;
  updatedAt: string;
}

export interface AvailableSlot {
  id: string;
  clinicianId: string;
  date: string;
  length: number;
  createdAt: string;
  updatedAt: string;
}

export interface Appointment {
  id: string;
  patientId: string;
  clinicianId: string;
  scheduledFor: string;
  appointmentType: AppointmentType;
  status: AppointmentStatus;
  createdAt: string;
  updatedAt: string;
}

export interface Clinician {
  id: string;
  firstName: string;
  lastName: string;
  states: UsStateAbbreviation[];
  insurances: InsurancePayer[];
  clinicianType: ClinicianType;
  appointments: Appointment[];
  maxDailyAppointments: number;
  maxWeeklyAppointments: number;
  availableSlots: AvailableSlot[];
  createdAt: string;
  updatedAt: string;
}

export interface ClinicianTypeOption {
  id: ClinicianType;
  label: string;
  description: string;
  durationMinutes: number;
}

export interface SlotOption {
  slotId: string;
  clinicianId: string;
  clinicianName: string;
  startsAt: string;
  lengthMinutes: number;
}

export interface BookingRecord {
  id: string;
  patientId: string;
  clinicianType: ClinicianType;
  clinicianId: string;
  slotIds: string[];
  appointmentTypes: AppointmentType[];
  createdAt: string;
}

export interface AssessmentSlotPair {
  first: SlotOption;
  second: SlotOption;
}

export interface AssessmentOptionsByClinician {
  clinicianId: string;
  clinicianName: string;
  firstSessionOptions: SlotOption[];
  sessionPairs: AssessmentSlotPair[];
}
