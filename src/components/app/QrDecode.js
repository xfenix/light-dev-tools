import * as settings from "../../misc/Settings";

import {
  ControlRow,
  DangerText,
  HintText,
  Panel,
  PanelTitle,
  StickyColumn,
  ToolColumn,
  ToolGrid,
} from "../../misc/Controls.styles";
import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  INPUT_FILE_ACCEPT,
  decodeImageFile,
  pixelsToCanvas,
} from "../../misc/ImageCodecs";
import {
  describeFoundCode,
  describeQrPayload,
  loadQrReader,
  scanPixels,
} from "../../misc/QrScanning";

import Button from "../generic/Button";
import TextBlock from "../generic/TextBlockBefore";
import Textarea from "../generic/Textarea";
import { formatByteSize } from "../../misc/ImageProcessing";
import styled from "styled-components";
import { useDropzone } from "react-dropzone";

// The preview only has to show what was scanned and where the code was found,
// a bigger picture would just push the payload out of the first screen
const PREVIEW_MAX_SIDE = 340;
// Frames are scanned many times a second, so they are kept small on purpose,
// a code readable by a phone is readable at this size too
const CAMERA_MAX_SIDE = 640;
const CAMERA_FRAME_TITLE = "Camera frame";
const NO_CAMERA_MESSAGE =
  "This browser gives no access to a camera here. Https and a real camera are both needed, but a file still works.";
const CAMERA_DENIED_MESSAGE =
  "The camera was not given to the page. Allow it in the browser settings, or scan a file instead.";
const NOT_FOUND_MESSAGE = "No qr code found in this image.";
const OVERLAY_WIDTH = 3;
const CORNER_DOT_RADIUS = 4;

const DropBox = styled.div`
  border: 2px dashed
    ${(props) =>
      props.isActive ? settings.BLACK_COLOR : settings.LIGHT_GREY_COLOR};
  border-radius: ${settings.BORDER_RADIUS};
  padding: 30px;
  text-align: center;
  cursor: pointer;
  transition:
    background 0.2s,
    border-color 0.2s;
  background: ${(props) =>
    props.isActive ? settings.LIGHT_GREEN_COLOR : "transparent"};

  &:hover {
    border-color: ${settings.BLACK_COLOR};
  }
`;
// Once something has been scanned the drop area steps back into a single line
// with the facts about the source on it
const CompactDropBox = styled(DropBox)`
  display: flex;
  flex-wrap: wrap;
  align-items: baseline;
  gap: 5px 10px;
  text-align: left;
  padding: 12px 15px;
`;
const SourceName = styled.strong`
  font-weight: bold;
  word-break: break-all;
`;
const SourceMeta = styled.span`
  color: ${settings.GREY_COLOR};
  font-size: 90%;
`;
const ReplaceHint = styled.span`
  margin-left: auto;
  color: ${settings.GREY_COLOR};
  font-size: 85%;
  white-space: nowrap;
`;
const CameraRow = styled(ControlRow)`
  margin-top: 15px;
`;
const PreviewFrame = styled.div`
  border: 2px solid ${settings.BLACK_COLOR};
  border-radius: ${settings.BORDER_RADIUS};
  padding: 10px;
  line-height: 0;
  box-sizing: border-box;

  & > canvas,
  & > video {
    display: block;
    width: 100%;
    height: auto;
    border-radius: 4px;
  }
`;
const EmptyBox = styled.div`
  margin-top: 20px;
  padding: 30px;
  text-align: center;
  color: ${settings.GREY_COLOR};
  border: 2px dashed ${settings.LIGHT_GREY_COLOR};
  border-radius: ${settings.BORDER_RADIUS};
`;
const ErrorBox = styled(DangerText)`
  margin-top: 20px;
  font-size: 100%;
`;
const PayloadKind = styled.div`
  display: inline-block;
  padding: 3px 10px;
  margin-bottom: 15px;
  border-radius: ${settings.BORDER_RADIUS};
  background: ${settings.LIGHT_GREEN_COLOR};
  font-size: 85%;
  text-transform: uppercase;
  letter-spacing: 0.06em;
`;
const FactsList = styled.dl`
  display: grid;
  grid-template-columns: minmax(0, 140px) minmax(0, 1fr);
  gap: 8px 15px;
  font-size: 95%;

  & > dt {
    color: ${settings.GREY_COLOR};
  }

  & > dd {
    word-break: break-word;
  }
`;
const LinkRow = styled.p`
  margin-top: 15px;
  font-size: 95%;
`;
const OpenLink = styled.a`
  color: ${settings.BLACK_COLOR};
  word-break: break-all;
`;

