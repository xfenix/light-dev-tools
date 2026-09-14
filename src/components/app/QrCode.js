import * as settings from "../../misc/Settings";

import React, { useRef, useState } from "react";

import Button from "../generic/Button";
import { QRCodeCanvas } from "qrcode.react";
import RadioGroup from "../generic/RadioGroup";
import TextBlock from "../generic/TextBlockBefore";
import Textarea from "../generic/Textarea";
import copy from "copy-to-clipboard";
import styled from "styled-components";
import { toast } from "react-toastify";

const AVAIL_LEVELS = ["L", "M", "Q", "H"];
const AVAIL_SIZES = ["128", "256", "512"];
const QR_MARGIN_SIZE = 4;
const DOWNLOAD_FILE_NAME = "qrcode.png";
const OVERFLOW_MESSAGE =
  "Too much data for one QR code. Please shorten the input or pick a lower error correction level.";

const ControlLabel = styled.div`
  margin-bottom: 5px;
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
  overflow: auto;
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
  const [isQrBroken, setQrIsBroken] = useState(false);
  const canvasElement = useRef(null);

  const onQrInput = (event) => {
    const newValue = event.target.value;
    if (newValue !== inputValue) {
      setInput(newValue);
      setQrIsBroken(false);
    }
  };

  const onLevelSelect = (event) => {
    setLevel(event.target.value);
    setQrIsBroken(false);
  };

  const onSizeSelect = (event) => {
    setSize(event.target.value);
    setQrIsBroken(false);
  };

  const getCurrentDataUrl = () => {
    return canvasElement.current
      ? canvasElement.current.toDataURL("image/png")
      : "";
  };

  const onDownloadClick = () => {
    const currentDataUrl = getCurrentDataUrl();
    if (!currentDataUrl) {
      return;
    }
    const linkElement = document.createElement("a");
    linkElement.href = currentDataUrl;
    linkElement.download = DOWNLOAD_FILE_NAME;
    document.body.appendChild(linkElement);
    linkElement.click();
    document.body.removeChild(linkElement);
  };

  const onCopyDataUrlClick = () => {
    const currentDataUrl = getCurrentDataUrl();
    if (currentDataUrl) {
      copy(currentDataUrl);
      toast("Copied!");
    }
  };

  return (
    <>
      <TextBlock>
        <p>
          Type any text or url, pick error correction level and image size, then
          download the QR code or copy it as a data url.
        </p>
        <ul>
          <li>L, M, Q and H are error correction levels (from 7% to 30%)</li>
          <li>Higher level means better scan tolerance, but less capacity</li>
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
        onChange={onLevelSelect}
        groupKey="qrlevel"
      />
      <ControlLabel>Image size:</ControlLabel>
      <RadioGroup
        titleValues={AVAIL_SIZES}
        onChange={onSizeSelect}
        groupKey="qrsize"
      />
      {inputValue ? (
        <ResultBox>
          <QrCodeErrorBoundary
            key={`${currentLevel}-${currentSize}-${inputValue}`}
            onError={() => setQrIsBroken(true)}
          >
            <CanvasBox>
              <QRCodeCanvas
                ref={canvasElement}
                value={inputValue}
                size={parseInt(currentSize, 10)}
                level={currentLevel}
                marginSize={QR_MARGIN_SIZE}
                bgColor={settings.WHITE_COLOR}
                fgColor={settings.BLACK_COLOR}
              />
            </CanvasBox>
          </QrCodeErrorBoundary>
          {isQrBroken ? (
            ""
          ) : (
            <ButtonsBox>
              <Button onClick={onDownloadClick}>Download PNG</Button>
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
