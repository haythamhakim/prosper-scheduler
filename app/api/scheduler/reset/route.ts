import { ResetResponse } from "@/models/contracts";
import { clearAllBookings } from "@/models/engine";

export async function POST() {
  clearAllBookings();
  const response: ResetResponse = {
    ok: true,
    message: "All bookings cleared.",
  };
  return Response.json(response);
}
