// Reading a qr code out of a picture and telling what is inside of it. jsqr
// wants a plain rgba buffer and one clean look at the code, while real photos
// and screenshots are neither, so every buffer goes through a few passes

import { PixelBytes, resamplePixels } from "./ImageProcessing";

import type { QRCode } from "jsqr";

export interface ScanPoint {
  x: number;
  y: number;
}

export interface FoundCode {
  text: string;
  byteLength: number;
  version: number;
  moduleCount: number;
  modes: string[];
  corners: ScanPoint[];
}

export interface PayloadField {
  label: string;
  value: string;
}

export interface PayloadDetails {
  kind: string;
  fields: PayloadField[];
  linkUrl?: string;
  isInsecure?: boolean;
  isSecret?: boolean;
}

interface FieldPlan {
  key: string;
  label: string;
  format?: (someValue: string) => string;
}

type TaggedPairs = Record<string, string | undefined>;

// Anything bigger is scanned downscaled first, it is both faster and cleaner,
// the camera noise of a phone photo mostly disappears on the way down
export const SCAN_MAX_SIDE = 1600;
// A code saved as a tiny favicon has its modules landing between the pixels,
// blowing it up first gives the binarizer something to work with
export const SCAN_MIN_SIDE = 240;
const MODULES_PER_VERSION = 4;
const MODULES_BASE = 17;
const CHUNK_TITLES: Record<string, string> = {
  numeric: "numeric",
  alphanumeric: "alphanumeric",
  byte: "byte",
  kanji: "kanji",
  eci: "eci",
};
const QUERY_FIELDS_LIMIT = 12;

let readerPromise: Promise<typeof import("jsqr").default> | null = null;

// The library is a good chunk of code and most of the visitors never open this
// tool, so it arrives only when something is actually being scanned
export function loadQrReader() {
  if (!readerPromise) {
    readerPromise = import("jsqr").then((someModule) => {
      return someModule.default || someModule;
    });
  }
  return readerPromise;
}

export function buildScanScales(imageWidth: number, imageHeight: number) {
  const longestSide = Math.max(imageWidth, imageHeight) || 1;
  const allScales = [1];
  if (longestSide > SCAN_MAX_SIDE) {
    allScales.unshift(SCAN_MAX_SIDE / longestSide);
  }
  if (longestSide < SCAN_MIN_SIDE) {
    allScales.push(Math.ceil(SCAN_MIN_SIDE / longestSide));
  }
  return allScales;
}

// Corners come back in the coordinates of the buffer that was scanned, the
// overlay is drawn over the original one, so they are scaled back here
function buildCorners(foundLocation: QRCode["location"], usedScale: number) {
  const cornerKeys = [
    "topLeftCorner",
    "topRightCorner",
    "bottomRightCorner",
    "bottomLeftCorner",
  ] as const;
  return cornerKeys.map((oneKey) => {
    return {
      x: foundLocation[oneKey].x / usedScale,
      y: foundLocation[oneKey].y / usedScale,
    };
  });
}

export function describeFoundCode(
  foundCode: QRCode,
  usedScale: number,
): FoundCode {
  const allModes: string[] = [];
  (foundCode.chunks || []).forEach((oneChunk) => {
    const modeTitle = CHUNK_TITLES[oneChunk.type] || oneChunk.type;
    if (allModes.indexOf(modeTitle) === -1) {
      allModes.push(modeTitle);
    }
  });
  return {
    text: foundCode.data,
    byteLength: foundCode.binaryData ? foundCode.binaryData.length : 0,
    version: foundCode.version,
    moduleCount: MODULES_BASE + MODULES_PER_VERSION * foundCode.version,
    modes: allModes,
    corners: foundCode.location
      ? buildCorners(foundCode.location, usedScale)
      : [],
  };
}

// Every scale is tried with both polarities, a code printed light on dark is
// still a code even though many phone scanners disagree
export async function scanPixels(
  sourcePixels: PixelBytes,
  sourceWidth: number,
  sourceHeight: number,
): Promise<FoundCode | null> {
  const readQrCode = await loadQrReader();
  const allScales = buildScanScales(sourceWidth, sourceHeight);
  for (let scaleIndex = 0; scaleIndex < allScales.length; scaleIndex += 1) {
    const oneScale = allScales[scaleIndex];
    const targetWidth = Math.max(1, Math.round(sourceWidth * oneScale));
    const targetHeight = Math.max(1, Math.round(sourceHeight * oneScale));
    const scaledPixels =
      oneScale === 1
        ? new Uint8ClampedArray(sourcePixels)
        : resamplePixels(
            sourcePixels,
            sourceWidth,
            sourceHeight,
            targetWidth,
            targetHeight,
          );
    const foundCode = readQrCode(scaledPixels, targetWidth, targetHeight, {
      inversionAttempts: "attemptBoth",
    });
    if (foundCode) {
      return describeFoundCode(foundCode, oneScale);
    }
  }
  return null;
}

// The qr flavour of escaping: a backslash in front of the character that would
// otherwise end the field
function unescapeValue(rawValue: string) {
  return rawValue.replace(/\\(.)/g, "$1");
}

