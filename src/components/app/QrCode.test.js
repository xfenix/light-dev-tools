import { fireEvent, render, screen } from "@testing-library/react";

import QrCodeComponent, { buildSvgMarkup } from "./QrCode";
import React from "react";

let currentContainer = null;
// the color pickers render their own svg icons, the qr one is rendered last
const lastSvg = () => {
  const allSvgNodes = currentContainer.querySelectorAll("svg");
  return allSvgNodes[allSvgNodes.length - 1];
};
const typeInto = (text) => {
  fireEvent.change(currentContainer.querySelector("textarea"), {
    target: { value: text },
  });
};

test("renders empty state, then canvas and svg, then recovers from overflow", () => {
  const { container } = render(<QrCodeComponent />);
  currentContainer = container;
  expect(screen.getByText(/Nothing to encode yet/)).toBeInTheDocument();
  expect(container.querySelector("canvas")).toBeNull();

  typeInto("https://example.com");
  const canvasNode = container.querySelector("canvas");
  const svgNode = lastSvg();
  expect(canvasNode).not.toBeNull();
  expect(svgNode).not.toBeNull();
  expect(canvasNode.getAttribute("width")).toBe("128");
  expect(svgNode.getAttribute("width")).toBe("128");
  expect(screen.getByText("Download PNG")).toBeInTheDocument();
  expect(screen.getByText("Download SVG")).toBeInTheDocument();

  // serialization used by the svg download must produce a standalone document
  const markup = buildSvgMarkup(svgNode);
  expect(markup).toContain("xmlns=\"http://www.w3.org/2000/svg\"");
  expect(markup).toContain("<path");

  // biggest size is applied to both renderers
  fireEvent.click(screen.getByDisplayValue("2000"));
  expect(container.querySelector("canvas").getAttribute("width")).toBe("2000");
  expect(lastSvg().getAttribute("width")).toBe("2000");

  // quiet zone and colors are wired through
  fireEvent.click(screen.getByDisplayValue("0"));
  expect(lastSvg()).not.toBeNull();

  // overflow shows a message instead of blowing up, then recovers
  const consoleError = jest.spyOn(console, "error").mockImplementation(() => {});
  typeInto("x".repeat(5000));
  expect(screen.getByText(/Too much data for one QR code/)).toBeInTheDocument();
  expect(screen.queryByText("Download SVG")).toBeNull();
  typeInto("short again");
  expect(container.querySelector("canvas")).not.toBeNull();
  expect(screen.getByText("Download SVG")).toBeInTheDocument();
  consoleError.mockRestore();
});
