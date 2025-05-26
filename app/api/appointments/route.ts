import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@/app/generated/prisma';

const prisma = new PrismaClient();

async function checkForConflicts(date: Date, duration: number, excludeId?: string) {
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

export async function GET() {
  try {
    const appointments = await prisma.appointment.findMany({
      orderBy: { date: 'asc' },
    });
    return NextResponse.json(appointments);
  } catch (error) {
    console.error('Error fetching appointments:', error);
    return NextResponse.json({ error: 'Failed to fetch appointments' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { clientName, date, reason, duration } = body;

    const hasConflict = await checkForConflicts(new Date(date), Number(duration));
    if (hasConflict) {
      return NextResponse.json(
        { error: 'This time slot conflicts with an existing appointment' },
        { status: 409 }
      );
    }

    const appointment = await prisma.appointment.create({
      data: {
        clientName,
        date: new Date(date),
        reason,
        duration: Number(duration),
      },
    });

    return NextResponse.json(appointment, { status: 201 });
  } catch (error) {
    console.error('Error creating appointment:', error);
    return NextResponse.json({ error: 'Failed to create appointment' }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const body = await req.json();
    const { id, clientName, date, reason, duration } = body;

    const hasConflict = await checkForConflicts(new Date(date), Number(duration), id);
    if (hasConflict) {
      return NextResponse.json(
        { error: 'This time slot conflicts with an existing appointment' },
        { status: 409 }
      );
    }

    const appointment = await prisma.appointment.update({
      where: { id },
      data: {
        clientName,
        date: new Date(date),
        reason,
        duration: Number(duration),
      },
    });

    return NextResponse.json(appointment);
  } catch (error) {
    console.error('Error updating appointment:', error);
    return NextResponse.json({ error: 'Failed to update appointment' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'Appointment ID is required' }, { status: 400 });
    }

    const body = await req.json();
    const { cancellationReason } = body;

    // Log the cancellation for record-keeping
    console.log(`Appointment ${id} cancelled. Reason: ${cancellationReason || 'No reason provided'}`);

    await prisma.appointment.delete({
      where: { id },
    });

    return NextResponse.json({ 
      message: 'Appointment cancelled successfully',
      cancellationReason: cancellationReason || 'No reason provided'
    });
  } catch (error) {
    console.error('Error cancelling appointment:', error);
    return NextResponse.json({ error: 'Failed to cancel appointment' }, { status: 500 });
  }
}
