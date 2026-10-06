/**
 * Quiet WCO contact page. Linked from the footer Technology column only.
 * Details match the published World Calisthenics Organization channels.
 */

import { Mail } from "lucide-react";
import { SocialLinks } from "../components/social-links";

const LEADERS = [
  {
    name: "Brendan Cosso",
    title: "Chief Executive Officer",
    bio: "Founder and Chief Executive Officer of the World Calisthenics Organization and Battle of the Bars.",
  },
  {
    name: "Kyle",
    title: "Technical Architect",
    bio: "Technical Architect for the platform, wallets, and competition systems.",
  },
];

export function ContactPage() {
  return (
    <div className="min-h-screen py-8 sm:py-12">
      <div className="max-w-3xl mx-auto px-4 sm:px-6">
        <p className="text-[0.65rem] tracking-[0.18em] text-[#6AA3E0] mb-2" style={{ fontFamily: "Orbitron, sans-serif" }}>
          WORLD CALISTHENICS ORGANIZATION
        </p>
        <h1 className="text-2xl sm:text-3xl text-[#E8ECF0] mb-3" style={{ fontFamily: "Orbitron, sans-serif" }}>
          CONTACT
        </h1>
        <p className="text-sm text-[#8494A7] leading-relaxed mb-8">
          Write the organization directly. Athlete and judge applications stay on their own forms. This page is for everything else.
        </p>

        <a
          href="mailto:info@worldcalisthenics.org"
          className="flex items-center gap-3 rounded-2xl border border-[#4274B9]/30 bg-[#111827] px-4 py-4 hover:border-[#6AA3E0]/60 transition-colors"
        >
          <Mail className="w-5 h-5 text-[#6AA3E0] shrink-0" />
          <span>
            <span className="block text-sm text-[#E8ECF0] font-semibold">info@worldcalisthenics.org</span>
            <span className="block text-xs text-[#8494A7] mt-0.5">Opens your email app</span>
          </span>
        </a>

        <div className="mt-4">
          <a
            href="https://worldcalisthenics.org"
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm text-[#6AA3E0] hover:underline"
          >
            worldcalisthenics.org
          </a>
        </div>

        <div className="mt-6">
          <SocialLinks />
        </div>

        <div className="mt-8 grid grid-cols-1 sm:grid-cols-2 gap-3">
          {LEADERS.map((person) => (
            <article key={person.title} className="rounded-2xl border border-[#4274B9]/25 bg-[#111827] p-4">
              <h2 className="text-[#E8ECF0] font-bold" style={{ fontFamily: "Orbitron, sans-serif" }}>{person.name}</h2>
              <p className="text-xs text-[#6AA3E0] mt-1">{person.title}</p>
              <p className="text-sm text-[#C5D0DC] mt-3 leading-relaxed">{person.bio}</p>
            </article>
          ))}
        </div>
      </div>
    </div>
  );
}