function splitEscapedFields(bodyText: string) {
  const allFields: string[] = [];
  let currentField = "";
  for (let charIndex = 0; charIndex < bodyText.length; charIndex += 1) {
    const oneChar = bodyText[charIndex];
    if (oneChar === "\\") {
      currentField += oneChar + (bodyText[charIndex + 1] || "");
      charIndex += 1;
    } else if (oneChar === ";") {
      allFields.push(currentField);
      currentField = "";
    } else {
      currentField += oneChar;
    }
  }
  allFields.push(currentField);
  return allFields.filter((oneField) => oneField !== "");
}

// Both wifi and mecard payloads are the same KEY:value; list, they only differ
// in the keys they use
function parseTaggedBody(bodyText: string) {
  const parsedPairs: TaggedPairs = {};
  splitEscapedFields(bodyText).forEach((oneField) => {
    const colonAt = oneField.indexOf(":");
    if (colonAt === -1) {
      return;
    }
    const fieldKey = oneField.slice(0, colonAt).toUpperCase();
    if (parsedPairs[fieldKey] === undefined) {
      parsedPairs[fieldKey] = unescapeValue(oneField.slice(colonAt + 1));
    }
  });
  return parsedPairs;
}

// The vcard and the calendar entry share the line based format, the parameters
// after the semicolon of a property name are not interesting here
function parseLineBody(bodyText: string) {
  const parsedPairs: TaggedPairs = {};
  bodyText.split(/\r\n|\r|\n/).forEach((oneLine) => {
    const colonAt = oneLine.indexOf(":");
    if (colonAt === -1) {
      return;
    }
    const nameWithParams = oneLine.slice(0, colonAt);
    const propertyName = nameWithParams.split(";")[0].toUpperCase();
    if (parsedPairs[propertyName] === undefined) {
      parsedPairs[propertyName] = oneLine.slice(colonAt + 1).trim();
    }
  });
  return parsedPairs;
}

function buildFields(
  pairsDict: TaggedPairs,
  fieldsPlan: ReadonlyArray<FieldPlan>,
) {
  const allFields: PayloadField[] = [];
  fieldsPlan.forEach((onePlan) => {
    const rawValue = pairsDict[onePlan.key];
    if (rawValue) {
      allFields.push({
        label: onePlan.label,
        value: onePlan.format ? onePlan.format(rawValue) : rawValue,
      });
    }
  });
  return allFields;
}

const WIFI_SECURITY_TITLES: Record<string, string> = {
  WPA: "WPA or WPA2",
  WPA2: "WPA2",
  WPA3: "WPA3",
  SAE: "WPA3 (SAE)",
  WEP: "WEP",
  NOPASS: "open, no password",
};

function describeWifi(payloadText: string): PayloadDetails {
  const parsedPairs = parseTaggedBody(payloadText.slice("WIFI:".length));
  return {
    kind: "Wi-Fi network",
    fields: buildFields(parsedPairs, [
      { key: "S", label: "Network name" },
      {
        key: "T",
        label: "Security",
        format: (someValue) =>
          WIFI_SECURITY_TITLES[someValue.toUpperCase()] || someValue,
      },
      { key: "P", label: "Password" },
      { key: "H", label: "Hidden network" },
    ]),
  };
}

function describeMecard(payloadText: string): PayloadDetails {
  const parsedPairs = parseTaggedBody(payloadText.slice("MECARD:".length));
  return {
    kind: "Contact (MeCard)",
    fields: buildFields(parsedPairs, [
      { key: "N", label: "Name" },
      { key: "ORG", label: "Organization" },
      { key: "TEL", label: "Phone" },
      { key: "EMAIL", label: "Email" },
      { key: "URL", label: "Site" },
      { key: "ADR", label: "Address" },
      { key: "NOTE", label: "Note" },
    ]),
  };
}

function describeVcard(payloadText: string): PayloadDetails {
  const parsedPairs = parseLineBody(payloadText);
  return {
    kind: "Contact (vCard)",
    fields: buildFields(parsedPairs, [
      { key: "FN", label: "Name" },
      { key: "N", label: "Name parts" },
      { key: "ORG", label: "Organization" },
      { key: "TITLE", label: "Title" },
      { key: "TEL", label: "Phone" },
      { key: "EMAIL", label: "Email" },
      { key: "URL", label: "Site" },
      { key: "ADR", label: "Address" },
    ]),
  };
}

function describeEvent(payloadText: string): PayloadDetails {
  const parsedPairs = parseLineBody(payloadText);
  return {
    kind: "Calendar event",
    fields: buildFields(parsedPairs, [
      { key: "SUMMARY", label: "Title" },
      { key: "DTSTART", label: "Starts" },
      { key: "DTEND", label: "Ends" },
      { key: "LOCATION", label: "Place" },
      { key: "DESCRIPTION", label: "Description" },
    ]),
  };
}

// URL is not available in every place this code may run, and a broken payload
// should never take the whole tool down with it
function parseUrlSafely(payloadText: string) {
  try {
    return new URL(payloadText);
  } catch {
    return null;
  }
}

