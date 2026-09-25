/**
 * Organization sign-in and registration.
 * The Hedera wallet is the account. Email is a contact field.
 */

import { useCallback, useEffect, useState, type ReactNode } from "react";
import { Link } from "react-router";
import { Loader2 } from "lucide-react";
import { useWallet } from "../components/wallet-context";
import { api } from "../lib/api";
import { COUNTRY_OPTIONS } from "../lib/country-flags";
import {
  ORG_DISCIPLINES,
  applyCanonical,
  orgDisciplineLabel,
  signCanonical,
  type OrgApplyFields,
} from "../lib/org-sign";
import { toast } from "sonner";

const empty = {
  name: "",
  country: "",
  email: "",
  discipline: "freestyle",
  logoPath: "",
  instagram: "",
  youtube: "",
  website: "",
  bio: "",
  organizers: ["", "", "", ""],
  personalInstagrams: ["", "", "", ""],
  eventName: "",
  eventDate: "",
};

export function OrgAccountPage() {
  const { connected, connect, accountId, isConnecting, signMessage, walletSessionToken } = useWallet();
  const [form, setForm] = useState(empty);
  const [loading, setLoading] = useState(false);
  const [bundle, setBundle] = useState<any>(null);
  const [submitting, setSubmitting] = useState(false);
  const [logoName, setLogoName] = useState("");

  const load = useCallback(async () => {
    if (!accountId || !walletSessionToken) {
      setBundle(null);
      return;
    }
    setLoading(true);
    const res = await api.getOrganizationAccount(accountId, walletSessionToken);
    setLoading(false);
    if (res.success) setBundle(res.data);
    else setBundle(null);
  }, [accountId, walletSessionToken]);

  useEffect(() => {
    load();
  }, [load]);

  async function onLogo(file: File | undefined) {
    if (!file || !accountId || !walletSessionToken) return;
    const res = await api.uploadOrganizationLogo(file, accountId, walletSessionToken);
    if (!res.success || !res.data) {
      toast.error(res.error || "Logo upload failed");
      return;
    }
    setForm((f) => ({ ...f, logoPath: res.data!.path }));
    setLogoName(file.name);
    toast.success("Logo ready");
  }

  async function submit() {
    if (!accountId || !walletSessionToken) {
      toast.error("Connect your wallet first");
      return;
    }
    const fields: OrgApplyFields = form;
    const canonical = applyCanonical(fields);
    setSubmitting(true);
    try {
      const signed = await signCanonical(signMessage, "WCO-ORG-APPLY-v1", accountId, canonical);
      if (!signed) {
        toast.error("Wallet signature is required");
        return;
      }
      const res = await api.submitOrganization(
        { wallet: accountId, ...form, ...signed },
        walletSessionToken,
      );
      if (!res.success) {
        toast.error(res.error || "Could not submit");
        return;
      }
      toast.success("Application sent to WCO");
      await load();
    } finally {
      setSubmitting(false);
    }
  }

  if (!connected) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <div className="max-w-md text-center">
          <h1 className="text-2xl text-[#E8ECF0] mb-3" style={{ fontFamily: "Orbitron, sans-serif" }}>ORGANIZATION SIGN IN</h1>
          <p className="text-sm text-[#8494A7] mb-6">Connect the Hedera wallet that will own this organization.</p>
          <button
            type="button"
            onClick={() => connect()}
            disabled={isConnecting}
            className="px-5 py-2.5 rounded-xl bg-[#4274B9] text-white text-sm font-semibold disabled:opacity-50"
            style={{ fontFamily: "Orbitron, sans-serif" }}
          >
            {isConnecting ? "Connecting…" : "Connect Wallet"}
          </button>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-6 h-6 text-[#6AA3E0] animate-spin" />
      </div>
    );
  }

  const org = bundle?.org;
  const application = bundle?.application;

  if (org?.status === "approved") {
    return (
      <StatusCard
        title="Organization approved"
        body={`${org.name} is on the Events page. Open the dashboard to draft competitions.`}
        action={<Link to="/events/dashboard" className="text-[#6AA3E0] text-sm">Open dashboard</Link>}
      />
    );
  }

  if (application?.status === "pending") {
    return (
      <StatusCard
        title="Awaiting WCO review"
        body={`${application.name} is saved. It stays off the public Events page until a commander approves it.`}
      />
    );
  }

  return (
    <div className="min-h-screen py-8 px-4">
      <div className="max-w-xl mx-auto">
        <h1 className="text-2xl text-[#E8ECF0] mb-1" style={{ fontFamily: "Orbitron, sans-serif" }}>ORGANIZATION SIGN UP</h1>
        <p className="text-sm text-[#8494A7] mb-4">Wallet {accountId}. Submitting asks your wallet to sign the application.</p>
        {application?.status === "rejected" && (
          <div className="mb-4 rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-sm text-[#E8ECF0] whitespace-pre-wrap">
            <p className="font-semibold mb-1">Previous application was not accepted</p>
            {application.decisionNote || "You can submit a new application."}
          </div>
        )}
        <div className="space-y-3">
          <Field label="Organization name" value={form.name} onChange={(v) => setForm({ ...form, name: v })} />
          <label className="block text-xs text-[#8494A7]">
            Country of operation
            <select
              value={form.country}
              onChange={(e) => setForm({ ...form, country: e.target.value })}
              className="mt-1 w-full rounded-xl bg-[#111827] border border-[#4274B9]/25 px-3 py-2 text-sm text-[#E8ECF0]"
            >
              <option value="">Select</option>
              {COUNTRY_OPTIONS.map((name) => (
                <option key={name} value={name}>{name}</option>
              ))}
            </select>
          </label>
          <Field label="Main email" value={form.email} onChange={(v) => setForm({ ...form, email: v })} type="email" />
          <label className="block text-xs text-[#8494A7]">
            Type of event
            <select
              value={form.discipline}
              onChange={(e) => setForm({ ...form, discipline: e.target.value })}
              className="mt-1 w-full rounded-xl bg-[#111827] border border-[#4274B9]/25 px-3 py-2 text-sm text-[#E8ECF0]"
            >
              {ORG_DISCIPLINES.map((id) => (
                <option key={id} value={id}>{orgDisciplineLabel(id)}</option>
              ))}
            </select>
          </label>
          <label className="block text-xs text-[#8494A7]">
            Logo
            <input type="file" accept="image/png,image/jpeg,image/webp" className="mt-1 block text-sm text-[#E8ECF0]" onChange={(e) => onLogo(e.target.files?.[0])} />
            {logoName && <span className="text-[#6AA3E0]">{logoName}</span>}
          </label>
          <Field label="Organization Instagram" value={form.instagram} onChange={(v) => setForm({ ...form, instagram: v })} />
          <Field label="Organization YouTube" value={form.youtube} onChange={(v) => setForm({ ...form, youtube: v })} />
          <Field label="Website (https)" value={form.website} onChange={(v) => setForm({ ...form, website: v })} />
          <label className="block text-xs text-[#8494A7]">
            About the organization
            <textarea value={form.bio} onChange={(e) => setForm({ ...form, bio: e.target.value })} rows={4} className="mt-1 w-full rounded-xl bg-[#111827] border border-[#4274B9]/25 px-3 py-2 text-sm text-[#E8ECF0]" />
          </label>
          {form.organizers.map((name, i) => (
            <Field
              key={`org-${i}`}
              label={i === 0 ? "Organizer name" : `Organizer ${i + 1} (optional)`}
              value={name}
              onChange={(v) => {
                const organizers = [...form.organizers];
                organizers[i] = v;
                setForm({ ...form, organizers });
              }}
            />
          ))}
          {form.personalInstagrams.map((name, i) => (
            <Field
              key={`ig-${i}`}
              label={`Organizer ${i + 1} personal Instagram (private)`}
              value={name}
              onChange={(v) => {
                const personalInstagrams = [...form.personalInstagrams];
                personalInstagrams[i] = v;
                setForm({ ...form, personalInstagrams });
              }}
            />
          ))}
          <Field label="First event name (optional)" value={form.eventName} onChange={(v) => setForm({ ...form, eventName: v })} />
          <Field label="Event date (optional)" value={form.eventDate} onChange={(v) => setForm({ ...form, eventDate: v })} type="datetime-local" />
          <button
            type="button"
            onClick={submit}
            disabled={submitting}
            className="w-full py-3 rounded-xl bg-[#4274B9] text-white font-semibold disabled:opacity-50"
            style={{ fontFamily: "Orbitron, sans-serif" }}
          >
            {submitting ? "Waiting for wallet…" : "Sign and submit"}
          </button>
          <Link to="/events" className="block text-center text-xs text-[#8494A7]">Back to Events</Link>
        </div>
      </div>
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  type = "text",
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
}) {
  return (
    <label className="block text-xs text-[#8494A7]">
      {label}
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="mt-1 w-full rounded-xl bg-[#111827] border border-[#4274B9]/25 px-3 py-2 text-sm text-[#E8ECF0]"
      />
    </label>
  );
}

function StatusCard({ title, body, action }: { title: string; body: string; action?: ReactNode }) {
  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="max-w-md rounded-2xl border border-[#4274B9]/30 bg-[#111827] p-6">
        <h1 className="text-xl text-[#E8ECF0] mb-2" style={{ fontFamily: "Orbitron, sans-serif" }}>{title}</h1>
        <p className="text-sm text-[#C5D0DC] mb-4">{body}</p>
        {action}
        <div className="mt-4">
          <Link to="/events" className="text-xs text-[#8494A7]">Back to Events</Link>
        </div>
      </div>
    </div>
  );
}
