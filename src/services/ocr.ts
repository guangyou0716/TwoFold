import { ref, uploadBytes } from "firebase/storage";
import { httpsCallable } from "firebase/functions";
import { storage, functions } from "../../firebaseConfig";
import { callableReceiptToFields } from "../utils/validation";

/**
 * Server-side receipt OCR client.
 *
 * The Gemini key NEVER ships in the app bundle. The image is uploaded to the
 * user's controlled pending area and OCR'd by the `scanReceipt` callable; the
 * result is schema-validated server-side and returned for user confirmation —
 * it is never written to the ledger automatically.
 */

export interface OcrFieldSet {
  title: string;
  amount: string; // display decimal string
  category: string;
  date: string; // YYYY-MM-DD
  type: "expense" | "income";
  needsConfirmation: boolean;
}

function blobFromBase64(base64: string, mime: string): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.responseType = "blob";
    xhr.onload = () => resolve(xhr.response as Blob);
    xhr.onerror = () => reject(new Error("Failed to create blob"));
    xhr.open("GET", `data:${mime};base64,${base64}`);
    xhr.send();
  });
}

/**
 * Upload `imageBase64` to `users/{uid}/pending/{ts}.jpg` and run `scanReceipt`.
 * Path is enforced server-side to be within the caller's own pending area.
 */
export async function scanReceiptImage(
  uid: string,
  imageBase64: string,
  mime: string
): Promise<OcrFieldSet> {
  const path = `users/${uid}/pending/${Date.now()}.jpg`;

  const blob = await blobFromBase64(imageBase64, mime);
  await uploadBytes(ref(storage, path), blob, { contentType: mime });

  const call = httpsCallable<{ path: string }, { result: unknown; needsConfirmation?: boolean }>(
    functions,
    "scanReceipt"
  );
  const res = await call({ path });
  return callableReceiptToFields(res.data);
}

export default scanReceiptImage;