import { Activity } from 'lucide-react';

export function Header() {
  return (
    <header className="bg-white shadow-sm">
      <div className="max-w-7xl mx-auto px-4 py-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <Activity className="h-8 w-8 text-blue-600" />
            <h1 className="ml-2 text-2xl font-bold text-gray-900">FlowGuardian</h1>
          </div>
          <div className="flex items-center space-x-4">
            <span className="px-3 py-1 rounded-full bg-green-100 text-green-800 text-sm font-medium">
              System Online
            </span>
          </div>
        </div>
      </div>
    </header>
  );
}