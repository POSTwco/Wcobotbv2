/**
 * Organization sign-in and registration.
 * The Hedera wallet is the account. Email is a contact field.
 * Field order passed to applyCanonical is unchanged.
 */

import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import { Link } from "react-router";
import { Building2, CheckCircle, Loader2 } from "lucide-react";
import { useWallet } from "../components/wallet-context";
import { api } from "../lib/api";
import { COUNTRY_OPTIONS } from "../lib/country-flags";
import { InlineFlag } from "../components/country-flag";
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

const inputCls = "mt-1 w-full rounded-xl bg-[#0B1120] border border-[#4274B9]/25 px-3 py-2.5 text-sm text-[#E8ECF0] outline-none focus:border-[#6AA3E0]/60";

export function OrgAccountPage() {
  const { connected, connect, accountId, isConnecting, signMessage, walletSessionToken } = useWallet();
  const [form, setForm] = useState(empty);
  const [loading, setLoading] = useState(false);
  const [bundle, setBundle] = useState<any>(null);
  const [submitting, setSubmitting] = useState(false);
  const [logoName, setLogoName] = useState("");
  const [logoPreview, setLogoPreview] = useState("");
  const [extraOrganizers, setExtraOrganizers] = useState(0);

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

  const emailOk = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim());
  const hasChannel = !!(form.instagram.trim() || form.youtube.trim());
  const hasOrganizer = form.organizers.some((name) => name.trim());
  const checks = useMemo(() => ([
    { ok: form.name.trim().length >= 2, label: "Organization name" },
    { ok: !!form.country, label: "Country of operation" },
    { ok: emailOk, label: "Contact email" },
    { ok: hasOrganizer, label: "At least one organizer" },
    { ok: hasChannel, label: "Instagram or YouTube" },
  ]), [form.name, form.country, emailOk, hasOrganizer, hasChannel]);
  const ready = checks.every((item) => item.ok);

  async function onLogo(file: File | undefined) {
    if (!file || !accountId || !walletSessionToken) return;
    if (file.size > 5 * 1024 * 1024) {
      toast.error("Logo must be 5 MB or smaller");
      return;
    }
    if (!["image/png", "image/jpeg", "image/webp"].includes(file.type)) {
      toast.error("Use a PNG, JPEG, or WEBP logo");
      return;
    }
    const res = await api.uploadOrganizationLogo(file, accountId, walletSessionToken);
    if (!res.success || !res.data) {
      toast.error(res.error || "Logo upload failed");
      return;
    }
    setForm((f) => ({ ...f, logoPath: res.data!.path }));
    setLogoName(file.name);
    setLogoPreview(URL.createObjectURL(file));
    toast.success("Logo ready");
  }

  async function submit() {
    if (!accountId || !walletSessionToken) {
      toast.error("Connect your wallet first");
      return;
    }
    if (!ready) return;
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
      <Gate
        title="Organization sign in"
        body="This wallet becomes the organization account. WCO reviews the application, then the dashboard opens so you can draft competitions."
        steps={["Connect wallet", "Registration", "WCO review"]}
        active={0}
      >
        <button
          type="button"
          onClick={() => connect()}
          disabled={isConnecting}
          className="px-5 py-3 rounded-xl bg-[#4274B9] text-white text-sm font-semibold disabled:opacity-50"
          style={{ fontFamily: "Orbitron, sans-serif" }}
        >
          {isConnecting ? "Connecting…" : "Connect Wallet"}
        </button>
      </Gate>
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
        title="You are on the Events page"
        body={`${org.name} is approved. Open the dashboard to draft a competition. WCO still signs off before fans can see it.`}
        steps={["Submitted", "Reviewed", "On Events"]}
        active={3}
        action={<Link to="/events/dashboard" className="inline-flex px-4 py-2 rounded-xl bg-[#4274B9] text-white text-sm">Open dashboard</Link>}
      />
    );
  }

  if (application?.status === "pending") {
    return (
      <StatusCard
        title="Awaiting WCO review"
        body={`${application.name} is saved. It stays off the public Events page until a commander approves it. You will get a report in the notification bell.`}
        steps={["Submitted", "In review", "On Events"]}
        active={1}
      />
    );
  }

  const visibleOrganizers = 1 + extraOrganizers;

  return (
    <div className="min-h-screen py-8 px-4">
      <div className="max-w-xl mx-auto">
        <StepRail steps={["Connect wallet", "Registration", "WCO review"]} active={1} />
        <h1 className="text-2xl text-[#E8ECF0] mt-4" style={{ fontFamily: "Orbitron, sans-serif" }}>Organization registration</h1>
        <p className="text-sm text-[#8494A7] mt-2 mb-6">
          Wallet {accountId}. Submitting asks the wallet to confirm these answers. It does not send HBAR.
        </p>
        {application?.status === "rejected" && (
          <div className="mb-4 rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-sm text-[#E8ECF0] whitespace-pre-wrap">
            <p className="font-semibold mb-1">Previous application was not accepted</p>
            {application.decisionNote || "You can submit a new application."}
          </div>
        )}

        <div className="space-y-6">
          <Section title="Organization" hint="This is the public card fans see after approval.">
            <Field label="Organization name" hint="The name on the Events page." value={form.name} onChange={(v) => setForm({ ...form, name: v })} />
            <label className="block text-xs text-[#8494A7]">
              Country of operation
              <span className="mt-1 flex items-center gap-2">
                {form.country ? <InlineFlag country={form.country} /> : null}
                <select value={form.country} onChange={(e) => setForm({ ...form, country: e.target.value })} className={inputCls}>
                  <option value="">Select country</option>
                  {COUNTRY_OPTIONS.map((name) => <option key={name} value={name}>{name}</option>)}
                </select>
              </span>
            </label>
            <label className="block text-xs text-[#8494A7]">
              What you run
              <select value={form.discipline} onChange={(e) => setForm({ ...form, discipline: e.target.value })} className={inputCls}>
                {ORG_DISCIPLINES.map((id) => <option key={id} value={id}>{orgDisciplineLabel(id)}</option>)}
              </select>
              <Hint>FreeStyle is movement, Statics is holds, Both covers both.</Hint>
            </label>
            <label className="block text-xs text-[#8494A7]">
              About the organization
              <textarea value={form.bio} onChange={(e) => setForm({ ...form, bio: e.target.value })} rows={4} className={inputCls} placeholder="Who you are and the events you host." />
              <Hint>Optional. Shown on your public card.</Hint>
            </label>
            <div>
              <p className="text-xs text-[#8494A7]">Logo</p>
              <label className="mt-1 flex items-center gap-3 cursor-pointer">
                <input type="file" accept="image/png,image/jpeg,image/webp" className="hidden" onChange={(e) => onLogo(e.target.files?.[0])} />
                <span className="px-3 py-2 rounded-xl border border-dashed border-[#4274B9]/40 text-xs text-[#C5D0DC]">
                  {logoName ? "Replace logo" : "Choose PNG, JPEG, or WEBP under 5 MB"}
                </span>
                {logoPreview ? <img src={logoPreview} alt="" className="w-12 h-12 rounded-xl object-cover border border-[#4274B9]/30" /> : <Building2 className="w-8 h-8 text-[#4274B9]/50" />}
              </label>
              <Hint>Optional. Fans see it on your card after approval.</Hint>
            </div>
          </Section>

          <Section title="Contact" hint="Email stays with WCO. Socials can appear on the public card.">
            <Field label="Main email" hint="Required. WCO only — not shown on the Events page." value={form.email} onChange={(v) => setForm({ ...form, email: v })} type="email" />
            <Field label="Organization Instagram" hint="Instagram or YouTube is required. A handle or https link both work." value={form.instagram} onChange={(v) => setForm({ ...form, instagram: v })} />
            <Field label="Organization YouTube" hint="Use this if you do not have Instagram." value={form.youtube} onChange={(v) => setForm({ ...form, youtube: v })} />
            <Field label="Website" hint="Optional. Must start with https." value={form.website} onChange={(v) => setForm({ ...form, website: v })} />
          </Section>

          <Section title="People" hint="Organizer names help WCO verify the account. Personal Instagram stays private.">
            {form.organizers.slice(0, visibleOrganizers).map((name, i) => (
              <div key={`person-${i}`} className="space-y-3">
                <Field
                  label={i === 0 ? "Organizer name" : `Organizer ${i + 1}`}
                  hint={i === 0 ? "Required. The person WCO should know." : "Optional."}
                  value={name}
                  onChange={(v) => {
                    const organizers = [...form.organizers];
                    organizers[i] = v;
                    setForm({ ...form, organizers });
                  }}
                />
                <Field
                  label={`Organizer ${i + 1} personal Instagram`}
                  hint="Private. Not published on the Events page."
                  value={form.personalInstagrams[i]}
                  onChange={(v) => {
                    const personalInstagrams = [...form.personalInstagrams];
                    personalInstagrams[i] = v;
                    setForm({ ...form, personalInstagrams });
                  }}
                />
              </div>
            ))}
            {extraOrganizers < 3 && (
              <button type="button" onClick={() => setExtraOrganizers((n) => n + 1)} className="text-xs text-[#6AA3E0]">
                Add another organizer
              </button>
            )}
          </Section>

          <Section title="First event" hint="Optional. Leave this blank and add the event from the dashboard after approval.">
            <Field label="Event name" hint="Only if the date is already set." value={form.eventName} onChange={(v) => setForm({ ...form, eventName: v })} />
            <Field label="Event date" hint="You can return later if the date is not confirmed." value={form.eventDate} onChange={(v) => setForm({ ...form, eventDate: v })} type="datetime-local" />
          </Section>

          <div className="rounded-2xl border border-[#4274B9]/25 bg-[#111827] p-4">
            <p className="text-xs text-[#6AA3E0] mb-2" style={{ fontFamily: "Orbitron, sans-serif" }}>BEFORE YOU SIGN</p>
            <ul className="space-y-1 mb-4">
              {checks.map((item) => (
                <li key={item.label} className={`text-xs ${item.ok ? "text-[#10b981]" : "text-[#8494A7]"}`}>
                  {item.ok ? "Ready" : "Still needed"} · {item.label}
                </li>
              ))}
            </ul>
            <p className="text-xs text-[#8494A7] mb-3">The wallet signature confirms these answers. It does not send HBAR or mint a token.</p>
            <button
              type="button"
              onClick={submit}
              disabled={!ready || submitting}
              className="w-full py-3 rounded-xl bg-[#4274B9] text-white font-semibold disabled:opacity-40"
              style={{ fontFamily: "Orbitron, sans-serif" }}
            >
              {submitting ? "Waiting for wallet…" : "Sign and submit"}
            </button>
            <Link to="/events" className="block text-center text-xs text-[#8494A7] mt-3">Back to Events</Link>
          </div>
        </div>
      </div>
    </div>
  );
}

