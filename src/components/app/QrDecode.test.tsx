import {
  buildScanScales,
  describeQrPayload,
  scanPixels,
} from "../../misc/QrScanning";
import QrDecodeComponent, {
  buildSourceMeta,
  computeFrameSize,
} from "./QrDecode";
import { render, screen } from "@testing-library/react";

import { QRCodeSVG } from "qrcode.react";
import React from "react";

const MODULE_SIZE = 6;
const QUIET_MODULES = 4;

// The generator draws the code as one path of horizontal runs, turning it back
// into a matrix is the only way to get real qr pixels without a canvas
const readModulesFromPath = (pathData: string, moduleCount: number) => {
  const allRows: boolean[][] = [];
  for (let rowIndex = 0; rowIndex < moduleCount; rowIndex += 1) {
    allRows.push(new Array(moduleCount).fill(false));
  }
  const runPattern = /M(\d+)[ ,](\d+)\s*h(\d+)/g;
  let oneRun = runPattern.exec(pathData);
  while (oneRun) {
    const startColumn = parseInt(oneRun[1], 10);
    const rowIndex = parseInt(oneRun[2], 10);
    const runWidth = parseInt(oneRun[3], 10);
    for (let shift = 0; shift < runWidth; shift += 1) {
      allRows[rowIndex][startColumn + shift] = true;
    }
    oneRun = runPattern.exec(pathData);
  }
  return allRows;
};

// Every module becomes a square of pixels and the whole thing gets the quiet
// zone the specification asks for, exactly what a scanner expects to see
const renderModulesToPixels = (allRows: boolean[][]) => {
  const sideInModules = allRows.length + QUIET_MODULES * 2;
  const sideInPixels = sideInModules * MODULE_SIZE;
  const allPixels = new Uint8ClampedArray(sideInPixels * sideInPixels * 4);
  allPixels.fill(255);
  allRows.forEach((oneRow, rowIndex) => {
    oneRow.forEach((isDark, columnIndex) => {
      if (!isDark) {
        return;
      }
      const leftEdge = (columnIndex + QUIET_MODULES) * MODULE_SIZE;
      const topEdge = (rowIndex + QUIET_MODULES) * MODULE_SIZE;
      for (let shiftY = 0; shiftY < MODULE_SIZE; shiftY += 1) {
        for (let shiftX = 0; shiftX < MODULE_SIZE; shiftX += 1) {
          const pixelOffset =
            ((topEdge + shiftY) * sideInPixels + leftEdge + shiftX) * 4;
          allPixels[pixelOffset] = 0;
          allPixels[pixelOffset + 1] = 0;
          allPixels[pixelOffset + 2] = 0;
        }
      }
    });
  });
  return { pixels: allPixels, side: sideInPixels };
};

const makeQrPixels = (payloadText: string) => {
  const { container } = render(<QRCodeSVG value={payloadText} />);
  const svgNode = container.querySelector("svg")!;
  const moduleCount = parseInt(
    svgNode.getAttribute("viewBox")!.split(" ")[2],
    10,
  );
  const pathNodes = svgNode.querySelectorAll("path");
  const codePath = pathNodes[pathNodes.length - 1].getAttribute("d")!;
  return renderModulesToPixels(readModulesFromPath(codePath, moduleCount));
};

test("reads back a code made by the generator", async () => {
  const payloadText = "https://example.com/hello?tool=qr";
  const madePixels = makeQrPixels(payloadText);
  const foundCode = await scanPixels(
    madePixels.pixels,
    madePixels.side,
    madePixels.side,
  );
  expect(foundCode).not.toBeNull();
  expect(foundCode!.text).toBe(payloadText);
  expect(foundCode!.byteLength).toBe(payloadText.length);
  expect(foundCode!.moduleCount).toBe(17 + 4 * foundCode!.version);
  expect(foundCode!.corners.length).toBe(4);
});

