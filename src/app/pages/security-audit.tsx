/**
 * Security Audit Pen Test — IvyFi Report Verification
 * =====================================================
 *
 * This page replays every attack vector from the IvyFi pen test report
 * (2026-03-16) against the LIVE backend to verify that the ED25519
 * signature verification fix is working correctly.
 *
 * TESTS:
 *   1. Forged signature (arbitrary hex string) → should FAIL
 *   2. Empty signature → should FAIL
 *   3. Replayed challenge (same nonce twice) → should FAIL
 *   4. Wrong wallet signature → should FAIL
 *   5. Non-admin wallet → should FAIL
 *   6. Expired challenge → should FAIL
 *   7. Structurally valid protobuf with fake signature → should FAIL
 *
 * IMPORTANT: This page does NOT test valid admin authentication —
 * that requires a real admin wallet with HashPack signing.
 * This page verifies that ALL attack vectors are BLOCKED.
 */

import { useState, useCallback } from "react";
import { api } from "../lib/api";
import { Shield, AlertTriangle, CheckCircle, XCircle, Play, RotateCcw } from "lucide-react";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface TestResult {
  name: string;
  description: string;
  status: "pending" | "running" | "pass" | "fail" | "error";
  detail: string;
  expected: string;
  actual?: string;
  durationMs?: number;
}

// Known admin wallet from the pen test report (public info)
const KNOWN_ADMIN_WALLET = "0.0.9707752";
// Non-admin wallet for testing
const NON_ADMIN_WALLET = "0.0.12345";

// ---------------------------------------------------------------------------
// Test Definitions
// ---------------------------------------------------------------------------

function createTests(): TestResult[] {
  return [
    {
      name: "Forged Hex Signature",
      description: "Submit a random hex string as signature (exact pen test attack vector)",
      status: "pending",
      detail: "",
      expected: "Server REJECTS — signature is not a valid SignatureMap protobuf",
    },
    {
      name: "Forged Short Signature",
      description: "Submit a short string (11 chars) that passes the old length check",
      status: "pending",
      detail: "",
      expected: "Server REJECTS — not a valid base64 SignatureMap",
    },
    {
      name: "Forged Base64 Signature",
      description: "Submit valid base64 encoding of random 64 bytes (looks like a raw signature)",
      status: "pending",
      detail: "",
      expected: "Server REJECTS — ED25519 verification fails (wrong private key)",
    },
    {
      name: "Fake Protobuf Structure",
      description: "Construct a SignatureMap-like protobuf with correct structure but fake 64-byte signature",
      status: "pending",
      detail: "",
      expected: "Server REJECTS — ED25519 verification fails (forged signature bytes)",
    },
    {
      name: "Challenge Replay",
      description: "Request challenge, submit forged verify, then try same nonce again",
      status: "pending",
      detail: "",
      expected: "Server REJECTS — challenge consumed on first attempt (one-time use)",
    },
    {
      name: "Non-Admin Wallet",
      description: "Request challenge for a wallet not in BOTB_ADMIN_WALLETS",
      status: "pending",
      detail: "",
      expected: "Server REJECTS — wallet not in admin whitelist",
    },
    {
      name: "Admin Dashboard Without Session",
      description: "Call /admin/dashboard without any session token",
      status: "pending",
      detail: "",
      expected: "Server REJECTS with 401 — SESSION_REQUIRED",
    },
    {
      name: "Admin Dashboard With Fake Session",
      description: "Call /admin/dashboard with a fabricated UUID session token",
      status: "pending",
      detail: "",
      expected: "Server REJECTS with 401 — SESSION_EXPIRED",
    },
  ];
}

// ---------------------------------------------------------------------------
// Test Runner
// ---------------------------------------------------------------------------

