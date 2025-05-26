'use client';

import { useState } from 'react';

export default function Form() {
  const [form, setForm] = useState({
    clientName: '',
    date: '',
    time: '',
    reason: '',
    duration: '',
  });
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value });
    setError(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);

    try {
      const datetime = new Date(`${form.date}T${form.time}`);
      const response = await fetch('/api/appointments', {
        method: 'POST',
        body: JSON.stringify({
          clientName: form.clientName,
          date: datetime,
          reason: form.reason,
          duration: Number(form.duration),
        }),
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to create appointment');
      }

      setForm({ clientName: '', date: '', time: '', reason: '', duration: '' });
      window.location.reload();
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Failed to create appointment');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6 bg-white p-6 rounded-lg shadow-md">
      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-md">
          <p className="text-red-600 text-sm">{error}</p>
        </div>
      )}

      <div className="space-y-2">
        <label htmlFor="clientName" className="block text-sm font-medium text-gray-700">
          Client Name
        </label>
        <input
          id="clientName"
          name="clientName"
          placeholder="Enter client's full name"
          value={form.clientName}
          onChange={handleChange}
          className="w-full p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors text-black"
          required
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <label htmlFor="date" className="block text-sm font-medium text-gray-700">
            Date
          </label>
          <input
            id="date"
            type="date"
            name="date"
            value={form.date}
            onChange={handleChange}
            className="w-full p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors text-black"
            min={new Date().toISOString().split('T')[0]}
            required
          />
        </div>

        <div className="space-y-2">
          <label htmlFor="time" className="block text-sm font-medium text-gray-700">
            Time
          </label>
          <input
            id="time"
            type="time"
            name="time"
            value={form.time}
            onChange={handleChange}
            className="w-full p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors text-black"
            required
          />
        </div>
      </div>

      <div className="space-y-2">
        <label htmlFor="reason" className="block text-sm font-medium text-gray-700">
          Reason / Service
        </label>
        <textarea
          id="reason"
          name="reason"
          placeholder="Describe the purpose of the appointment"
          value={form.reason}
          onChange={handleChange}
          className="w-full p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors min-h-[100px] text-black"
          required
        />
      </div>

      <div className="space-y-2">
        <label htmlFor="duration" className="block text-sm font-medium text-gray-700">
          Duration (minutes)
        </label>
        <input
          id="duration"
          type="number"
          name="duration"
          placeholder="Enter appointment duration"
          value={form.duration}
          onChange={handleChange}
          className="w-full p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors text-black"
          min="15"
          step="15"
          required
        />
        <p className="text-sm text-gray-500">Please enter duration in 15-minute increments</p>
      </div>

      <button
        type="submit"
        disabled={isSubmitting}
        className="w-full bg-blue-600 text-white px-6 py-3 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {isSubmitting ? 'Scheduling...' : 'Schedule Appointment'}
      </button>
    </form>
  );
}
