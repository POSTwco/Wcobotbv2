import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import { Link } from "react-router";
import { useWallet } from "../components/wallet-context";
import { api } from "../lib/api";
import type { Athlete } from "../lib/types";

type OpenCard = {
  id: string;
  title: string;
  eventDate: string;
  status: string;
  athlete1Id: string;
  athlete2Id: string;
};

const labelStyle = { fontFamily: "Orbitron, sans-serif", fontSize: "0.65rem" } as const;
const bodyStyle = { fontFamily: "'DM Sans', sans-serif" } as const;

function Field({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <label className="block">
      <span className="block text-[#8494A7] mb-1" style={labelStyle}>{label}</span>
      {children}
    </label>
  );
}

const inputClass = "w-full rounded-lg bg-[#0B1120] border border-[#4274B9]/30 px-3 py-2 text-sm text-[#E8ECF0] outline-none focus:border-[#D4A843]";

export function StaffPage() {
  const { connected, walletSessionToken, openMagicEmailSignIn } = useWallet();
  const [staff, setStaff] = useState<boolean | null>(null);
  const [athletes, setAthletes] = useState<Athlete[]>([]);
  const [cards, setCards] = useState<OpenCard[]>([]);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const [name, setName] = useState("");
  const [date, setDate] = useState("");
  const [query, setQuery] = useState("");
  const [athlete1Id, setAthlete1Id] = useState("");
  const [athlete2Id, setAthlete2Id] = useState("");
  const [winners, setWinners] = useState<Record<string, string>>({});
  const [edits, setEdits] = useState<Record<string, { name: string; pfpUrl: string; instagram: string; twitter: string; youtube: string; website: string }>>({});

  const loadRoster = useCallback(async () => {
    const res = await api.getAthletes();
    if (res.success && res.data) setAthletes(res.data);
  }, []);

  const loadCards = useCallback(async (token: string) => {
    const res = await api.staff.cards(token);
    if (res.success && res.data) setCards(res.data);
  }, []);

  useEffect(() => {
    if (!connected || !walletSessionToken) {
      setStaff(false);
      return;
    }
    let cancel = false;
    api.staff.me(walletSessionToken).then((res) => {
      if (cancel) return;
      setStaff(!!(res.success && res.data?.staff));
    }).catch(() => {
      if (!cancel) setStaff(false);
    });
    return () => { cancel = true; };
  }, [connected, walletSessionToken]);

  useEffect(() => {
    if (!staff || !walletSessionToken) return;
    loadRoster();
    loadCards(walletSessionToken);
  }, [staff, walletSessionToken, loadRoster, loadCards]);

  const athleteName = useCallback((id: string) => {
    return athletes.find((a) => a.id === id)?.name || id;
  }, [athletes]);

  const matches = useMemo(() => {
    const q = query.trim().toLowerCase();
    const list = q ? athletes.filter((a) => a.name.toLowerCase().includes(q)) : athletes;
    return list.slice(0, 12);
  }, [athletes, query]);

  function editOf(athlete: Athlete) {
    return edits[athlete.id] || {
      name: athlete.name || "",
      pfpUrl: athlete.pfpUrl || "",
      instagram: athlete.socials?.instagram || "",
      twitter: athlete.socials?.twitter || "",
      youtube: athlete.socials?.youtube || "",
      website: athlete.socials?.website || "",
    };
  }

  async function openCard() {
    if (!walletSessionToken) return;
    setBusy(true);
    setError("");
    setNotice("");
    const res = await api.staff.openCard(walletSessionToken, { name, date, athlete1Id, athlete2Id });
    setBusy(false);
    if (!res.success) {
      setError(res.error || "Could not open the card.");
      return;
    }
    setName("");
    setDate("");
    setAthlete1Id("");
    setAthlete2Id("");
    setNotice("Card is open.");
    loadCards(walletSessionToken);
  }

  async function closeCard(card: OpenCard) {
    if (!walletSessionToken) return;
    const winnerId = winners[card.id];
    if (!winnerId) {
      setError("Pick the winner first.");
      return;
    }
    setBusy(true);
    setError("");
    setNotice("");
    const res = await api.staff.closeCard(walletSessionToken, card.id, winnerId);
    setBusy(false);
    if (!res.success) {
      setError(res.error || "Could not close the card.");
      return;
    }
    setNotice("Result saved. Points only.");
    loadCards(walletSessionToken);
    loadRoster();
  }

  async function saveAthlete(athlete: Athlete) {
    if (!walletSessionToken) return;
    const edit = editOf(athlete);
    setBusy(true);
    setError("");
    setNotice("");
    const res = await api.staff.saveAthlete(walletSessionToken, athlete.id, {
      name: edit.name,
      pfpUrl: edit.pfpUrl,
      socials: {
        instagram: edit.instagram,
        twitter: edit.twitter,
        youtube: edit.youtube,
        website: edit.website,
      },
    });
    setBusy(false);
    if (!res.success) {
      setError(res.error || "Could not save the athlete.");
      return;
    }
    setNotice("Athlete saved.");
    loadRoster();
  }

  if (connected && staff === null) {
    return (
      <div className="min-h-screen py-16 px-4 text-center text-[#8494A7]" style={bodyStyle}>
        Checking access
      </div>
    );
  }

  if (staff !== true) {
    return (
      <div className="min-h-screen py-16 px-4">
        <div className="max-w-lg mx-auto bg-[#111827] border border-[#4274B9]/20 rounded-2xl p-8 text-center">
          <h1 className="text-2xl text-white mb-3" style={{ fontFamily: "Orbitron, sans-serif" }}>Staff</h1>
          <p className="text-[#8494A7] mb-6" style={bodyStyle}>Not authorized</p>
          {!connected && (
            <button
              type="button"
              onClick={() => openMagicEmailSignIn("signin")}
              className="mb-4 px-4 py-2 rounded-lg bg-[#4274B9] text-white text-sm"
              style={bodyStyle}
            >
              Sign in
            </button>
          )}
          <div>
            <Link to="/" className="text-[#6AA3E0] text-sm" style={bodyStyle}>Back home</Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen py-10 px-4">
      <div className="max-w-3xl mx-auto space-y-8">
        <h1 className="text-3xl text-white" style={{ fontFamily: "Orbitron, sans-serif" }}>Staff</h1>
        <p className="text-[#8494A7] text-sm" style={bodyStyle}>
          One equal-weight call per person. Points only.
        </p>
        {error && <p className="text-red-400 text-sm" style={bodyStyle}>{error}</p>}
        {notice && <p className="text-[#D4A843] text-sm" style={bodyStyle}>{notice}</p>}

        <section className="bg-[#111827] border border-[#4274B9]/20 rounded-2xl p-5 space-y-4">
          <h2 className="text-white" style={{ fontFamily: "Orbitron, sans-serif" }}>Open a card</h2>
          <Field label="Event name">
            <input className={inputClass} value={name} onChange={(e) => setName(e.target.value)} style={bodyStyle} />
          </Field>
          <Field label="Date">
            <input className={inputClass} type="date" value={date} onChange={(e) => setDate(e.target.value)} style={bodyStyle} />
          </Field>
          <Field label="Find athletes">
            <input className={inputClass} value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search the roster" style={bodyStyle} />
          </Field>
          <div className="flex flex-wrap gap-2">
            {matches.map((athlete) => (
              <button
                key={athlete.id}
                type="button"
                onClick={() => {
                  if (!athlete1Id || athlete1Id === athlete.id) setAthlete1Id(athlete.id);
                  else setAthlete2Id(athlete.id);
                }}
                className="px-3 py-1.5 rounded-lg border border-[#4274B9]/30 text-[#E8ECF0] text-xs hover:border-[#D4A843]"
                style={bodyStyle}
              >
                {athlete.name}
              </button>
            ))}
          </div>
          <p className="text-sm text-[#8494A7]" style={bodyStyle}>
            {athleteName(athlete1Id) || "First athlete"} vs {athleteName(athlete2Id) || "Second athlete"}
          </p>
          <div className="flex gap-2">
            <button type="button" className="text-xs text-[#8494A7]" onClick={() => setAthlete1Id("")} style={bodyStyle}>Clear first</button>
            <button type="button" className="text-xs text-[#8494A7]" onClick={() => setAthlete2Id("")} style={bodyStyle}>Clear second</button>
          </div>
          <button
            type="button"
            disabled={busy}
            onClick={openCard}
            className="px-4 py-2 rounded-lg bg-[#4274B9] text-white text-sm disabled:opacity-50"
            style={{ fontFamily: "Orbitron, sans-serif" }}
          >
            Open
          </button>
        </section>

        <section className="bg-[#111827] border border-[#4274B9]/20 rounded-2xl p-5 space-y-4">
          <h2 className="text-white" style={{ fontFamily: "Orbitron, sans-serif" }}>Close a result</h2>
          {cards.length === 0 && <p className="text-sm text-[#8494A7]" style={bodyStyle}>No open cards.</p>}
          {cards.map((card) => (
            <div key={card.id} className="border border-[#4274B9]/15 rounded-xl p-3 space-y-2">
              <p className="text-[#E8ECF0] text-sm" style={bodyStyle}>{card.title}</p>
              <p className="text-[#8494A7] text-xs" style={bodyStyle}>{card.eventDate}</p>
              <div className="flex flex-wrap gap-2">
                {[card.athlete1Id, card.athlete2Id].map((id) => (
                  <button
                    key={id}
                    type="button"
                    onClick={() => setWinners((prev) => ({ ...prev, [card.id]: id }))}
                    className={`px-3 py-1.5 rounded-lg text-xs border ${winners[card.id] === id ? "border-[#D4A843] text-[#F0D078]" : "border-[#4274B9]/30 text-[#E8ECF0]"}`}
                    style={bodyStyle}
                  >
                    {athleteName(id)}
                  </button>
                ))}
              </div>
              <button
                type="button"
                disabled={busy}
                onClick={() => closeCard(card)}
                className="px-4 py-2 rounded-lg bg-[#D4A843] text-[#1a1208] text-sm disabled:opacity-50"
                style={{ fontFamily: "Orbitron, sans-serif" }}
              >
                Close
              </button>
            </div>
          ))}
        </section>

        <section className="bg-[#111827] border border-[#4274B9]/20 rounded-2xl p-5 space-y-4">
          <h2 className="text-white" style={{ fontFamily: "Orbitron, sans-serif" }}>Athletes</h2>
          {athletes.map((athlete) => {
            const edit = editOf(athlete);
            const set = (patch: Partial<typeof edit>) => {
              setEdits((prev) => ({ ...prev, [athlete.id]: { ...edit, ...patch } }));
            };
            return (
              <div key={athlete.id} className="border border-[#4274B9]/15 rounded-xl p-3 space-y-2">
                <Field label="Name">
                  <input className={inputClass} value={edit.name} onChange={(e) => set({ name: e.target.value })} style={bodyStyle} />
                </Field>
                <Field label="Photo URL">
                  <input className={inputClass} value={edit.pfpUrl} onChange={(e) => set({ pfpUrl: e.target.value })} style={bodyStyle} />
                </Field>
                <Field label="Instagram">
                  <input className={inputClass} value={edit.instagram} onChange={(e) => set({ instagram: e.target.value })} style={bodyStyle} />
                </Field>
                <Field label="YouTube">
                  <input className={inputClass} value={edit.youtube} onChange={(e) => set({ youtube: e.target.value })} style={bodyStyle} />
                </Field>
                <Field label="Website">
                  <input className={inputClass} value={edit.website} onChange={(e) => set({ website: e.target.value })} style={bodyStyle} />
                </Field>
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => saveAthlete(athlete)}
                  className="px-4 py-2 rounded-lg bg-[#4274B9] text-white text-sm disabled:opacity-50"
                  style={{ fontFamily: "Orbitron, sans-serif" }}
                >
                  Save
                </button>
              </div>
            );
          })}
        </section>
      </div>
    </div>
  );
}
