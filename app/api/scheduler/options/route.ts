import { SchedulerOptionsResponse } from "@/models/contracts";
import {
  getAssessmentOptionsGroupedByClinician,
  getSchedulerOptions,
} from "@/models/engine";
import { ClinicianType } from "@/models/types";
import { NextRequest } from "next/server";

export async function GET(request: NextRequest) {
  try {
    const patientId = request.nextUrl.searchParams.get("patientId");
    const schedulingTrack = (request.nextUrl.searchParams.get(
      "schedulingTrack",
    ) ??
      request.nextUrl.searchParams.get(
        "appointmentType",
      )) as ClinicianType | null;

    if (
      !patientId ||
      (schedulingTrack !== "THERAPIST" && schedulingTrack !== "PSYCHOLOGIST")
    ) {
      return Response.json(
        { error: "patientId and schedulingTrack are required." },
        { status: 400 },
      );
    }

    const optionsByClinician =
      schedulingTrack === "PSYCHOLOGIST"
        ? getAssessmentOptionsGroupedByClinician(patientId)
        : undefined;
    const options =
      schedulingTrack === "PSYCHOLOGIST"
        ? optionsByClinician!
            .flatMap((group) => group.firstSessionOptions)
            .sort(
              (a, b) =>
                new Date(a.startsAt).getTime() - new Date(b.startsAt).getTime(),
            )
        : getSchedulerOptions(patientId, schedulingTrack);
    const response: SchedulerOptionsResponse = {
      schedulingTrack,
      options,
      optionsByClinician,
    };
    return Response.json(response);
  } catch (error) {
    return Response.json(
      { error: error instanceof Error ? error.message : "Unknown error." },
      { status: 400 },
    );
  }
}
