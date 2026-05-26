import { FollowUpOptionsResponse } from "@/models/contracts";
import { getPsychologistFollowUpOptions } from "@/models/engine";
import { NextRequest } from "next/server";

export async function GET(request: NextRequest) {
  try {
    const patientId = request.nextUrl.searchParams.get("patientId");
    const firstSlotId = request.nextUrl.searchParams.get("firstSlotId");

    if (!patientId || !firstSlotId) {
      return Response.json(
        { error: "patientId and firstSlotId are required." },
        { status: 400 },
      );
    }

    const options = getPsychologistFollowUpOptions(patientId, firstSlotId);
    const response: FollowUpOptionsResponse = {
      firstSlotId,
      options,
    };
    return Response.json(response);
  } catch (error) {
    return Response.json(
      { error: error instanceof Error ? error.message : "Unknown error." },
      { status: 400 },
    );
  }
}
