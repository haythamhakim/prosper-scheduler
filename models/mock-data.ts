import { Appointment, AvailableSlot, Clinician, Patient } from "@/models/types";

const nowIso = new Date().toISOString();

const makeSlots = (
  clinicianId: string,
  length: number,
  dateTimes: string[],
): AvailableSlot[] => {
  return dateTimes.map((date, index) => ({
    id: `${clinicianId}-slot-${index + 1}`,
    clinicianId,
    date,
    length,
    createdAt: nowIso,
    updatedAt: nowIso,
  }));
};

const makeAppointment = (
  id: string,
  patientId: string,
  clinicianId: string,
  scheduledFor: string,
  appointmentType: Appointment["appointmentType"],
): Appointment => ({
  id,
  patientId,
  clinicianId,
  scheduledFor,
  appointmentType,
  status: "UPCOMING",
  createdAt: nowIso,
  updatedAt: nowIso,
});

export const patients: Patient[] = [
  {
    id: "patient-byrnehollander",
    firstName: "Byrne",
    lastName: "Hollander",
    state: "NY",
    insurance: "AETNA",
    avatar: "BH",
    createdAt: nowIso,
    updatedAt: nowIso,
  },
  {
    id: "patient-alexrivera",
    firstName: "Alex",
    lastName: "Rivera",
    state: "CA",
    insurance: "CIGNA",
    avatar: "AR",
    createdAt: nowIso,
    updatedAt: nowIso,
  },
  {
    id: "patient-milanashah",
    firstName: "Milana",
    lastName: "Shah",
    state: "TX",
    insurance: "UNITED",
    avatar: "MS",
    createdAt: nowIso,
    updatedAt: nowIso,
  },
  {
    id: "patient-oliviamorgan",
    firstName: "Olivia",
    lastName: "Morgan",
    state: "FL",
    insurance: "BCBS",
    avatar: "OM",
    createdAt: nowIso,
    updatedAt: nowIso,
  },
];

const therapistOneId = "clinician-therapist-rodriguez";
const therapistTwoId = "clinician-therapist-nguyen";
const psychologistOneId = "clinician-psychologist-doe";
const psychologistTwoId = "clinician-psychologist-patel";
const PSYCHOLOGIST_STARTER_SLOT_DATA: Array<{ date: string; length: number }> = [
  { date: "2026-06-01T12:00:00.000Z", length: 90 },
  { date: "2026-06-01T12:15:00.000Z", length: 90 },
  { date: "2026-06-01T12:30:00.000Z", length: 90 },
  { date: "2026-06-01T12:45:00.000Z", length: 90 },
  { date: "2026-06-01T13:00:00.000Z", length: 90 },
  { date: "2026-06-01T13:30:00.000Z", length: 90 },
  { date: "2026-06-03T14:00:00.000Z", length: 90 },
  { date: "2026-06-03T14:15:00.000Z", length: 90 },
  { date: "2026-06-05T15:00:00.000Z", length: 90 },
  { date: "2026-06-07T16:00:00.000Z", length: 90 },
];

export const clinicians: Clinician[] = [
  {
    id: therapistOneId,
    firstName: "Amelia",
    lastName: "Rodriguez",
    states: ["NY", "FL"],
    insurances: ["AETNA", "BCBS"],
    clinicianType: "THERAPIST",
    appointments: [
      makeAppointment(
        "appt-therapist-rodriguez-1",
        "patient-oliviamorgan",
        therapistOneId,
        "2026-06-01T13:00:00.000Z",
        "THERAPY_INTAKE",
      ),
    ],
    maxDailyAppointments: 2,
    maxWeeklyAppointments: 6,
    availableSlots: makeSlots(therapistOneId, 60, [
      "2026-06-01T13:00:00.000Z",
      "2026-06-01T16:00:00.000Z",
      "2026-06-02T14:00:00.000Z",
      "2026-06-03T18:00:00.000Z",
      "2026-06-05T15:00:00.000Z",
    ]),
    createdAt: nowIso,
    updatedAt: nowIso,
  },
  {
    id: therapistTwoId,
    firstName: "Noah",
    lastName: "Nguyen",
    states: ["CA", "TX"],
    insurances: ["CIGNA", "UNITED"],
    clinicianType: "THERAPIST",
    appointments: [],
    maxDailyAppointments: 3,
    maxWeeklyAppointments: 8,
    availableSlots: makeSlots(therapistTwoId, 60, [
      "2026-06-01T17:00:00.000Z",
      "2026-06-02T19:00:00.000Z",
      "2026-06-04T16:00:00.000Z",
      "2026-06-05T13:00:00.000Z",
      "2026-06-06T14:00:00.000Z",
    ]),
    createdAt: nowIso,
    updatedAt: nowIso,
  },
  {
    id: psychologistOneId,
    firstName: "Jane",
    lastName: "Doe",
    states: ["NY", "CA"],
    insurances: ["AETNA", "CIGNA"],
    clinicianType: "PSYCHOLOGIST",
    appointments: [],
    availableSlots: PSYCHOLOGIST_STARTER_SLOT_DATA.map((slot, index) => ({
      id: `slot-${index + 1}`,
      clinicianId: psychologistOneId,
      date: slot.date,
      length: slot.length,
      createdAt: nowIso,
      updatedAt: nowIso,
    })),
    maxDailyAppointments: 2,
    maxWeeklyAppointments: 8,
    createdAt: nowIso,
    updatedAt: nowIso,
  },
  {
    id: psychologistTwoId,
    firstName: "Priya",
    lastName: "Patel",
    states: ["TX", "FL", "NY"],
    insurances: ["UNITED", "BCBS", "AETNA"],
    clinicianType: "PSYCHOLOGIST",
    appointments: [
      makeAppointment(
        "appt-psych-patel-1",
        "patient-oliviamorgan",
        psychologistTwoId,
        "2026-06-05T18:00:00.000Z",
        "ASSESSMENT_SESSION_1",
      ),
      makeAppointment(
        "appt-psych-patel-2",
        "patient-oliviamorgan",
        psychologistTwoId,
        "2026-06-07T12:00:00.000Z",
        "ASSESSMENT_SESSION_2",
      ),
    ],
    maxDailyAppointments: 2,
    maxWeeklyAppointments: 3,
    availableSlots: makeSlots(psychologistTwoId, 90, [
      "2026-06-01T15:00:00.000Z",
      "2026-06-01T15:15:00.000Z",
      "2026-06-01T15:30:00.000Z",
      "2026-06-01T16:30:00.000Z",
      "2026-06-02T17:00:00.000Z",
      "2026-06-02T17:15:00.000Z",
      "2026-06-04T13:30:00.000Z",
      "2026-06-05T18:00:00.000Z",
      "2026-06-07T12:00:00.000Z",
      "2026-06-08T14:30:00.000Z",
    ]),
    createdAt: nowIso,
    updatedAt: nowIso,
  },
];
