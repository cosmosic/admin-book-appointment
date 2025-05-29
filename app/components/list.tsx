'use client';

import { useEffect, useState } from 'react';
import { format, startOfDay, endOfDay, isSameDay, parseISO } from 'date-fns';

type Appointment = {
  id: string;
  clientName: string;
  date: string;
  reason: string;
  duration: number;
};

type DateFilter = 'all' | 'today' | 'week' | 'month' | 'custom';

type CancellationModal = {
  isOpen: boolean;
  appointmentId: string | null;
  clientName: string;
  date: string;
  reason: string;
};

export default function List() {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [editingAppointment, setEditingAppointment] = useState<Appointment | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [dateFilter, setDateFilter] = useState<DateFilter>('all');
  const [customDate, setCustomDate] = useState<string>('');
  const [cancellationModal, setCancellationModal] = useState<CancellationModal>({
    isOpen: false,
    appointmentId: null,
    clientName: '',
    date: '',
    reason: '',
  });
  const [cancellationReason, setCancellationReason] = useState('');

  const fetchAppointments = async () => {
    try {
      const response = await fetch('/api/appointments');
      const data = await response.json();
      setAppointments(data);
    } catch (error) {
      console.error('Failed to fetch appointments:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchAppointments();
  }, []);

  const filterAppointments = (appointments: Appointment[]) => {
    const now = new Date();
    const today = startOfDay(now);
    const endOfToday = endOfDay(now);
    const endOfWeek = new Date(now.setDate(now.getDate() + 7));
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);

    switch (dateFilter) {
      case 'today':
        return appointments.filter(app => {
          const appDate = new Date(app.date);
          return isSameDay(appDate, today);
        });
      case 'week':
        return appointments.filter(app => {
          const appDate = new Date(app.date);
          return appDate >= today && appDate <= endOfWeek;
        });
      case 'month':
        return appointments.filter(app => {
          const appDate = new Date(app.date);
          return appDate >= today && appDate <= endOfMonth;
        });
      case 'custom':
        if (!customDate) return appointments;
        return appointments.filter(app => {
          const appDate = new Date(app.date);
          return isSameDay(appDate, parseISO(customDate));
        });
      default:
        return appointments;
    }
  };

  const groupedAppointments = () => {
    const filtered = filterAppointments(appointments);
    const groups: { [key: string]: Appointment[] } = {};

    filtered.forEach(app => {
      const date = format(new Date(app.date), 'yyyy-MM-dd');
      if (!groups[date]) {
        groups[date] = [];
      }
      groups[date].push(app);
    });

    return Object.entries(groups).sort(([dateA], [dateB]) => dateA.localeCompare(dateB));
  };

  const handleDelete = async (appointment: Appointment) => {
    setCancellationModal({
      isOpen: true,
      appointmentId: appointment.id,
      clientName: appointment.clientName,
      date: appointment.date,
      reason: appointment.reason,
    });
  };

  const confirmCancellation = async () => {
    if (!cancellationModal.appointmentId) return;

    setIsSubmitting(true);
    try {
      const response = await fetch(`/api/appointments?id=${cancellationModal.appointmentId}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ cancellationReason }),
      });

      if (!response.ok) {
        throw new Error('Failed to cancel appointment');
      }

      await fetchAppointments();
      setCancellationModal({ isOpen: false, appointmentId: null, clientName: '', date: '', reason: '' });
      setCancellationReason('');
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Failed to cancel appointment');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEdit = (appointment: Appointment) => {
    setEditingAppointment(appointment);
  };

  const handleUpdate = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!editingAppointment) return;

    setError(null);
    setIsSubmitting(true);

    try {
      const response = await fetch('/api/appointments', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(editingAppointment),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to update appointment');
      }

      setEditingAppointment(null);
      await fetchAppointments();
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Failed to update appointment');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (appointments.length === 0) {
    return (
      <div className="text-center p-8 bg-gray-50 rounded-lg">
        <h2 className="text-xl font-semibold text-gray-700 mb-2">No Appointments</h2>
        <p className="text-gray-500">There are no scheduled appointments at the moment.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <h2 className="text-2xl font-bold text-gray-800">Scheduled Appointments</h2>
        <div className="flex flex-wrap gap-2">
          <select
            value={dateFilter}
            onChange={(e) => setDateFilter(e.target.value as DateFilter)}
            className="px-3 py-2 border rounded-md text-black bg-white"
          >
            <option value="all">All Appointments</option>
            <option value="today">Today</option>
            <option value="week">Next 7 Days</option>
            <option value="month">This Month</option>
            <option value="custom">Custom Date</option>
          </select>
          {dateFilter === 'custom' && (
            <input
              type="date"
              value={customDate}
              onChange={(e) => setCustomDate(e.target.value)}
              className="px-3 py-2 border rounded-md text-black"
            />
          )}
        </div>
      </div>

      <div className="space-y-6">
        {groupedAppointments().map(([date, dayAppointments]) => (
          <div key={date} className="space-y-2">
            <h3 className="text-lg font-semibold text-gray-700 sticky top-0 bg-white py-2">
              {format(parseISO(date), 'EEEE, MMMM d, yyyy')}
            </h3>
            <div className="grid gap-4">
              {dayAppointments.map(app => (
                <div
                  key={app.id}
                  className="bg-white p-6 rounded-lg shadow-sm border border-gray-100 hover:shadow-md transition-shadow"
                >
                  {editingAppointment?.id === app.id ? (
                    <form onSubmit={handleUpdate} className="space-y-4">
                      {error && (
                        <div className="p-4 bg-red-50 border border-red-200 rounded-md">
                          <p className="text-red-600 text-sm">{error}</p>
                        </div>
                      )}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Client Name
                          </label>
                          <input
                            type="text"
                            value={editingAppointment.clientName}
                            onChange={(e) => setEditingAppointment({ ...editingAppointment, clientName: e.target.value })}
                            className="w-full p-2 border rounded-md text-black"
                            required
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Duration (minutes)
                          </label>
                          <input
                            type="number"
                            value={editingAppointment.duration}
                            onChange={(e) => setEditingAppointment({ ...editingAppointment, duration: Number(e.target.value) })}
                            className="w-full p-2 border rounded-md text-black"
                            min="15"
                            step="15"
                            required
                          />
                        </div>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Reason / Service
                        </label>
                        <textarea
                          value={editingAppointment.reason}
                          onChange={(e) => setEditingAppointment({ ...editingAppointment, reason: e.target.value })}
                          className="w-full p-2 border rounded-md text-black"
                          required
                        />
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Date
                          </label>
                          <input
                            type="date"
                            value={format(new Date(editingAppointment.date), 'yyyy-MM-dd')}
                            onChange={(e) => {
                              const newDate = new Date(editingAppointment.date);
                              const [year, month, day] = e.target.value.split('-').map(Number);
                              newDate.setFullYear(year, month - 1, day);
                              setEditingAppointment({ ...editingAppointment, date: newDate.toISOString() });
                            }}
                            className="w-full p-2 border rounded-md text-black"
                            required
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Time
                          </label>
                          <input
                            type="time"
                            value={format(new Date(editingAppointment.date), 'HH:mm')}
                            onChange={(e) => {
                              const newDate = new Date(editingAppointment.date);
                              const [hours, minutes] = e.target.value.split(':').map(Number);
                              newDate.setHours(hours, minutes);
                              setEditingAppointment({ ...editingAppointment, date: newDate.toISOString() });
                            }}
                            className="w-full p-2 border rounded-md text-black"
                            required
                          />
                        </div>
                      </div>
                      <div className="flex gap-2 justify-end">
                        <button
                          type="button"
                          onClick={() => {
                            setEditingAppointment(null);
                            setError(null);
                          }}
                          className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200"
                        >
                          Cancel
                        </button>
                        <button
                          type="submit"
                          disabled={isSubmitting}
                          className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          {isSubmitting ? 'Saving...' : 'Save Changes'}
                        </button>
                      </div>
                    </form>
                  ) : (
                    <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                      <div className="space-y-1">
                        <h3 className="text-lg font-semibold text-gray-800">{app.clientName}</h3>
                        <p className="text-gray-600">{app.reason}</p>
                      </div>
                      <div className="flex flex-col md:items-end space-y-1">
                        <div className="text-sm font-medium text-blue-600">
                          {format(new Date(app.date), 'h:mm a')}
                        </div>
                        <div className="text-sm text-gray-500">
                          {app.duration} minutes
                        </div>
                        <div className="flex gap-2 mt-2">
                          <button
                            onClick={() => handleEdit(app)}
                            className="text-sm text-blue-600 hover:text-blue-700"
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => handleDelete(app)}
                            className="text-sm text-red-600 hover:text-red-700"
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Cancellation Modal */}
      {cancellationModal.isOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg p-6 max-w-md w-full">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Cancel Appointment</h3>
            
            <div className="space-y-4">
              <div>
                <p className="text-sm text-gray-600">Client</p>
                <p className="font-medium">{cancellationModal.clientName}</p>
              </div>
              
              <div>
                <p className="text-sm text-gray-600">Date & Time</p>
                <p className="font-medium">
                  {format(new Date(cancellationModal.date), 'EEEE, MMMM d, yyyy h:mm a')}
                </p>
              </div>
              
              <div>
                <p className="text-sm text-gray-600">Service</p>
                <p className="font-medium">{cancellationModal.reason}</p>
              </div>

              <div>
                <label htmlFor="cancellationReason" className="block text-sm font-medium text-gray-700 mb-1">
                  Reason for Cancellation
                </label>
                <textarea
                  id="cancellationReason"
                  value={cancellationReason}
                  onChange={(e) => setCancellationReason(e.target.value)}
                  className="w-full p-2 border rounded-md text-black"
                  rows={3}
                  placeholder="Enter reason for cancellation..."
                />
              </div>

              {error && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-md">
                  <p className="text-red-600 text-sm">{error}</p>
                </div>
              )}

              <div className="flex justify-end gap-3 mt-6">
                <button
                  onClick={() => {
                    setCancellationModal({ isOpen: false, appointmentId: null, clientName: '', date: '', reason: '' });
                    setCancellationReason('');
                    setError(null);
                  }}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200"
                >
                  Keep Appointment
                </button>
                <button
                  onClick={confirmCancellation}
                  disabled={isSubmitting}
                  className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-md hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isSubmitting ? 'Cancelling...' : 'Confirm Cancellation'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
