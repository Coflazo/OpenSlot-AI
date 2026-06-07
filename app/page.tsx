import { BarChart3, Calendar, Users, Phone } from "lucide-react";

export default function Dashboard() {
  return (
    <div className="p-8 space-y-8">
      {/* Page Header */}
      <div>
        <h1 className="text-4xl font-bold text-white">Dashboard</h1>
        <p className="text-slate-400 mt-2">Welcome to OpenSlot AI Recovery Console</p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-6 hover:bg-slate-800/70 transition-colors cursor-pointer">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-slate-400 text-sm font-medium">Open Slots</p>
              <p className="text-white text-3xl font-bold mt-2">14</p>
              <p className="text-slate-500 text-xs mt-2">+2 from yesterday</p>
            </div>
            <div className="h-12 w-12 rounded-lg bg-blue-500/20 flex items-center justify-center">
              <Calendar className="h-6 w-6 text-blue-400" />
            </div>
          </div>
        </div>

        <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-6 hover:bg-slate-800/70 transition-colors cursor-pointer">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-slate-400 text-sm font-medium">Waiting Patients</p>
              <p className="text-white text-3xl font-bold mt-2">47</p>
              <p className="text-slate-500 text-xs mt-2">+8 this week</p>
            </div>
            <div className="h-12 w-12 rounded-lg bg-purple-500/20 flex items-center justify-center">
              <Users className="h-6 w-6 text-purple-400" />
            </div>
          </div>
        </div>

        <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-6 hover:bg-slate-800/70 transition-colors cursor-pointer">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-slate-400 text-sm font-medium">Calls Made</p>
              <p className="text-white text-3xl font-bold mt-2">142</p>
              <p className="text-slate-500 text-xs mt-2">62% success rate</p>
            </div>
            <div className="h-12 w-12 rounded-lg bg-green-500/20 flex items-center justify-center">
              <Phone className="h-6 w-6 text-green-400" />
            </div>
          </div>
        </div>

        <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-6 hover:bg-slate-800/70 transition-colors cursor-pointer">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-slate-400 text-sm font-medium">Recovered Revenue</p>
              <p className="text-white text-3xl font-bold mt-2">€12,450</p>
              <p className="text-slate-500 text-xs mt-2">+€2,100 today</p>
            </div>
            <div className="h-12 w-12 rounded-lg bg-cyan-500/20 flex items-center justify-center">
              <BarChart3 className="h-6 w-6 text-cyan-400" />
            </div>
          </div>
        </div>
      </div>

      {/* Content Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Activity */}
        <div className="lg:col-span-2 bg-slate-800/50 border border-slate-700 rounded-lg p-6">
          <h2 className="text-lg font-semibold text-white mb-4">Recent Activity</h2>
          <div className="space-y-3">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="flex items-center justify-between py-3 border-b border-slate-700 last:border-b-0">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-full bg-blue-500/20 flex items-center justify-center">
                    <Phone className="h-5 w-5 text-blue-400" />
                  </div>
                  <div>
                    <p className="text-sm text-white">Call completed with patient</p>
                    <p className="text-xs text-slate-400">2 hours ago</p>
                  </div>
                </div>
                <span className="text-xs text-green-400 font-semibold">SUCCESS</span>
              </div>
            ))}
          </div>
        </div>

        {/* Quick Stats */}
        <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-6">
          <h2 className="text-lg font-semibold text-white mb-4">This Week</h2>
          <div className="space-y-4">
            <div>
              <div className="flex justify-between mb-2">
                <span className="text-sm text-slate-400">Success Rate</span>
                <span className="text-sm text-white font-semibold">62%</span>
              </div>
              <div className="w-full h-2 bg-slate-700 rounded-full overflow-hidden">
                <div className="h-full w-[62%] bg-gradient-to-r from-green-500 to-emerald-500"></div>
              </div>
            </div>
            <div>
              <div className="flex justify-between mb-2">
                <span className="text-sm text-slate-400">Booking Rate</span>
                <span className="text-sm text-white font-semibold">48%</span>
              </div>
              <div className="w-full h-2 bg-slate-700 rounded-full overflow-hidden">
                <div className="h-full w-[48%] bg-gradient-to-r from-blue-500 to-cyan-500"></div>
              </div>
            </div>
            <div>
              <div className="flex justify-between mb-2">
                <span className="text-sm text-slate-400">Avg Response Time</span>
                <span className="text-sm text-white font-semibold">1.2s</span>
              </div>
              <div className="w-full h-2 bg-slate-700 rounded-full overflow-hidden">
                <div className="h-full w-[85%] bg-gradient-to-r from-purple-500 to-pink-500"></div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
