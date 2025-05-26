import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@/app/generated/prisma';
import { sendRescheduleEmail } from '@/app/services/email';

const prisma = new PrismaClient();

async function checkForConflicts(date: Date, duration: number, excludeId: string) {
  const appointmentStart = new Date(date);
  const appointmentEnd = new Date(appointmentStart.getTime() + duration * 60000);

  const existingAppointments = await prisma.appointment.findMany({
    where: {
      id: { not: excludeId },
      OR: [
        {
          AND: [
            { date: { lte: appointmentStart } },
            {
              date: {
                gte: new Date(appointmentStart.getTime() - duration * 60000),
              },
            },
          ],
        },
        {
          AND: [
            { date: { lte: appointmentEnd } },
            { date: { gte: appointmentStart } },
          ],
        },
      ],
    },
  });

  return existingAppointments.length > 0;
}

export async function PUT(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await req.json();
    const { newDate, clientEmail } = body;

    const appointment = await prisma.appointment.findUnique({
      where: { id: params.id },
    });

    if (!appointment) {
      return NextResponse.json(
        { error: 'Appointment not found' },
        { status: 404 }
      );
    }

    const hasConflict = await checkForConflicts(
      new Date(newDate),
      appointment.duration,
      params.id
    );

    if (hasConflict) {
      return NextResponse.json(
        { error: 'This time slot conflicts with an existing appointment' },
        { status: 409 }
      );
    }

    const updatedAppointment = await prisma.appointment.update({
      where: { id: params.id },
      data: {
        date: new Date(newDate),
        email: clientEmail || appointment.email,
      },
    });

    // Send reschedule confirmation email if email is provided
    if (clientEmail || appointment.email) {
      await sendRescheduleEmail(
        appointment.clientName,
        clientEmail || appointment.email!,
        new Date(newDate),
        appointment.reason
      );
    }

    return NextResponse.json(updatedAppointment);
  } catch (error) {
    console.error('Error rescheduling appointment:', error);
    return NextResponse.json(
      { error: 'Failed to reschedule appointment' },
      { status: 500 }
    );
  }
} 