import { PatientsResponse } from "@/models/contracts";
import { getPatients } from "@/models/engine";

export async function GET() {
  const response: PatientsResponse = {
    patients: getPatients(),
  };
  return Response.json(response);
}
