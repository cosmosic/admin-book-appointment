import Form from './form';
import List from './list';

export default function AppointmentsPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto p-6 space-y-8">
        <header className="text-center space-y-2">
          <h1 className="text-3xl font-bold text-gray-900">Admin Appointment Booker</h1>
          <p className="text-gray-600">Schedule and manage client appointments efficiently</p>
        </header>

        <div className="grid md:grid-cols-2 gap-8">
          <div className="space-y-6">
            <div className="bg-white rounded-lg shadow-sm p-6">
              <h2 className="text-xl font-semibold text-gray-800 mb-4">Schedule New Appointment</h2>
              <Form />
            </div>
          </div>

          <div className="space-y-6">
            <div className="bg-white rounded-lg shadow-sm p-6">
              <List />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