// The camera gives whatever aspect it likes and the payload panel next to the
// preview should not jump around, so frames are boxed into a fixed side
export function computeFrameSize(sourceWidth, sourceHeight, maxSide) {
  const longestSide = Math.max(sourceWidth, sourceHeight) || 1;
  const usedScale = Math.min(1, maxSide / longestSide);
  return {
    width: Math.max(1, Math.round(sourceWidth * usedScale)),
    height: Math.max(1, Math.round(sourceHeight * usedScale)),
    scale: usedScale,
  };
}

export function buildSourceMeta(sourceImage) {
  const sizePart = `${sourceImage.width} by ${sourceImage.height}`;
  if (!sourceImage.fileSize) {
    return sizePart;
  }
  return `${sourceImage.formatTitle}, ${sizePart}, ${formatByteSize(
    sourceImage.fileSize,
  )}`;
}

export default function QrDecodeComponent() {
  const [sourceImage, setSourceImage] = useState(null);
  const [scanResult, setScanResult] = useState(null);
  const [isBusy, setBusy] = useState(false);
  const [errorText, setErrorText] = useState("");
  const [isCameraOn, setCameraOn] = useState(false);
  const [cameraError, setCameraError] = useState("");
  const previewCanvas = useRef(null);
  const videoElement = useRef(null);
  const cameraStream = useRef(null);
  const scanCounter = useRef(0);

  // A second file can be dropped while the first one is still being decoded,
  // only the last one is allowed to reach the state
  const handleImage = useCallback(async (someFile) => {
    scanCounter.current += 1;
    const scanNumber = scanCounter.current;
    setBusy(true);
    setErrorText("");
    try {
      const decodedImage = await decodeImageFile(someFile);
      const readablePart = {
        pixels: decodedImage.pixels,
        width: decodedImage.width,
        height: decodedImage.height,
        title: decodedImage.fileName,
        formatTitle: decodedImage.formatTitle,
        fileSize: decodedImage.fileSize,
      };
      decodedImage.release();
      const foundCode = await scanPixels(
        readablePart.pixels,
        readablePart.width,
        readablePart.height,
      );
      if (scanNumber !== scanCounter.current) {
        return;
      }
      setSourceImage(readablePart);
      setScanResult(foundCode);
    } catch (someError) {
      if (scanNumber !== scanCounter.current) {
        return;
      }
      setSourceImage(null);
      setScanResult(null);
      setErrorText(`${someError.message}. Try another file.`);
    }
    if (scanNumber === scanCounter.current) {
      setBusy(false);
    }
  }, []);

  const onDrop = useCallback(
    (acceptedFiles) => {
      if (acceptedFiles[0]) {
        handleImage(acceptedFiles[0]);
      }
    },
    [handleImage],
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: INPUT_FILE_ACCEPT,
    multiple: false,
  });

  // A screenshot of a code usually lives in the clipboard and nowhere else,
  // so pasting it right into the page saves a trip through the disk
  useEffect(() => {
    const onPaste = (someEvent) => {
      const allItems = someEvent.clipboardData
        ? Array.prototype.slice.call(someEvent.clipboardData.items || [])
        : [];
      const imageItem = allItems.filter((oneItem) => {
        return oneItem.kind === "file" && oneItem.type.indexOf("image/") === 0;
      })[0];
      if (!imageItem) {
        return;
      }
      const pastedFile = imageItem.getAsFile();
      if (pastedFile) {
        someEvent.preventDefault();
        handleImage(pastedFile);
      }
    };
    window.addEventListener("paste", onPaste);
    return () => window.removeEventListener("paste", onPaste);
  }, [handleImage]);

  const stopCamera = useCallback(() => {
    if (cameraStream.current) {
      cameraStream.current.getTracks().forEach((oneTrack) => oneTrack.stop());
      cameraStream.current = null;
    }
    setCameraOn(false);
  }, []);

  const onStartCameraClick = async () => {
    setCameraError("");
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      setCameraError(NO_CAMERA_MESSAGE);
      return;
    }
    try {
      cameraStream.current = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment" },
      });
      setCameraOn(true);
    } catch (someError) {
      cameraStream.current = null;
      setCameraError(CAMERA_DENIED_MESSAGE);
    }
  };

  // The loop lives as long as the camera does: every frame is drawn small,
  // read, and thrown away, the first frame with a code in it wins and the
  // camera is released right there
  useEffect(() => {
    if (!isCameraOn) {
      return undefined;
    }
    let isStopped = false;
    let frameRequest = 0;
    const workCanvas = document.createElement("canvas");
    const startLoop = async () => {
      const readQrCode = await loadQrReader();
      if (isStopped) {
        return;
      }
      const videoNode = videoElement.current;
      if (videoNode && cameraStream.current) {
        videoNode.srcObject = cameraStream.current;
        const playPromise = videoNode.play();
        if (playPromise && playPromise.catch) {
          playPromise.catch(() => {});
        }
      }
      const readOneFrame = () => {
        if (isStopped) {
          return;
        }
        const currentVideo = videoElement.current;
        if (currentVideo && currentVideo.videoWidth) {
          const frameSize = computeFrameSize(
            currentVideo.videoWidth,
            currentVideo.videoHeight,
            CAMERA_MAX_SIDE,
          );
          workCanvas.width = frameSize.width;
          workCanvas.height = frameSize.height;
          const drawContext = workCanvas.getContext("2d");
          drawContext.drawImage(
            currentVideo,
            0,
            0,
            frameSize.width,
            frameSize.height,
          );
          const frameData = drawContext.getImageData(
            0,
            0,
            frameSize.width,
            frameSize.height,
          );
          const foundCode = readQrCode(
            frameData.data,
            frameSize.width,
            frameSize.height,
            { inversionAttempts: "attemptBoth" },
          );
          if (foundCode) {
            isStopped = true;
            setSourceImage({
              pixels: frameData.data,
              width: frameSize.width,
              height: frameSize.height,
              title: CAMERA_FRAME_TITLE,
            });
            setScanResult(describeFoundCode(foundCode, 1));
            setErrorText("");
            stopCamera();
            return;
          }
        }
        frameRequest = window.requestAnimationFrame(readOneFrame);
      };
      readOneFrame();
    };
    startLoop();
    return () => {
      isStopped = true;
      if (frameRequest) {
        window.cancelAnimationFrame(frameRequest);
      }
    };
  }, [isCameraOn, stopCamera]);

  useEffect(() => stopCamera, [stopCamera]);

  // The scanned picture with the found code outlined on top of it
  useEffect(() => {
    if (!sourceImage || !previewCanvas.current) {
      return;
    }
    const frameSize = computeFrameSize(
      sourceImage.width,
      sourceImage.height,
      PREVIEW_MAX_SIDE,
    );
    const sourceCanvas = pixelsToCanvas(
      sourceImage.pixels,
      sourceImage.width,
      sourceImage.height,
    );
    const targetCanvas = previewCanvas.current;
    targetCanvas.width = frameSize.width;
    targetCanvas.height = frameSize.height;
    const drawContext = targetCanvas.getContext("2d");
    drawContext.imageSmoothingEnabled = true;
    drawContext.imageSmoothingQuality = "high";
    drawContext.clearRect(0, 0, frameSize.width, frameSize.height);
    drawContext.drawImage(
      sourceCanvas,
      0,
      0,
      frameSize.width,
      frameSize.height,
    );
    const allCorners = scanResult ? scanResult.corners : [];
    if (allCorners.length) {
      drawContext.strokeStyle = settings.RED_COLOR;
      drawContext.fillStyle = settings.RED_COLOR;
      drawContext.lineWidth = OVERLAY_WIDTH;
      drawContext.beginPath();
      allCorners.forEach((oneCorner, cornerIndex) => {
        const pointX = oneCorner.x * frameSize.scale;
        const pointY = oneCorner.y * frameSize.scale;
        if (cornerIndex === 0) {
          drawContext.moveTo(pointX, pointY);
        } else {
          drawContext.lineTo(pointX, pointY);
        }
      });
      drawContext.closePath();
      drawContext.stroke();
      allCorners.forEach((oneCorner) => {
        drawContext.beginPath();
        drawContext.arc(
          oneCorner.x * frameSize.scale,
          oneCorner.y * frameSize.scale,
          CORNER_DOT_RADIUS,
          0,
          Math.PI * 2,
        );
        drawContext.fill();
      });
    }
  }, [sourceImage, scanResult]);

  const payloadDetails = scanResult ? describeQrPayload(scanResult.text) : null;

  return (
    <>
      <TextBlock>
        <p>
          Drop a picture of a qr code here, paste a screenshot with ctrl+v, or
          point a camera at the code, and the payload is pulled out of it right
          in the browser.
        </p>
        <ul>
          <li>
            Png, jpeg, webp, gif, bmp, tiff, heic, avif and svg are all read
          </li>
          <li>Blurry photos and codes printed light on dark are tried too</li>
          <li>
            Wi-Fi, contact, calendar, link and one time password payloads are
            unpacked into their fields
          </li>
          <li>Nothing leaves the page, no file is ever uploaded anywhere</li>
        </ul>
      </TextBlock>
      {sourceImage ? (
        <CompactDropBox {...getRootProps()} isActive={isDragActive}>
          <input {...getInputProps()} />
          <SourceName>{sourceImage.title}</SourceName>
          <SourceMeta>{buildSourceMeta(sourceImage)}</SourceMeta>
          <ReplaceHint>
            {isBusy
              ? "Reading..."
              : isDragActive
                ? "Drop to replace..."
                : "Click to replace"}
          </ReplaceHint>
        </CompactDropBox>
      ) : (
        <DropBox {...getRootProps()} isActive={isDragActive}>
          <input {...getInputProps()} />
          {isDragActive ? (
            <p>Drop the image here...</p>
          ) : (
            <p>Drag an image here, or click to pick one</p>
          )}
        </DropBox>
      )}
      <CameraRow>
        {isCameraOn ? (
          <Button ghost small onClick={stopCamera}>
            Stop camera
          </Button>
        ) : (
          <Button ghost small onClick={onStartCameraClick}>
            Scan with camera
          </Button>
        )}
        <SourceMeta>
          {isCameraOn
            ? "Hold the code in front of the camera, it stops on the first one found."
            : "A screenshot from the clipboard works as well, just paste it."}
        </SourceMeta>
      </CameraRow>
      {cameraError ? <ErrorBox>{cameraError}</ErrorBox> : ""}
      {errorText ? <ErrorBox>{errorText}</ErrorBox> : ""}
      {isCameraOn ? (
        <ToolGrid columns="minmax(0, 360px) minmax(0, 1fr)">
          <ToolColumn>
            <PreviewFrame>
              <video ref={videoElement} muted playsInline />
            </PreviewFrame>
          </ToolColumn>
          <ToolColumn>
            <HintText>Looking for a code...</HintText>
          </ToolColumn>
        </ToolGrid>
      ) : !sourceImage ? (
        <EmptyBox>
          {isBusy ? "Reading the image..." : "Nothing scanned yet."}
        </EmptyBox>
      ) : (
        <ToolGrid columns="minmax(0, 360px) minmax(0, 1fr)">
          <StickyColumn>
            <PreviewFrame>
              <canvas ref={previewCanvas} />
            </PreviewFrame>
            <HintText>
              {scanResult
                ? "The found code is outlined in red."
                : "Nothing was found on this one."}
            </HintText>
          </StickyColumn>
          <ToolColumn>
            {scanResult ? (
              <>
                <Panel>
                  <PanelTitle>Payload</PanelTitle>
                  <PayloadKind>{payloadDetails.kind}</PayloadKind>
                  <Textarea
                    value={scanResult.text}
                    readOnly
                    medium
                    hasClipboardButton
                    compactClipboardButton
                    notHasResetButton
                  />
                  {payloadDetails.isSecret ? (
                    <DangerText>
                      This code carries a one time password secret, treat it
                      like a password.
                    </DangerText>
                  ) : (
                    ""
                  )}
                  {payloadDetails.linkUrl ? (
                    <LinkRow>
                      <OpenLink
                        href={payloadDetails.linkUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        Open {payloadDetails.linkUrl}
                      </OpenLink>
                    </LinkRow>
                  ) : (
                    ""
                  )}
                  {payloadDetails.isInsecure ? (
                    <DangerText>
                      The link is a plain http one, check where it leads before
                      opening it.
                    </DangerText>
                  ) : (
                    ""
                  )}
                </Panel>
                {payloadDetails.fields.length ? (
                  <Panel>
                    <PanelTitle>Inside the payload</PanelTitle>
                    <FactsList>
                      {payloadDetails.fields.map((oneField) => (
                        <React.Fragment key={oneField.label}>
                          <dt>{oneField.label}</dt>
                          <dd>{oneField.value}</dd>
                        </React.Fragment>
                      ))}
                    </FactsList>
                  </Panel>
                ) : (
                  ""
                )}
                <Panel>
                  <PanelTitle>The code itself</PanelTitle>
                  <FactsList>
                    <dt>Version</dt>
                    <dd>
                      {scanResult.version}, {scanResult.moduleCount} by{" "}
                      {scanResult.moduleCount} modules
                    </dd>
                    <dt>Data</dt>
                    <dd>{scanResult.byteLength} bytes</dd>
                    {scanResult.modes.length ? (
                      <>
                        <dt>Encoding</dt>
                        <dd>{scanResult.modes.join(", ")}</dd>
                      </>
                    ) : (
                      ""
                    )}
                  </FactsList>
                </Panel>
              </>
            ) : (
              <Panel>
                <PanelTitle>Nothing found</PanelTitle>
                <DangerText>{NOT_FOUND_MESSAGE}</DangerText>
                <HintText>
                  Crop the picture closer to the code, keep the whole code with
                  its white border inside the frame, and avoid glare and steep
                  angles.
                </HintText>
              </Panel>
            )}
          </ToolColumn>
        </ToolGrid>
      )}
    </>
  );
}
