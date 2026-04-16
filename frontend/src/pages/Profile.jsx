import { BadgeCheck, Mail, ShieldCheck, Settings, Bell, Lock, User, LogOut } from "lucide-react";

export default function Profile() {
  const email = localStorage.getItem("user_email") || "Not logged in";
  const token = localStorage.getItem("token");
  const initials = email.split("@")[0].slice(0, 2).toUpperCase();

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user_email");
    window.dispatchEvent(new Event("auth-changed"));
    window.location.href = "/login";
  };

  return (
    <div className="space-y-8">
      {/* Header Section */}
      <div className="relative rounded-2xl bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 p-8 text-white overflow-hidden">
        <div className="absolute top-0 right-0 -m-24 w-96 h-96 bg-white/10 rounded-3xl blur-3xl"></div>
        <div className="relative z-10">
          <h1 className="text-3xl font-bold mb-2">Account Settings</h1>
          <p className="text-white/80">Manage your profile and preferences</p>
        </div>
      </div>

      {/* Profile Card */}
      <div className="bg-white rounded-2xl p-8 shadow-sm border border-gray-100">
        <div className="flex flex-col md:flex-row items-start md:items-center gap-6">
          {/* Avatar */}
          <div className="flex-shrink-0">
            <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-blue-600 to-purple-600 flex items-center justify-center">
              <span className="text-3xl font-bold text-white">{initials}</span>
            </div>
          </div>

          {/* Info */}
          <div className="flex-1">
            <h2 className="text-2xl font-bold text-gray-900">{email.split("@")[0]}</h2>
            <p className="text-gray-600 text-sm mt-1">{email}</p>
            <div className="flex items-center gap-2 mt-3">
              {token && <span className="inline-flex items-center gap-1.5 rounded-full bg-green-100 text-green-700 text-xs font-semibold px-3 py-1">
                <ShieldCheck className="w-3.5 h-3.5" />
                Authenticated
              </span>}
              <span className="inline-flex items-center gap-1.5 rounded-full bg-blue-100 text-blue-700 text-xs font-semibold px-3 py-1">
                <BadgeCheck className="w-3.5 h-3.5" />
                Premium
              </span>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3 w-full md:w-auto">
            <button className="flex-1 md:flex-initial px-4 py-2 rounded-lg border-2 border-gray-200 text-gray-700 font-medium text-sm transition-all hover:border-gray-300 hover:bg-gray-50">
              Edit Profile
            </button>
            <button
              onClick={handleLogout}
              className="flex-1 md:flex-initial px-4 py-2 rounded-lg bg-red-50 border border-red-200 text-red-600 font-medium text-sm transition-all hover:bg-red-100 flex items-center justify-center gap-2"
            >
              <LogOut className="w-4 h-4" />
              Logout
            </button>
          </div>
        </div>
      </div>

      {/* Account Info Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2.5 bg-blue-100 rounded-lg">
              <Mail className="w-5 h-5 text-blue-600" />
            </div>
            <h3 className="font-semibold text-gray-900">Email Address</h3>
          </div>
          <p className="text-gray-600 text-sm">{email}</p>
          <p className="text-xs text-gray-500 mt-3">Primary contact for notifications</p>
        </div>

        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2.5 bg-green-100 rounded-lg">
              <ShieldCheck className="w-5 h-5 text-green-600" />
            </div>
            <h3 className="font-semibold text-gray-900">Auth Status</h3>
          </div>
          <p className={`text-sm font-medium ${token ? "text-green-600" : "text-gray-600"}`}>
            {token ? "Fully Authenticated" : "Guest Access"}
          </p>
          <p className="text-xs text-gray-500 mt-3">Your session is secure</p>
        </div>

        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2.5 bg-purple-100 rounded-lg">
              <BadgeCheck className="w-5 h-5 text-purple-600" />
            </div>
            <h3 className="font-semibold text-gray-900">Current Plan</h3>
          </div>
          <p className="text-sm font-medium text-purple-600">Premium</p>
          <p className="text-xs text-gray-500 mt-3">All features unlocked</p>
        </div>
      </div>

      {/* Settings Sections */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Notifications */}
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2.5 bg-amber-100 rounded-lg">
              <Bell className="w-5 h-5 text-amber-600" />
            </div>
            <h3 className="text-lg font-bold text-gray-900">Notifications</h3>
          </div>
          <div className="space-y-4">
            <label className="flex items-center gap-3 cursor-pointer hover:bg-gray-50 p-3 rounded-lg transition-colors">
              <input type="checkbox" defaultChecked className="w-4 h-4 rounded border-gray-300" />
              <div>
                <p className="text-sm font-medium text-gray-900">Email Alerts</p>
                <p className="text-xs text-gray-500">Get notified of unusual activity</p>
              </div>
            </label>
            <label className="flex items-center gap-3 cursor-pointer hover:bg-gray-50 p-3 rounded-lg transition-colors">
              <input type="checkbox" defaultChecked className="w-4 h-4 rounded border-gray-300" />
              <div>
                <p className="text-sm font-medium text-gray-900">Weekly Reports</p>
                <p className="text-xs text-gray-500">Summary of your spending</p>
              </div>
            </label>
            <label className="flex items-center gap-3 cursor-pointer hover:bg-gray-50 p-3 rounded-lg transition-colors">
              <input type="checkbox" className="w-4 h-4 rounded border-gray-300" />
              <div>
                <p className="text-sm font-medium text-gray-900">Marketing emails</p>
                <p className="text-xs text-gray-500">Latest features and tips</p>
              </div>
            </label>
          </div>
        </div>

        {/* Security */}
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2.5 bg-red-100 rounded-lg">
              <Lock className="w-5 h-5 text-red-600" />
            </div>
            <h3 className="text-lg font-bold text-gray-900">Security</h3>
          </div>
          <div className="space-y-3">
            <button className="w-full px-4 py-3 rounded-lg border-2 border-gray-200 text-gray-700 font-medium text-sm transition-all hover:border-gray-300 hover:bg-gray-50 text-left flex items-center justify-between">
              <span>Change Password</span>
              <Settings className="w-4 h-4" />
            </button>
            <button className="w-full px-4 py-3 rounded-lg border-2 border-gray-200 text-gray-700 font-medium text-sm transition-all hover:border-gray-300 hover:bg-gray-50 text-left flex items-center justify-between">
              <span>Enable Two-Factor Auth</span>
              <Settings className="w-4 h-4" />
            </button>
            <button className="w-full px-4 py-3 rounded-lg border-2 border-gray-200 text-gray-700 font-medium text-sm transition-all hover:border-gray-300 hover:bg-gray-50 text-left flex items-center justify-between">
              <span>Active Sessions</span>
              <Settings className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Preferences */}
      <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
        <div className="flex items-center gap-3 mb-6">
          <div className="p-2.5 bg-indigo-100 rounded-lg">
            <Settings className="w-5 h-5 text-indigo-600" />
          </div>
          <h3 className="text-lg font-bold text-gray-900">Preferences</h3>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="text-sm font-medium text-gray-700 block mb-2">Currency</label>
            <select className="w-full px-4 py-2 rounded-lg border border-gray-200 bg-gray-50 text-sm outline-none transition-all focus:bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-100">
              <option>INR (₹)</option>
              <option>USD ($)</option>
              <option>EUR (€)</option>
            </select>
          </div>
          <div>
            <label className="text-sm font-medium text-gray-700 block mb-2">Theme</label>
            <select className="w-full px-4 py-2 rounded-lg border border-gray-200 bg-gray-50 text-sm outline-none transition-all focus:bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-100">
              <option>Light</option>
              <option>Dark</option>
              <option>Auto</option>
            </select>
          </div>
        </div>
      </div>

      {/* Danger Zone */}
      <div className="bg-red-50 rounded-2xl p-6 border-2 border-red-200">
        <h3 className="text-lg font-bold text-red-900 mb-4">Danger Zone</h3>
        <p className="text-sm text-red-700 mb-4">Irreversible and destructive actions</p>
        <button className="px-6 py-2 rounded-lg bg-red-600 text-white font-medium text-sm transition-all hover:bg-red-700">
          Delete Account
        </button>
      </div>
    </div>
  );
}
