/**
 * Server-side receipt OCR (Phase 2.1).
 *
 * The Gemini key is stored in Functions config/secrets, NOT bundled into the
 * app. The client uploads an image to `users/{uid}/pending/{file}` and calls the
 * callable `scanReceipt` with that storage path; the result is schema-validated
 * and returned for the user to confirm — it is never written to the ledger
 * directly.
 */

import * as https from "node:https";

const MODEL = "gemini-3.1-flash-lite";

// Minimal schema handshake with the LLM. No free-form model output is trusted.
const SYSTEM_PROMPT = [
  "You extract structured receipt data.",
  "Return JSON ONLY with keys:",
  "merchant (string), date (YYYY-MM-DD or original), total (number),",
  "category (one of Food|Transport|Shopping|Utilities|Rent|Entertainment|Healthcare|Travel|Other),",
  "currency (string, e.g. RM, USD), type (expense|income), confidence (0..1).",
].join(" ");

export interface OcrResult {
  merchant: string;
  date: string; // YYYY-MM-DD
  total: number;
  category: string;
  currency: string;
  type: "expense" | "income";
  confidence: number;
}

function readEnv(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`Missing server secret: ${name}`);
  return v;
}

/** Call Gemini's generateContent REST endpoint with base64 image data. */
export async function runGeminiOcr(
  imageBase64: string,
  mimeType: string
): Promise<unknown> {
  const API_KEY = readEnv("GEMINI_API_KEY");
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent?key=${API_KEY}`;
  const body = JSON.stringify({
    contents: [
      {
        parts: [
          { text: SYSTEM_PROMPT },
          {
            inline_data: { mime_type: mimeType, data: imageBase64 },
          },
        ],
      },
    ],
    generationConfig: {
      responseMimeType: "application/json",
      temperature: 0.2,
    },
  });

  const res = await postJson(url, body);
  return extractText(res);
}

function postJson(url: string, body: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const req = https.request(url, { method: "POST", headers: { "Content-Type": "application/json" } }, (res) => {
      let data = "";
      res.on("data", (c) => (data += c));
      res.on("end", () => {
        if (res.statusCode && res.statusCode >= 400) {
          reject(new Error(`Gemini API ${res.statusCode}: ${data.slice(0, 500)}`));
        } else {
          resolve(data);
        }
      });
    });
    req.on("error", reject);
    req.write(body);
    req.end();
  });
}

function extractText(json: string): unknown {
  const parsed = JSON.parse(json) as {
    candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
  };
  const text = parsed.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) throw new Error("OCR_EMPTY_RESPONSE");
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

function clamp01(n: number): number {
  return Math.min(1, Math.max(0, n));
}

/** Coerce + validate the model response into an OcrResult. Throws on bad shape. */
export function parseOcrResult(raw: unknown): OcrResult {
  if (raw === null || typeof raw !== "object") {
    throw new Error("OCR_SCHEMA_INVALID");
  }
  const o = raw as Record<string, unknown>;
  const merchant = String(o["merchant"] ?? "").trim();
  const total = Number(o["total"] ?? o["total_amount"] ?? o["amount"]);
  if (!merchant || !Number.isFinite(total)) {
    throw new Error("OCR_SCHEMA_INVALID");
  }
  const category = String(o["category"] ?? "Other");
  const type = o["type"] === "income" ? "income" : "expense";
  const dateStr = String(o["date"] ?? "").trim();
  const M = dateStr.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
  const date = M
    ? `${M[1]}-${M[2].padStart(2, "0")}-${M[3].padStart(2, "0")}`
    : new Date().toISOString().slice(0, 10);

  return {
    merchant,
    date,
    total: Math.round(total * 100) / 100,
    category,
    currency: String(o["currency"] ?? "RM").trim() || "RM",
    type,
    confidence: Number.isFinite(Number(o["confidence"]))
      ? clamp01(Number(o["confidence"]))
      : 0.5,
  };
}

/** True when a result should require explicit user confirmation. */
export function needsConfirmation(result: OcrResult): boolean {
  return result.confidence < 0.75;
}