import * as settings from "../../misc/Settings";

import {
  ActionsBox,
  DangerText,
  FieldBox,
  FieldLabel,
  HintText,
  Panel,
  PanelTitle,
  StickyColumn,
  ToolColumn,
  ToolGrid,
} from "../../misc/Controls.styles";
import React, { useRef, useState } from "react";
import { QRCodeCanvas, QRCodeSVG } from "qrcode.react";

import Button from "../generic/Button";
import ColorField from "../generic/ColorField";
import Segmented from "../generic/Segmented";
import TextBlock from "../generic/TextBlockBefore";
import Textarea from "../generic/Textarea";
import copy from "copy-to-clipboard";
import { parseHexColor } from "../../misc/ImageProcessing";
import styled from "styled-components";
import { toast } from "react-toastify";

const AVAIL_LEVELS = ["L", "M", "Q", "H"] as const;
type QrLevel = (typeof AVAIL_LEVELS)[number];
const AVAIL_SIZES = ["128", "256", "512", "1000", "2000"];
// The specification asks for a quiet zone of 4 modules, so it goes first and
// becomes the default one, the rest are here for tighter layouts
const AVAIL_MARGINS = ["4", "2", "1", "0"];
const LEVEL_NOTES: Record<QrLevel, string> = {
  L: "Recovers about 7% of a damaged code and holds the most data.",
  M: "Recovers about 15%, a good default for screens and print.",
  Q: "Recovers about 25%, survives a scratched or dirty sticker.",
  H: "Recovers about 30%, the best one for a logo on top, the least data.",
};
const PNG_FILE_NAME = "qrcode.png";
const SVG_FILE_NAME = "qrcode.svg";
const SVG_NAMESPACE = "http://www.w3.org/2000/svg";
// The renderer hardcodes the pixel size as an inline style, which would blow
// the layout apart on the big sizes, so the preview always fills its own box.
// Only the preview is affected, downloads still use the selected size
const PREVIEW_STYLE: React.CSSProperties = {
  width: "100%",
  height: "auto",
  display: "block",
  imageRendering: "pixelated",
};
const OVERFLOW_MESSAGE =
  "Too much data for one QR code. Please shorten the input or pick a lower error correction level.";
// Below this the dark modules stop standing out enough for a phone camera in
// a badly lit room
const LOW_CONTRAST_RATIO = 3;
const GOOD_CONTRAST_RATIO = 7;

const ColorsActions = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  margin-top: 15px;
`;
const PreviewFrame = styled.div`
  border: 2px solid ${settings.BLACK_COLOR};
  border-radius: ${settings.BORDER_RADIUS};
  padding: 12px;
  line-height: 0;
  box-sizing: border-box;
`;
const PreviewPlaceholder = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  text-align: center;
  min-height: 220px;
  padding: 20px;
  box-sizing: border-box;
  border: 2px dashed ${settings.LIGHT_GREY_COLOR};
  border-radius: ${settings.BORDER_RADIUS};
  color: ${settings.GREY_COLOR};
  font-size: 90%;
`;
const HiddenBox = styled.div`
  display: none;
`;
const MessageBox = styled.p`
  color: ${settings.RED_COLOR};
`;

// A node living inside an html document is serialized without the namespace
// declaration, but a standalone .svg file is worthless without it
export function buildSvgMarkup(svgNode: Element) {
  const markupString =
    typeof XMLSerializer === "function"
      ? new XMLSerializer().serializeToString(svgNode)
      : svgNode.outerHTML;
  if (markupString.indexOf("xmlns=") !== -1) {
    return markupString;
  }
  return markupString.replace("<svg", `<svg xmlns="${SVG_NAMESPACE}"`);
}

function channelLuminance(channelValue: number) {
  const plainValue = channelValue / 255;
  return plainValue <= 0.03928
    ? plainValue / 12.92
    : Math.pow((plainValue + 0.055) / 1.055, 2.4);
}

export function computeRelativeLuminance(hexValue: string) {
  const colorParts = parseHexColor(hexValue);
  return (
    0.2126 * channelLuminance(colorParts.red) +
    0.7152 * channelLuminance(colorParts.green) +
    0.0722 * channelLuminance(colorParts.blue)
  );
}

// The plain wcag ratio, a scanner cares about the very same thing a reader
// does: how far the two colors are from each other
export function computeContrastRatio(firstHex: string, secondHex: string) {
  const firstLuminance = computeRelativeLuminance(firstHex);
  const secondLuminance = computeRelativeLuminance(secondHex);
  const lightOne = Math.max(firstLuminance, secondLuminance);
  const darkOne = Math.min(firstLuminance, secondLuminance);
  return (lightOne + 0.05) / (darkOne + 0.05);
}

