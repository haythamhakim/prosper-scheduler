import { BookRequest, BookResponse } from "@/models/contracts";
import { bookAppointment } from "@/models/engine";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as BookRequest;
    const result = bookAppointment({
      patientId: body.patientId,
      clinicianType: body.schedulingTrack,
      slotId: body.slotId,
      firstSlotId: body.firstSlotId,
      secondSlotId: body.secondSlotId,
    });

    const response: BookResponse = {
      confirmationId: result.booking.id,
      message: "Thanks, your appointment has been confirmed.",
      patientName: result.patientName,
      clinicianName: result.clinicianName,
      schedulingTrack: result.booking.clinicianType,
      slots: result.slots,
    };

    return Response.json(response);
  } catch (error) {
    return Response.json(
      { error: error instanceof Error ? error.message : "Unknown error." },
      { status: 400 },
    );
  }
}
