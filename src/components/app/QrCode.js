import * as settings from "../../misc/Settings";

import React, { useRef, useState } from "react";

import Button from "../generic/Button";
import { ChromePicker } from "react-color";
import { QRCodeCanvas, QRCodeSVG } from "qrcode.react";
import RadioGroup from "../generic/RadioGroup";
import TextBlock from "../generic/TextBlockBefore";
import Textarea from "../generic/Textarea";
import copy from "copy-to-clipboard";
import styled from "styled-components";
import { toast } from "react-toastify";

const AVAIL_LEVELS = ["L", "M", "Q", "H"];
const AVAIL_SIZES = ["128", "256", "512", "1000", "2000"];
// The specification asks for a quiet zone of 4 modules, so it goes first and
// becomes the default one, the rest are here for tighter layouts
const AVAIL_MARGINS = ["4", "2", "1", "0"];
const PNG_FILE_NAME = "qrcode.png";
const SVG_FILE_NAME = "qrcode.svg";
const SVG_NAMESPACE = "http://www.w3.org/2000/svg";
// The renderer hardcodes the pixel size as an inline style, which would blow
// the layout apart on the big sizes, so the preview is scaled down by hand.
// Only the preview is affected, downloads still use the selected size
const PREVIEW_STYLE = { width: "auto", height: "auto", maxWidth: "100%" };
const OVERFLOW_MESSAGE =
  "Too much data for one QR code. Please shorten the input or pick a lower error correction level.";

const ControlLabel = styled.div`
  margin-bottom: 5px;
`;
const PickersBox = styled.div`
  display: flex;
  margin-bottom: 30px;

  & > div + div {
    margin-left: 30px;
  }

  @media (max-width: 450px) {
    flex-flow: column;

    & > div + div {
      margin-left: 0;
      margin-top: 30px;
    }
  }
`;
const OnePickerBox = styled.div`
  max-width: 100%;
`;
const ResultBox = styled.div`
  margin-top: 30px;
`;
const CanvasBox = styled.div`
  display: inline-block;
  padding: 10px;
  border: 2px solid ${settings.BLACK_COLOR};
  border-radius: ${settings.BORDER_RADIUS};
  background: ${settings.WHITE_COLOR};
  line-height: 0;
  max-width: 100%;
`;
const HiddenBox = styled.div`
  display: none;
`;
const ButtonsBox = styled.div`
  margin-top: 20px;

  & > button + button {
    margin-left: 10px;
  }

  @media (max-width: 450px) {
    display: flex;
    flex-flow: column;

    & > button + button {
      margin-left: 0;
      margin-top: 10px;
    }
  }
`;
const MessageBox = styled.p`
  margin-top: 30px;
`;

// A node living inside an html document is serialized without the namespace
// declaration, but a standalone .svg file is worthless without it
export function buildSvgMarkup(svgNode) {
  const markupString =
    typeof XMLSerializer === "function"
      ? new XMLSerializer().serializeToString(svgNode)
      : svgNode.outerHTML;
  if (markupString.indexOf("xmlns=") !== -1) {
    return markupString;
  }
  return markupString.replace("<svg", `<svg xmlns="${SVG_NAMESPACE}"`);
}

function saveFile(fileHref, fileName, onDone) {
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

class QrCodeErrorBoundary extends React.Component {
  constructor(props) {
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
  const [currentLevel, setLevel] = useState(AVAIL_LEVELS[0]);
  const [currentSize, setSize] = useState(AVAIL_SIZES[0]);
  const [currentMargin, setMargin] = useState(AVAIL_MARGINS[0]);
  const [foregroundColor, setForegroundColor] = useState(settings.BLACK_COLOR);
  const [backgroundColor, setBackgroundColor] = useState(settings.WHITE_COLOR);
  const [isQrBroken, setQrIsBroken] = useState(false);
  const canvasElement = useRef(null);
  const svgElement = useRef(null);

  const onQrInput = (event) => {
    const newValue = event.target.value;
    if (newValue !== inputValue) {
      setInput(newValue);
      setQrIsBroken(false);
    }
  };

  const makeSelectHandler = (setterFunction) => {
    return (event) => {
      setterFunction(event.target.value);
      setQrIsBroken(false);
    };
  };

  const makeColorHandler = (setterFunction) => {
    return (colorObject) => setterFunction(colorObject.hex);
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
            Big sizes affect the downloaded png only, the preview below is
            scaled down to fit the page, and svg is resolution independent
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
      <ControlLabel>Error correction level:</ControlLabel>
      <RadioGroup
        titleValues={AVAIL_LEVELS}
        onChange={makeSelectHandler(setLevel)}
        groupKey="qrlevel"
      />
      <ControlLabel>Image size:</ControlLabel>
      <RadioGroup
        titleValues={AVAIL_SIZES}
        onChange={makeSelectHandler(setSize)}
        groupKey="qrsize"
      />
      <ControlLabel>Quiet zone, in modules:</ControlLabel>
      <RadioGroup
        titleValues={AVAIL_MARGINS}
        onChange={makeSelectHandler(setMargin)}
        groupKey="qrmargin"
      />
      <PickersBox>
        <OnePickerBox>
          <ControlLabel>Code color:</ControlLabel>
          <ChromePicker
            color={foregroundColor}
            onChange={makeColorHandler(setForegroundColor)}
            disableAlpha
          />
        </OnePickerBox>
        <OnePickerBox>
          <ControlLabel>Background color:</ControlLabel>
          <ChromePicker
            color={backgroundColor}
            onChange={makeColorHandler(setBackgroundColor)}
            disableAlpha
          />
        </OnePickerBox>
      </PickersBox>
      {inputValue ? (
        <ResultBox>
          <QrCodeErrorBoundary
            key={`${currentLevel}-${currentSize}-${currentMargin}-${inputValue}`}
            onError={() => setQrIsBroken(true)}
          >
            <CanvasBox>
              <QRCodeCanvas
                ref={canvasElement}
                style={PREVIEW_STYLE}
                {...commonQrProps}
              />
            </CanvasBox>
            <HiddenBox>
              <QRCodeSVG ref={svgElement} {...commonQrProps} />
            </HiddenBox>
          </QrCodeErrorBoundary>
          {isQrBroken ? (
            ""
          ) : (
            <ButtonsBox>
              <Button onClick={onDownloadPngClick}>Download PNG</Button>
              <Button onClick={onDownloadSvgClick}>Download SVG</Button>
              <Button onClick={onCopyDataUrlClick}>Copy as data url</Button>
            </ButtonsBox>
          )}
        </ResultBox>
      ) : (
        <MessageBox>Nothing to encode yet, type something above.</MessageBox>
      )}
    </>
  );
}