function saveFile(fileHref: string, fileName: string, onDone?: () => void) {
  const linkElement = document.createElement("a");
  linkElement.href = fileHref;
  linkElement.download = fileName;
  document.body.appendChild(linkElement);
  linkElement.click();
  document.body.removeChild(linkElement);
  if (onDone) {
    onDone();
  }
}

interface QrCodeErrorBoundaryProps {
  onError?: () => void;
  children?: React.ReactNode;
}

interface QrCodeErrorBoundaryState {
  isBroken: boolean;
}

class QrCodeErrorBoundary extends React.Component<
  QrCodeErrorBoundaryProps,
  QrCodeErrorBoundaryState
> {
  constructor(props: QrCodeErrorBoundaryProps) {
    super(props);
    this.state = { isBroken: false };
  }

  static getDerivedStateFromError() {
    return { isBroken: true };
  }

  componentDidCatch() {
    if (this.props.onError) {
      this.props.onError();
    }
  }

  render() {
    if (this.state.isBroken) {
      return <MessageBox className="dangerous">{OVERFLOW_MESSAGE}</MessageBox>;
    }
    return this.props.children;
  }
}

export default function QrCodeComponent() {
  const [inputValue, setInput] = useState("");
  const [currentLevel, setLevel] = useState<QrLevel>(AVAIL_LEVELS[0]);
  const [currentSize, setSize] = useState(AVAIL_SIZES[0]);
  const [currentMargin, setMargin] = useState(AVAIL_MARGINS[0]);
  const [foregroundColor, setForegroundColor] = useState(settings.BLACK_COLOR);
  const [backgroundColor, setBackgroundColor] = useState(settings.WHITE_COLOR);
  const [isQrBroken, setQrIsBroken] = useState(false);
  // Only one picker is unfolded at a time, two of them at once would push the
  // rest of the page way too far down
  const [openPickerKey, setOpenPickerKey] = useState("");
  const canvasElement = useRef<HTMLCanvasElement>(null);
  const svgElement = useRef<SVGSVGElement>(null);

  const onQrInput = (event: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newValue = event.target.value;
    if (newValue !== inputValue) {
      setInput(newValue);
      setQrIsBroken(false);
    }
  };

  const makeSelectHandler = <T extends string>(
    setterFunction: (nextValue: T) => void
  ) => {
    return (event: React.ChangeEvent<HTMLInputElement>) => {
      setterFunction(event.target.value as T);
      setQrIsBroken(false);
    };
  };

  const onSwapColors = () => {
    setForegroundColor(backgroundColor);
    setBackgroundColor(foregroundColor);
  };

  const onResetColors = () => {
    setForegroundColor(settings.BLACK_COLOR);
    setBackgroundColor(settings.WHITE_COLOR);
  };

  const getCurrentDataUrl = () => {
    return canvasElement.current
      ? canvasElement.current.toDataURL("image/png")
      : "";
  };

  const onDownloadPngClick = () => {
    const currentDataUrl = getCurrentDataUrl();
    if (currentDataUrl) {
      saveFile(currentDataUrl, PNG_FILE_NAME);
    }
  };

  const onDownloadSvgClick = () => {
    if (!svgElement.current) {
      return;
    }
    const objectUrl = URL.createObjectURL(
      new Blob([buildSvgMarkup(svgElement.current)], {
        type: "image/svg+xml;charset=utf-8",
      })
    );
    saveFile(objectUrl, SVG_FILE_NAME, () => URL.revokeObjectURL(objectUrl));
  };

  const onCopyDataUrlClick = () => {
    const currentDataUrl = getCurrentDataUrl();
    if (currentDataUrl) {
      copy(currentDataUrl);
      toast("Copied!");
    }
  };

  const commonQrProps = {
    value: inputValue,
    size: parseInt(currentSize, 10),
    level: currentLevel,
    marginSize: parseInt(currentMargin, 10),
    bgColor: backgroundColor,
    fgColor: foregroundColor,
  };
  const contrastRatio = computeContrastRatio(foregroundColor, backgroundColor);
  const isInverted =
    computeRelativeLuminance(foregroundColor) >
    computeRelativeLuminance(backgroundColor);
  const contrastText = `Contrast ${contrastRatio.toFixed(1)} to 1`;

  return (
    <>
      <TextBlock>
        <p>
          Type any text or url, tune the look of the code, then download it as
          png or svg, or copy it as a data url.
        </p>
        <ul>
          <li>L, M, Q and H are error correction levels (from 7% to 30%)</li>
          <li>Higher level means better scan tolerance, but less capacity</li>
          <li>
            The size is about the downloaded png only, the preview always fits
            its box and svg is resolution independent
          </li>
          <li>
            Keep enough contrast between the colors, otherwise scanners will
            give up on the code
          </li>
        </ul>
      </TextBlock>
      <Textarea
        label="Text or url"
        onChange={onQrInput}
        value={inputValue}
        wrapperClassName="inputgroup"
        small
      ></Textarea>
      <ToolGrid columns="minmax(0, 1fr) minmax(0, 280px)">
        <ToolColumn>
          <Panel>
            <PanelTitle>Code</PanelTitle>
            <FieldBox>
              <FieldLabel>Error correction level</FieldLabel>
              <Segmented
                titleValues={AVAIL_LEVELS}
                value={currentLevel}
                onChange={makeSelectHandler<QrLevel>(setLevel)}
                groupKey="qrlevel"
              />
              <HintText>{LEVEL_NOTES[currentLevel]}</HintText>
            </FieldBox>
            <FieldBox>
              <FieldLabel>Png size, px</FieldLabel>
              <Segmented
                titleValues={AVAIL_SIZES}
                value={currentSize}
                onChange={makeSelectHandler(setSize)}
                groupKey="qrsize"
              />
            </FieldBox>
            <FieldBox>
              <FieldLabel>Quiet zone, in modules</FieldLabel>
              <Segmented
                titleValues={AVAIL_MARGINS}
                value={currentMargin}
                onChange={makeSelectHandler(setMargin)}
                groupKey="qrmargin"
              />
            </FieldBox>
          </Panel>
          <Panel>
            <PanelTitle>Colors</PanelTitle>
            <FieldBox>
              <FieldLabel>Code</FieldLabel>
              <ColorField
                label="Code color"
                value={foregroundColor}
                onChange={setForegroundColor}
                isOpen={openPickerKey === "code"}
                onToggle={(isOpen) => setOpenPickerKey(isOpen ? "code" : "")}
              />
            </FieldBox>
            <FieldBox>
              <FieldLabel>Background</FieldLabel>
              <ColorField
                label="Background color"
                value={backgroundColor}
                onChange={setBackgroundColor}
                isOpen={openPickerKey === "background"}
                onToggle={(isOpen) =>
                  setOpenPickerKey(isOpen ? "background" : "")
                }
              />
            </FieldBox>
            <ColorsActions>
              <Button small ghost onClick={onSwapColors}>
                Swap
              </Button>
              <Button small ghost onClick={onResetColors}>
                Black and white
              </Button>
            </ColorsActions>
            {contrastRatio < LOW_CONTRAST_RATIO ? (
              <DangerText>
                {contrastText}, most scanners will fail on it.
              </DangerText>
            ) : isInverted ? (
              <DangerText>
                {contrastText}, but the code is lighter than the background and
                many scanners refuse to read inverted codes.
              </DangerText>
            ) : (
              <HintText>
                {contrastText}
                {contrastRatio < GOOD_CONTRAST_RATIO
                  ? ", readable, a darker code would be safer."
                  : ", plenty for any scanner."}
              </HintText>
            )}
          </Panel>
        </ToolColumn>
        <StickyColumn>
          {inputValue ? (
            <>
              <QrCodeErrorBoundary
                key={`${currentLevel}-${currentSize}-${currentMargin}-${inputValue}`}
                onError={() => setQrIsBroken(true)}
              >
                <PreviewFrame style={{ background: backgroundColor }}>
                  <QRCodeCanvas
                    ref={canvasElement}
                    style={PREVIEW_STYLE}
                    {...commonQrProps}
                  />
                </PreviewFrame>
                <HiddenBox>
                  <QRCodeSVG ref={svgElement} {...commonQrProps} />
                </HiddenBox>
              </QrCodeErrorBoundary>
              {isQrBroken ? (
                ""
              ) : (
                <>
                  <ActionsBox>
                    <Button onClick={onDownloadPngClick}>Download PNG</Button>
                    <Button onClick={onDownloadSvgClick}>Download SVG</Button>
                    <Button onClick={onCopyDataUrlClick}>
                      Copy as data url
                    </Button>
                  </ActionsBox>
                  <HintText>
                    Png {currentSize} by {currentSize} px, svg scales to any
                    size.
                  </HintText>
                </>
              )}
            </>
          ) : (
            <PreviewPlaceholder>
              Nothing to encode yet, type something above.
            </PreviewPlaceholder>
          )}
        </StickyColumn>
      </ToolGrid>
    </>
  );
}