function Gate({ title, body, steps, active, children }: { title: string; body: string; steps: string[]; active: number; children: ReactNode }) {
  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-10">
      <div className="max-w-md w-full text-center">
        <StepRail steps={steps} active={active} />
        <h1 className="text-2xl text-[#E8ECF0] mt-5 mb-3" style={{ fontFamily: "Orbitron, sans-serif" }}>{title}</h1>
        <p className="text-sm text-[#8494A7] mb-6">{body}</p>
        {children}
      </div>
    </div>
  );
}

function StatusCard({
  title, body, steps, active, action,
}: {
  title: string;
  body: string;
  steps: string[];
  active: number;
  action?: ReactNode;
}) {
  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-10">
      <div className="max-w-md w-full rounded-2xl border border-[#4274B9]/30 bg-[#111827] p-6">
        <StepRail steps={steps} active={active} />
        <h1 className="text-xl text-[#E8ECF0] mt-4 mb-2" style={{ fontFamily: "Orbitron, sans-serif" }}>{title}</h1>
        <p className="text-sm text-[#C5D0DC] mb-4">{body}</p>
        {action}
        <div className="mt-4">
          <Link to="/events" className="text-xs text-[#8494A7]">Back to Events</Link>
        </div>
      </div>
    </div>
  );
}

