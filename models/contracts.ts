import {
  AssessmentOptionsByClinician,
  ClinicianType,
  ClinicianTypeOption,
  Patient,
  SlotOption,
} from "./types";

export interface PatientsResponse {
  patients: Patient[];
}

export interface AppointmentTypesResponse {
  appointmentTypes: ClinicianTypeOption[];
}

export interface SchedulerOptionsResponse {
  schedulingTrack: ClinicianType;
  options: SlotOption[];
  optionsByClinician?: AssessmentOptionsByClinician[];
}

export interface FollowUpOptionsResponse {
  firstSlotId: string;
  options: SlotOption[];
}

export interface BookRequest {
  patientId: string;
  schedulingTrack: ClinicianType;
  slotId?: string;
  firstSlotId?: string;
  secondSlotId?: string;
}

export interface BookResponse {
  confirmationId: string;
  message: string;
  patientName: string;
  clinicianName: string;
  schedulingTrack: ClinicianType;
  slots: SlotOption[];
}

export interface ResetResponse {
  ok: true;
  message: string;
}
