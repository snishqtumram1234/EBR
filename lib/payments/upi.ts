import { randomBytes } from "node:crypto";

/**
 * Direct UPI payments using the NPCI "upi://pay" deep-link format. Any UPI
 * app (GPay, PhonePe, Paytm, BHIM) opens it from a phone, or scans it as a QR
 * code. Money goes straight to the configured UPI ID with no gateway fees.
 *
 * Limitation: there is no gateway callback, so the website cannot confirm
 * payment by itself. The customer submits the 12-digit UTR (UPI reference
 * number) shown in their app and the order waits for manual verification.
 */

const VPA = /^[a-zA-Z0-9._-]{2,256}@[a-zA-Z][a-zA-Z0-9.-]{1,63}$/;

/** 12-digit UPI transaction reference (UTR / RRN) shown in every UPI app. */
export const UTR_PATTERN = /^[0-9]{12}$/;

export function newUpiReference(): string {
  // Short, unique and URL-safe; "tr" allows up to 35 characters.
  return `FS${Date.now().toString(36).toUpperCase()}${randomBytes(3).toString("hex").toUpperCase()}`;
}

/** Paise to the rupee string UPI expects, e.g. 4499900 -> "44999.00". */
export function paiseToUpiAmount(paise: number): string {
  if (!Number.isSafeInteger(paise) || paise <= 0) throw new TypeError(`Invalid amount: ${paise}`);
  return `${Math.floor(paise / 100)}.${String(paise % 100).padStart(2, "0")}`;
}

export function buildUpiLink(params: {
  vpa: string;
  payeeName: string;
  amountPaise: number;
  reference: string;
  note: string;
}): string {
  if (!VPA.test(params.vpa)) throw new TypeError("Invalid UPI ID");
  const enc = (s: string) => encodeURIComponent(s).replace(/%20/g, "+");
  // The UPI ID is validated above, so it is safe unencoded; some apps reject an encoded "@".
  const query = [
    `pa=${params.vpa}`,
    `pn=${enc(params.payeeName.slice(0, 50))}`,
    `am=${paiseToUpiAmount(params.amountPaise)}`,
    `cu=INR`,
    `tr=${enc(params.reference.slice(0, 35))}`,
    `tn=${enc(params.note.slice(0, 80))}`,
  ].join("&");
  return `upi://pay?${query}`;
}
