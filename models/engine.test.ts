import { beforeEach, describe, expect, it } from "vitest";
import {
  bookAppointment,
  clearAllBookings,
  getAssessmentOptionsGroupedByClinician,
  getPatients,
  optimizeSlotsForMaxAppointments,
} from "./engine";

describe("optimizeSlotsForMaxAppointments", () => {
  it("selects the largest set of non-overlapping slot start times", () => {
    const starts = [
      "2024-08-19T12:00:00.000Z",
      "2024-08-19T12:15:00.000Z",
      "2024-08-19T12:30:00.000Z",
      "2024-08-19T12:45:00.000Z",
      "2024-08-19T13:00:00.000Z",
      "2024-08-19T13:15:00.000Z",
      "2024-08-19T13:30:00.000Z",
    ];

    expect(optimizeSlotsForMaxAppointments(starts, 90)).toEqual([
      "2024-08-19T12:00:00.000Z",
      "2024-08-19T13:30:00.000Z",
    ]);
  });
});

describe("assessment option generation", () => {
  beforeEach(() => {
    clearAllBookings();
  });

  it("includes the exact starter patient id in seeded data", () => {
    const patientIds = getPatients().map((patient) => patient.id);
    expect(patientIds).toContain("patient-byrnehollander");
  });

  it("groups assessment options by clinician with valid pairs", () => {
    const groups = getAssessmentOptionsGroupedByClinician(
      "patient-byrnehollander",
    );

    expect(groups.length).toBeGreaterThan(0);
    expect(groups.some((group) => group.sessionPairs.length > 0)).toBe(true);
    for (const group of groups) {
      for (const pair of group.sessionPairs) {
        expect(pair.first.clinicianId).toBe(group.clinicianId);
        expect(pair.second.clinicianId).toBe(group.clinicianId);
        expect(new Date(pair.second.startsAt).getTime()).toBeGreaterThan(
          new Date(pair.first.startsAt).getTime(),
        );
      }
    }
  });

  it("blocks psychologist booking pairs that exceed weekly capacity", () => {
    expect(() =>
      bookAppointment({
        patientId: "patient-oliviamorgan",
        clinicianType: "PSYCHOLOGIST",
        firstSlotId: "clinician-psychologist-patel-slot-1",
        secondSlotId: "clinician-psychologist-patel-slot-5",
      }),
    ).toThrow("exceed clinician daily or weekly limits");
  });
});