function describeQueryFields(parsedUrl: URL) {
  const allFields: PayloadField[] = [];
  parsedUrl.searchParams.forEach((oneValue, oneKey) => {
    if (allFields.length < QUERY_FIELDS_LIMIT) {
      allFields.push({ label: `Query ${oneKey}`, value: oneValue });
    }
  });
  return allFields;
}

function describeLink(payloadText: string): PayloadDetails {
  const parsedUrl = parseUrlSafely(payloadText);
  if (!parsedUrl) {
    return { kind: "Link", fields: [] };
  }
  const allFields = [
    { label: "Host", value: parsedUrl.host },
    { label: "Protocol", value: parsedUrl.protocol.replace(":", "") },
  ];
  if (parsedUrl.pathname && parsedUrl.pathname !== "/") {
    allFields.push({ label: "Path", value: parsedUrl.pathname });
  }
  return {
    kind: "Link",
    fields: allFields.concat(describeQueryFields(parsedUrl)),
    linkUrl: parsedUrl.href,
    isInsecure: parsedUrl.protocol === "http:",
  };
}

function describeMailto(payloadText: string): PayloadDetails {
  const parsedUrl = parseUrlSafely(payloadText);
  const allFields: PayloadField[] = [
    {
      label: "To",
      value: decodeURIComponent(
        payloadText.slice("mailto:".length).split("?")[0],
      ),
    },
  ];
  return {
    kind: "Email",
    fields: parsedUrl
      ? allFields.concat(describeQueryFields(parsedUrl))
      : allFields,
  };
}

function describeOtp(payloadText: string): PayloadDetails {
  const parsedUrl = parseUrlSafely(payloadText);
  if (!parsedUrl) {
    return { kind: "One time password", fields: [] };
  }
  const labelText = decodeURIComponent(parsedUrl.pathname.replace(/^\//, ""));
  return {
    kind: "One time password",
    fields: [
      { label: "Type", value: parsedUrl.host.toUpperCase() },
      { label: "Account", value: labelText },
    ].concat(describeQueryFields(parsedUrl)),
    isSecret: true,
  };
}

function describeGeo(payloadText: string): PayloadDetails {
  const allParts = payloadText.slice("geo:".length).split(/[,;]/);
  return {
    kind: "Coordinates",
    fields: buildFields({ LAT: allParts[0], LON: allParts[1] }, [
      { key: "LAT", label: "Latitude" },
      { key: "LON", label: "Longitude" },
    ]),
  };
}

function describeSms(payloadText: string): PayloadDetails {
  const bodyText = payloadText.replace(/^(smsto|sms):/i, "");
  const separatorAt = bodyText.indexOf(":");
  const allFields: PayloadField[] = [
    {
      label: "Number",
      value: separatorAt === -1 ? bodyText : bodyText.slice(0, separatorAt),
    },
  ];
  if (separatorAt !== -1) {
    allFields.push({
      label: "Message",
      value: bodyText.slice(separatorAt + 1),
    });
  }
  return { kind: "Sms", fields: allFields };
}

function describePlainText(payloadText: string): PayloadDetails {
  const allLines = payloadText.split(/\r\n|\r|\n/);
  const allFields: PayloadField[] = [
    { label: "Characters", value: String(payloadText.length) },
  ];
  if (allLines.length > 1) {
    allFields.push({ label: "Lines", value: String(allLines.length) });
  }
  return { kind: "Plain text", fields: allFields };
}

// What is inside the code matters more than the code itself, so the payload is
// pulled apart into the fields its format promises
export function describeQrPayload(payloadText: string): PayloadDetails {
  const trimmedText = (payloadText || "").trim();
  const lowerText = trimmedText.toLowerCase();
  if (!trimmedText) {
    return { kind: "Empty", fields: [] };
  }
  if (lowerText.indexOf("wifi:") === 0) {
    return describeWifi(trimmedText);
  }
  if (lowerText.indexOf("mecard:") === 0) {
    return describeMecard(trimmedText);
  }
  if (lowerText.indexOf("begin:vcard") === 0) {
    return describeVcard(trimmedText);
  }
  if (
    lowerText.indexOf("begin:vcalendar") === 0 ||
    lowerText.indexOf("begin:vevent") === 0
  ) {
    return describeEvent(trimmedText);
  }
  if (lowerText.indexOf("otpauth://") === 0) {
    return describeOtp(trimmedText);
  }
  if (lowerText.indexOf("mailto:") === 0) {
    return describeMailto(trimmedText);
  }
  if (lowerText.indexOf("tel:") === 0) {
    return {
      kind: "Phone number",
      fields: [{ label: "Number", value: trimmedText.slice("tel:".length) }],
    };
  }
  if (lowerText.indexOf("sms:") === 0 || lowerText.indexOf("smsto:") === 0) {
    return describeSms(trimmedText);
  }
  if (lowerText.indexOf("geo:") === 0) {
    return describeGeo(trimmedText);
  }
  if (
    lowerText.indexOf("http://") === 0 ||
    lowerText.indexOf("https://") === 0
  ) {
    return describeLink(trimmedText);
  }
  return describePlainText(trimmedText);
}
