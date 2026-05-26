import {
  AppointmentType,
  ClinicianType,
  ClinicianTypeOption,
} from "@/models/types";

type SchedulingRule = {
  label: string;
  description: string;
  durationMinutes: number;
  requiredSessions: number;
  appointmentTypes: AppointmentType[];
  maxGapDays?: number;
  requiresDifferentDays?: boolean;
  requiresSameClinician?: boolean;
};

type SchedulingRulesByClinician = {
  THERAPIST: SchedulingRule;
  PSYCHOLOGIST: SchedulingRule & {
    maxGapDays: number;
    requiresDifferentDays: boolean;
    requiresSameClinician: boolean;
  };
};

export const SCHEDULING_RULES: SchedulingRulesByClinician = {
  THERAPIST: {
    label: "Therapist",
    description: "One 60-minute therapy intake appointment.",
    durationMinutes: 60,
    requiredSessions: 1,
    appointmentTypes: ["THERAPY_INTAKE"],
  },
  PSYCHOLOGIST: {
    label: "Psychologist",
    description:
      "Two 90-minute assessment sessions on different days, within 7 days.",
    durationMinutes: 90,
    requiredSessions: 2,
    appointmentTypes: ["ASSESSMENT_SESSION_1", "ASSESSMENT_SESSION_2"],
    maxGapDays: 7,
    requiresDifferentDays: true,
    requiresSameClinician: true,
  },
};

export const CLINICIAN_TYPE_OPTIONS: ClinicianTypeOption[] = (
  Object.keys(SCHEDULING_RULES) as ClinicianType[]
).map((clinicianType) => {
  const rule = SCHEDULING_RULES[clinicianType];
  return {
    id: clinicianType,
    label: rule.label,
    description: rule.description,
    durationMinutes: rule.durationMinutes,
  };
});

export const APPOINTMENT_TYPE_DURATIONS: Record<AppointmentType, number> = {
  THERAPY_INTAKE: 60,
  ASSESSMENT_SESSION_1: 90,
  ASSESSMENT_SESSION_2: 90,
};