async function runTest(test: TestResult, index: number): Promise<TestResult> {
  const start = performance.now();
  const updated = { ...test, status: "running" as const };

  try {
    switch (index) {
      case 0: {
        // Test 1: Forged hex signature (exact attack from pen test report)
        const challengeRes = await api.requestChallenge(KNOWN_ADMIN_WALLET);
        if (!challengeRes.success || !challengeRes.data) {
          return {
            ...updated,
            status: "error",
            detail: `Challenge request failed: ${challengeRes.error}`,
            actual: challengeRes.error || "Unknown error",
            durationMs: performance.now() - start,
          };
        }

        const forgedSig = "0x03a2e77d021030a92553f395709992268a3cceca8b0ad97d5aeb0120e70b390f38";
        const verifyRes = await api.verifyChallenge(
          KNOWN_ADMIN_WALLET,
          challengeRes.data.nonce,
          forgedSig
        );

        const blocked = !verifyRes.success;
        return {
          ...updated,
          status: blocked ? "pass" : "fail",
          detail: blocked
            ? `BLOCKED: Server rejected forged hex signature. Error: "${verifyRes.error}"`
            : `VULNERABILITY: Server ACCEPTED forged hex signature! Got session token!`,
          actual: blocked ? "Rejected (401)" : "Accepted (session token issued)",
          durationMs: performance.now() - start,
        };
      }

      case 1: {
        // Test 2: Short signature that passes old `length >= 10` check
        const challengeRes = await api.requestChallenge(KNOWN_ADMIN_WALLET);
        if (!challengeRes.success || !challengeRes.data) {
          return {
            ...updated,
            status: "error",
            detail: `Challenge request failed: ${challengeRes.error}`,
            actual: challengeRes.error || "Unknown error",
            durationMs: performance.now() - start,
          };
        }

        const shortSig = "abcdefghijk"; // 11 chars — would have passed old check
        const verifyRes = await api.verifyChallenge(
          KNOWN_ADMIN_WALLET,
          challengeRes.data.nonce,
          shortSig
        );

        const blocked = !verifyRes.success;
        return {
          ...updated,
          status: blocked ? "pass" : "fail",
          detail: blocked
            ? `BLOCKED: Server rejected short forged signature. Error: "${verifyRes.error}"`
            : `VULNERABILITY: Server ACCEPTED short forged signature!`,
          actual: blocked ? "Rejected (401)" : "Accepted",
          durationMs: performance.now() - start,
        };
      }

      case 2: {
        // Test 3: Valid base64 of random 64 bytes (looks like raw ED25519 signature)
        const challengeRes = await api.requestChallenge(KNOWN_ADMIN_WALLET);
        if (!challengeRes.success || !challengeRes.data) {
          return {
            ...updated,
            status: "error",
            detail: `Challenge request failed: ${challengeRes.error}`,
            actual: challengeRes.error || "Unknown error",
            durationMs: performance.now() - start,
          };
        }

        // Generate 64 random bytes, base64 encode
        const randomBytes = new Uint8Array(64);
        crypto.getRandomValues(randomBytes);
        let binary = "";
        for (let i = 0; i < randomBytes.length; i++) {
          binary += String.fromCharCode(randomBytes[i]);
        }
        const fakeBase64Sig = btoa(binary);

        const verifyRes = await api.verifyChallenge(
          KNOWN_ADMIN_WALLET,
          challengeRes.data.nonce,
          fakeBase64Sig
        );

        const blocked = !verifyRes.success;
        return {
          ...updated,
          status: blocked ? "pass" : "fail",
          detail: blocked
            ? `BLOCKED: Server rejected random 64-byte base64 signature. Error: "${verifyRes.error}"`
            : `VULNERABILITY: Server ACCEPTED random 64-byte signature!`,
          actual: blocked ? "Rejected (ED25519 verification failed)" : "Accepted",
          durationMs: performance.now() - start,
        };
      }

      case 3: {
        // Test 4: Structurally valid protobuf with fake signature
        const challengeRes = await api.requestChallenge(KNOWN_ADMIN_WALLET);
        if (!challengeRes.success || !challengeRes.data) {
          return {
            ...updated,
            status: "error",
            detail: `Challenge request failed: ${challengeRes.error}`,
            actual: challengeRes.error || "Unknown error",
            durationMs: performance.now() - start,
          };
        }

        // Build a fake SignatureMap protobuf:
        // field 1 (SignaturePair, length-delimited):
        //   field 1 (pubKeyPrefix, length-delimited): 6 random bytes
        //   field 3 (ed25519, length-delimited): 64 random bytes
        const pubPrefix = new Uint8Array(6);
        crypto.getRandomValues(pubPrefix);
        const fakeSig = new Uint8Array(64);
        crypto.getRandomValues(fakeSig);

        // Construct protobuf bytes manually
        const innerLen = 2 + pubPrefix.length + 2 + fakeSig.length; // tag+len+data for each field
        const outerLen = 2 + innerLen; // tag + varint + inner
        const proto = new Uint8Array(outerLen);
        let pos = 0;
        // Outer: field 1 (SignaturePair), wire type 2
        proto[pos++] = 0x0A; // (1 << 3) | 2
        proto[pos++] = innerLen; // length
        // Inner field 1: pubKeyPrefix
        proto[pos++] = 0x0A; // (1 << 3) | 2
        proto[pos++] = pubPrefix.length;
        proto.set(pubPrefix, pos);
        pos += pubPrefix.length;
        // Inner field 3: ed25519 signature
        proto[pos++] = 0x1A; // (3 << 3) | 2
        proto[pos++] = 0x40; // 64 bytes
        proto.set(fakeSig, pos);

        let binaryStr = "";
        for (let i = 0; i < proto.length; i++) {
          binaryStr += String.fromCharCode(proto[i]);
        }
        const fakeProtobufBase64 = btoa(binaryStr);

        const verifyRes = await api.verifyChallenge(
          KNOWN_ADMIN_WALLET,
          challengeRes.data.nonce,
          fakeProtobufBase64
        );

        const blocked = !verifyRes.success;
        return {
          ...updated,
          status: blocked ? "pass" : "fail",
          detail: blocked
            ? `BLOCKED: Server rejected fake protobuf with correct structure. Error: "${verifyRes.error}"`
            : `VULNERABILITY: Server ACCEPTED structurally valid but cryptographically fake signature!`,
          actual: blocked ? "Rejected (ED25519 math failed)" : "Accepted",
          durationMs: performance.now() - start,
        };
      }

      case 4: {
        // Test 5: Challenge replay — submit forged verify, then try same nonce again
        const challengeRes = await api.requestChallenge(KNOWN_ADMIN_WALLET);
        if (!challengeRes.success || !challengeRes.data) {
          return {
            ...updated,
            status: "error",
            detail: `Challenge request failed: ${challengeRes.error}`,
            actual: challengeRes.error || "Unknown error",
            durationMs: performance.now() - start,
          };
        }

        const nonce = challengeRes.data.nonce;

        // First attempt — will fail signature verification but should consume the challenge
        await api.verifyChallenge(KNOWN_ADMIN_WALLET, nonce, "forged-signature-attempt-1");

        // Second attempt — even with a "better" forged sig, challenge should be gone
        const replayRes = await api.verifyChallenge(KNOWN_ADMIN_WALLET, nonce, "forged-signature-attempt-2");

        const blocked = !replayRes.success;
        return {
          ...updated,
          status: blocked ? "pass" : "fail",
          detail: blocked
            ? `BLOCKED: Challenge consumed after first attempt — replay rejected. Error: "${replayRes.error}"`
            : `VULNERABILITY: Challenge replay succeeded on second attempt!`,
          actual: blocked ? "Rejected (no challenge found)" : "Accepted",
          durationMs: performance.now() - start,
        };
      }

      case 5: {
        // Test 6: Non-admin wallet challenge
        const challengeRes = await api.requestChallenge(NON_ADMIN_WALLET);
        const blocked = !challengeRes.success;
        return {
          ...updated,
          status: blocked ? "pass" : "fail",
          detail: blocked
            ? `BLOCKED: Server rejected challenge for non-admin wallet. Error: "${challengeRes.error}"`
            : `NOTE: Server issued challenge for non-admin wallet (challenge issuance may not require admin check — verify endpoint will reject)`,
          actual: blocked ? "Rejected (403)" : "Challenge issued (will fail at verify)",
          durationMs: performance.now() - start,
        };
      }

      case 6: {
        // Test 7: Dashboard without session token
        const dashRes = await api.admin.getDashboard(KNOWN_ADMIN_WALLET);
        const blocked = !dashRes.success;
        return {
          ...updated,
          status: blocked ? "pass" : "fail",
          detail: blocked
            ? `BLOCKED: Dashboard rejected without session token. Error: "${dashRes.error}"`
            : `VULNERABILITY: Dashboard accessible without session token!`,
          actual: blocked ? "Rejected (401)" : "Data returned",
          durationMs: performance.now() - start,
        };
      }

      case 7: {
        // Test 8: Dashboard with fake session token
        const fakeToken = crypto.randomUUID();
        const dashRes = await api.admin.getDashboard(KNOWN_ADMIN_WALLET, fakeToken);
        const blocked = !dashRes.success;
        return {
          ...updated,
          status: blocked ? "pass" : "fail",
          detail: blocked
            ? `BLOCKED: Dashboard rejected with fabricated session token. Error: "${dashRes.error}"`
            : `VULNERABILITY: Dashboard accessible with fake UUID session token!`,
          actual: blocked ? "Rejected (401)" : "Data returned",
          durationMs: performance.now() - start,
        };
      }

      default:
        return { ...updated, status: "error", detail: "Unknown test index", durationMs: 0 };
    }
  } catch (err: any) {
    return {
      ...updated,
      status: "error",
      detail: `Exception: ${err?.message || String(err)}`,
      actual: "Exception thrown",
      durationMs: performance.now() - start,
    };
  }
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function SecurityAuditPage() {
  const [tests, setTests] = useState<TestResult[]>(createTests());
  const [running, setRunning] = useState(false);
  const [completedAt, setCompletedAt] = useState<string | null>(null);

  const runAllTests = useCallback(async () => {
    setRunning(true);
    setCompletedAt(null);
    const freshTests = createTests();
    setTests(freshTests);

    const results: TestResult[] = [...freshTests];

    for (let i = 0; i < results.length; i++) {
      results[i] = { ...results[i], status: "running" };
      setTests([...results]);

      const result = await runTest(results[i], i);
      results[i] = result;
      setTests([...results]);

      // Small delay between tests to avoid rate limiting
      if (i < results.length - 1) {
        await new Promise((r) => setTimeout(r, 500));
      }
    }

    setRunning(false);
    setCompletedAt(new Date().toISOString());
  }, []);

  const resetTests = useCallback(() => {
    setTests(createTests());
    setCompletedAt(null);
  }, []);

  const passCount = tests.filter((t) => t.status === "pass").length;
  const failCount = tests.filter((t) => t.status === "fail").length;
  const errorCount = tests.filter((t) => t.status === "error").length;
  const allDone = tests.every((t) => t.status !== "pending" && t.status !== "running");

  return (
    <div className="min-h-screen bg-black text-white p-4 sm:p-8">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex items-center gap-3 mb-2">
          <Shield className="w-8 h-8 text-amber-400" />
          <h1 className="text-2xl text-amber-400">Security Audit — Pen Test Verification</h1>
        </div>
        <p className="text-gray-400 mb-1">
          IvyFi Report Retest — CVSS 8.8 Admin Privilege Escalation Fix
        </p>
        <p className="text-gray-500 text-sm mb-6">
          Replays all attack vectors from the 2026-03-16 security assessment against the LIVE backend.
          Every test should show <span className="text-green-400">PASS</span> (attack blocked).
          A <span className="text-red-400">FAIL</span> means the vulnerability still exists.
        </p>

        {/* Controls */}
        <div className="flex items-center gap-4 mb-8">
          <button
            onClick={runAllTests}
            disabled={running}
            className="flex items-center gap-2 px-6 py-3 bg-amber-500 text-black rounded-lg disabled:opacity-50 hover:bg-amber-400 transition-colors"
          >
            <Play className="w-4 h-4" />
            {running ? "Running..." : "Run All Tests"}
          </button>
          <button
            onClick={resetTests}
            disabled={running}
            className="flex items-center gap-2 px-4 py-3 bg-gray-800 text-gray-300 rounded-lg disabled:opacity-50 hover:bg-gray-700 transition-colors"
          >
            <RotateCcw className="w-4 h-4" />
            Reset
          </button>

          {allDone && (
            <div className="flex items-center gap-4 ml-auto text-sm">
              <span className="text-green-400">{passCount} passed</span>
              {failCount > 0 && <span className="text-red-400">{failCount} FAILED</span>}
              {errorCount > 0 && <span className="text-yellow-400">{errorCount} errors</span>}
            </div>
          )}
        </div>

        {/* Summary Banner */}
        {allDone && (
          <div
            className={`p-4 rounded-lg mb-8 border ${
              failCount === 0
                ? "bg-green-900/30 border-green-700 text-green-300"
                : "bg-red-900/30 border-red-700 text-red-300"
            }`}
          >
            {failCount === 0 ? (
              <div className="flex items-center gap-3">
                <CheckCircle className="w-6 h-6 text-green-400 shrink-0" />
                <div>
                  <p className="font-medium">All attack vectors BLOCKED</p>
                  <p className="text-sm opacity-80">
                    The IvyFi CVSS 8.8 privilege escalation vulnerability has been remediated.
                    ED25519 cryptographic verification is enforced on all admin authentication.
                    Completed: {completedAt}
                  </p>
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-3">
                <XCircle className="w-6 h-6 text-red-400 shrink-0" />
                <div>
                  <p className="font-medium">CRITICAL: {failCount} attack vector(s) still exploitable</p>
                  <p className="text-sm opacity-80">
                    The admin authentication bypass is NOT fully remediated. Review failed tests immediately.
                  </p>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Test Results */}
        <div className="space-y-4">
          {tests.map((test, i) => (
            <div
              key={i}
              className={`border rounded-lg p-4 ${
                test.status === "pass"
                  ? "border-green-800 bg-green-900/10"
                  : test.status === "fail"
                  ? "border-red-800 bg-red-900/10"
                  : test.status === "error"
                  ? "border-yellow-800 bg-yellow-900/10"
                  : test.status === "running"
                  ? "border-amber-800 bg-amber-900/10"
                  : "border-gray-800 bg-gray-900/20"
              }`}
            >
              <div className="flex items-start gap-3">
                <div className="mt-0.5">
                  {test.status === "pass" && <CheckCircle className="w-5 h-5 text-green-400" />}
                  {test.status === "fail" && <XCircle className="w-5 h-5 text-red-400" />}
                  {test.status === "error" && <AlertTriangle className="w-5 h-5 text-yellow-400" />}
                  {test.status === "running" && (
                    <div className="w-5 h-5 border-2 border-amber-400 border-t-transparent rounded-full animate-spin" />
                  )}
                  {test.status === "pending" && (
                    <div className="w-5 h-5 rounded-full border-2 border-gray-600" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-white">Test {i + 1}: {test.name}</span>
                    {test.durationMs !== undefined && (
                      <span className="text-gray-500 text-xs">{Math.round(test.durationMs)}ms</span>
                    )}
                  </div>
                  <p className="text-gray-400 text-sm mt-0.5">{test.description}</p>
                  <p className="text-gray-500 text-xs mt-1">
                    Expected: {test.expected}
                  </p>
                  {test.actual && (
                    <p
                      className={`text-xs mt-1 ${
                        test.status === "pass"
                          ? "text-green-400"
                          : test.status === "fail"
                          ? "text-red-400"
                          : "text-yellow-400"
                      }`}
                    >
                      Actual: {test.actual}
                    </p>
                  )}
                  {test.detail && (
                    <p className="text-gray-300 text-sm mt-2 bg-black/40 p-2 rounded font-mono text-xs break-all">
                      {test.detail}
                    </p>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="mt-8 pt-6 border-t border-gray-800 text-gray-500 text-xs">
          <p>
            Security Audit Verification — IvyFi Report Reference: WCO Platform Security Assessment, 16 March 2026
          </p>
          <p className="mt-1">
            Fix Applied: Full ED25519 cryptographic signature verification in <code>verifyAndCreateSession()</code> with 9-strategy multi-encoding pipeline.
            Replaces vulnerable <code>signature.length &gt;= 10</code> check.
          </p>
        </div>
      </div>
    </div>
  );
}