function StepRail({ steps, active }: { steps: string[]; active: number }) {
  return (
    <ol className="grid grid-cols-3 gap-2 text-left">
      {steps.map((step, i) => {
        const done = i < active;
        const current = i === active;
        return (
          <li key={step} className={`rounded-lg border px-2 py-2 ${done || current ? "border-[#6AA3E0]/50 bg-[#4274B9]/10" : "border-[#4274B9]/15"}`}>
            <span className="block text-[0.6rem] text-[#6AA3E0]" style={{ fontFamily: "Orbitron, sans-serif" }}>{i + 1}</span>
            <span className={`block text-[0.65rem] leading-tight ${done ? "text-[#10b981]" : "text-[#E8ECF0]"}`}>{step}</span>
            {done && <CheckCircle className="w-3 h-3 text-[#10b981] mt-1" aria-hidden />}
          </li>
        );
      })}
    </ol>
  );
}

function Section({ title, hint, children }: { title: string; hint: string; children: ReactNode }) {
  return (
    <section className="rounded-2xl border border-[#4274B9]/25 bg-[#111827] p-4 space-y-3">
      <div>
        <h2 className="text-xs text-[#6AA3E0]" style={{ fontFamily: "Orbitron, sans-serif" }}>{title}</h2>
        <p className="text-xs text-[#8494A7] mt-1">{hint}</p>
      </div>
      {children}
    </section>
  );
}

function Hint({ children }: { children: ReactNode }) {
  return <span className="block mt-1 text-[0.65rem] text-[#8494A7]/80">{children}</span>;
}

function Field({
  label, hint, value, onChange, type = "text",
}: {
  label: string;
  hint?: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
}) {
  return (
    <label className="block text-xs text-[#8494A7]">
      {label}
      <input type={type} value={value} onChange={(e) => onChange(e.target.value)} className={inputCls} />
      {hint ? <Hint>{hint}</Hint> : null}
    </label>
  );
}
