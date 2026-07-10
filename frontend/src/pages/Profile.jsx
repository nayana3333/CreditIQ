import { Bell, KeyRound, LogOut, Mail, ShieldCheck, UserRound } from "lucide-react";

function DetailRow({ label, value }) {
  return (
    <div className="flex items-center justify-between border-b border-[#F7F5F0] py-3 text-sm last:border-0">
      <span className="text-[#737373]">{label}</span>
      <span className="font-medium text-[#111111]">{value}</span>
    </div>
  );
}

function SettingRow({ title, description, action }) {
  return (
    <div className="flex items-center justify-between gap-4 rounded-lg border border-[#E5E5E5] bg-white p-4">
      <div>
        <p className="text-sm font-medium text-[#111111]">{title}</p>
        <p className="mt-1 text-xs leading-5 text-[#737373]">{description}</p>
      </div>
      {action}
    </div>
  );
}

export default function Profile() {
  const storedUser = (() => {
    try {
      return JSON.parse(localStorage.getItem("user") || "{}");
    } catch {
      return {};
    }
  })();
  const email = storedUser.email || localStorage.getItem("user_email") || "Not logged in";
  const name = storedUser.name || email.split("@")[0] || "User";
  const token = localStorage.getItem("token");
  const initials = name.slice(0, 2).toUpperCase();

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    localStorage.removeItem("user_email");
    window.dispatchEvent(new Event("auth-changed"));
    window.location.href = "/login";
  };

  return (
    <div className="space-y-6">
      <div className="border-b border-[#E5E5E5] pb-5">
        <h1 className="ci-page-title">Profile</h1>
        <p className="mt-1 text-[13px] text-[#737373]">Account identity, security status, and workspace preferences.</p>
      </div>

      <section className="ci-panel p-6">
        <div className="flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-4">
            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-lg border border-[#E5E5E5] bg-[#FFFCF7] text-lg font-semibold text-[#111111]">
              {initials}
            </div>
            <div>
              <p className="text-lg font-semibold text-[#111111]">{name}</p>
              <p className="mt-1 text-sm text-[#737373]">{email}</p>
              <div className="mt-3 inline-flex items-center gap-2 rounded-full border border-[#D4D4D4] bg-white px-3 py-1 text-xs font-medium text-[#404040]">
                <ShieldCheck className="h-3.5 w-3.5" />
                {token ? "Signed in" : "Not signed in"}
              </div>
            </div>
          </div>

          <div className="flex gap-3">
            <button className="ci-button-secondary">Edit profile</button>
            <button onClick={handleLogout} className="ci-button">
              <LogOut className="h-4 w-4" />
              Sign out
            </button>
          </div>
        </div>
      </section>

      <div className="grid gap-6 lg:grid-cols-3">
        <section className="ci-panel lg:col-span-2">
          <div className="mb-4 flex items-center gap-2">
            <UserRound className="h-4 w-4 text-[#737373]" />
            <h2 className="text-sm font-semibold text-[#111111]">Account details</h2>
          </div>
          <DetailRow label="Display name" value={name} />
          <DetailRow label="Email address" value={email} />
          <DetailRow label="Role" value="Credit risk analyst" />
          <DetailRow label="Workspace" value="CreditIQ Demo" />
          <DetailRow label="Authentication" value={token ? "Active session" : "Guest"} />
        </section>

        <section className="ci-panel">
          <div className="mb-4 flex items-center gap-2">
            <Mail className="h-4 w-4 text-[#737373]" />
            <h2 className="text-sm font-semibold text-[#111111]">Contact</h2>
          </div>
          <p className="text-sm text-[#111111]">{email}</p>
          <p className="mt-2 text-xs leading-5 text-[#737373]">Used for login, account recovery, and decision-report notifications.</p>
          <button className="ci-button-secondary mt-5 w-full">Update email</button>
        </section>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="ci-panel">
          <div className="mb-4 flex items-center gap-2">
            <KeyRound className="h-4 w-4 text-[#737373]" />
            <h2 className="text-sm font-semibold text-[#111111]">Security</h2>
          </div>
          <div className="space-y-3">
            <SettingRow title="Password" description="Change your password regularly for a safer account." action={<button className="ci-button-secondary">Change</button>} />
            <SettingRow title="Two-factor authentication" description="Add an extra verification step before sign in." action={<button className="ci-button-secondary">Set up</button>} />
            <SettingRow title="Active sessions" description="Review devices currently signed into this workspace." action={<button className="ci-button-secondary">Review</button>} />
          </div>
        </section>

        <section className="ci-panel">
          <div className="mb-4 flex items-center gap-2">
            <Bell className="h-4 w-4 text-[#737373]" />
            <h2 className="text-sm font-semibold text-[#111111]">Notifications</h2>
          </div>
          <div className="space-y-3">
            {["Decision updates", "Weekly model summary", "Batch prediction results"].map((item, index) => (
              <label key={item} className="flex cursor-pointer items-start gap-3 rounded-lg border border-[#E5E5E5] bg-white p-4 hover:bg-[#FFFCF7]">
                <input type="checkbox" defaultChecked={index < 2} className="mt-0.5 h-4 w-4 rounded border-[#D4D4D4]" />
                <span>
                  <span className="block text-sm font-medium text-[#111111]">{item}</span>
                  <span className="mt-1 block text-xs leading-5 text-[#737373]">Receive concise email notifications for this event.</span>
                </span>
              </label>
            ))}
          </div>
        </section>
      </div>

      <section className="ci-panel">
        <h2 className="text-sm font-semibold text-[#111111]">Preferences</h2>
        <div className="mt-4 grid gap-4 md:grid-cols-3">
          <label className="block text-sm font-medium text-[#404040]">
            Currency
            <select className="ci-input mt-2">
              <option>INR</option>
              <option>USD</option>
              <option>EUR</option>
            </select>
          </label>
          <label className="block text-sm font-medium text-[#404040]">
            Theme
            <select className="ci-input mt-2">
              <option>Light</option>
              <option>System</option>
            </select>
          </label>
          <label className="block text-sm font-medium text-[#404040]">
            Default landing page
            <select className="ci-input mt-2">
              <option>Dashboard</option>
              <option>Applications</option>
              <option>Analytics</option>
            </select>
          </label>
        </div>
      </section>
    </div>
  );
}


