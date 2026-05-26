import { AppointmentTypesResponse } from "@/models/contracts";
import { getAppointmentTypes } from "@/models/engine";

export async function GET() {
  const response: AppointmentTypesResponse = {
    appointmentTypes: [...getAppointmentTypes()],
  };
  return Response.json(response);
}