test("reads a wifi code and gives nothing back on a blank image", async () => {
  const madePixels = makeQrPixels("WIFI:S:My net;T:WPA;P:pa;ss;H:true;;");
  const foundCode = await scanPixels(
    madePixels.pixels,
    madePixels.side,
    madePixels.side,
  );
  expect(foundCode!.text).toContain("WIFI:");

  const blankPixels = new Uint8ClampedArray(120 * 120 * 4);
  blankPixels.fill(255);
  expect(await scanPixels(blankPixels, 120, 120)).toBeNull();
});

test("scan scales cover the oversized and the tiny pictures", () => {
  expect(buildScanScales(800, 600)).toEqual([1]);
  const bigScales = buildScanScales(4000, 3000);
  expect(bigScales.length).toBe(2);
  expect(bigScales[0]).toBeCloseTo(0.4, 5);
  expect(bigScales[1]).toBe(1);
  expect(buildScanScales(60, 60)).toEqual([1, 4]);
});

test("payloads are pulled apart by their format", () => {
  const wifiDetails = describeQrPayload(
    "WIFI:S:My\\;net;T:WPA;P:secret;H:true;;",
  );
  expect(wifiDetails.kind).toBe("Wi-Fi network");
  expect(wifiDetails.fields).toContainEqual({
    label: "Network name",
    value: "My;net",
  });
  expect(wifiDetails.fields).toContainEqual({
    label: "Security",
    value: "WPA or WPA2",
  });

  const linkDetails = describeQrPayload("http://example.com/a?page=2");
  expect(linkDetails.kind).toBe("Link");
  expect(linkDetails.isInsecure).toBe(true);
  expect(linkDetails.linkUrl).toBe("http://example.com/a?page=2");
  expect(linkDetails.fields).toContainEqual({
    label: "Host",
    value: "example.com",
  });
  expect(linkDetails.fields).toContainEqual({
    label: "Query page",
    value: "2",
  });

  const cardDetails = describeQrPayload(
    "BEGIN:VCARD\nVERSION:3.0\nFN:John Doe\nTEL;TYPE=CELL:+1234\nEND:VCARD",
  );
  expect(cardDetails.kind).toBe("Contact (vCard)");
  expect(cardDetails.fields).toContainEqual({
    label: "Name",
    value: "John Doe",
  });
  expect(cardDetails.fields).toContainEqual({ label: "Phone", value: "+1234" });

  const otpDetails = describeQrPayload(
    "otpauth://totp/Example:me@example.com?secret=JBSWY3DP&issuer=Example",
  );
  expect(otpDetails.kind).toBe("One time password");
  expect(otpDetails.isSecret).toBe(true);
  expect(otpDetails.fields).toContainEqual({
    label: "Account",
    value: "Example:me@example.com",
  });

  expect(describeQrPayload("geo:55.75,37.61").fields).toContainEqual({
    label: "Latitude",
    value: "55.75",
  });
  expect(describeQrPayload("tel:+70001112233").kind).toBe("Phone number");
  expect(describeQrPayload("SMSTO:+7000:ping").fields).toContainEqual({
    label: "Message",
    value: "ping",
  });
  expect(describeQrPayload("just a note\nsecond line").fields).toContainEqual({
    label: "Lines",
    value: "2",
  });
  expect(describeQrPayload("   ").kind).toBe("Empty");
});

test("previews are boxed and the source line stays readable", () => {
  expect(computeFrameSize(1920, 1080, 640)).toEqual({
    width: 640,
    height: 360,
    scale: 640 / 1920,
  });
  // A small picture is never blown up just to fill the preview box
  expect(computeFrameSize(100, 200, 640).height).toBe(200);
  expect(buildSourceMeta({ width: 8, height: 8 })).toBe("8 by 8");
  expect(
    buildSourceMeta({
      width: 10,
      height: 20,
      formatTitle: "PNG",
      fileSize: 2048,
    }),
  ).toBe("PNG, 10 by 20, 2.0 KB");
});

test("renders the empty state with both ways to load a code", () => {
  render(<QrDecodeComponent />);
  expect(screen.getByText(/Nothing scanned yet/)).toBeInTheDocument();
  expect(screen.getByText(/Drag an image here/)).toBeInTheDocument();
  expect(screen.getByText("Scan with camera")).toBeInTheDocument();
});
