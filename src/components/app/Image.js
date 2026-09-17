import * as settings from "../../misc/Settings";

import {
  INPUT_FILE_ACCEPT,
  buildOutputFileName,
  decodeImageFile,
  detectSupportedOutputFormats,
  encodePixels,
  findOutputFormat,
  pixelsToCanvas,
  renderPixels,
} from "../../misc/ImageCodecs";
import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  RESIZE_MODES,
  clampNumber,
  computeResizePlan,
  formatByteSize,
  normalizeCropRect,
  parseHexColor,
} from "../../misc/ImageProcessing";

import Button from "../generic/Button";
import TextBlock from "../generic/TextBlockBefore";
import styled from "styled-components";
import { toast } from "react-toastify";
import { useDropzone } from "react-dropzone";

const PREVIEW_MAX_SIDE = 460;
const RENDER_DELAY = 250;
const ASPECT_PRESETS = [
  { key: "free", title: "Free", ratio: null },
  { key: "1:1", title: "1:1", ratio: 1 },
  { key: "4:3", title: "4:3", ratio: 4 / 3 },
  { key: "3:2", title: "3:2", ratio: 3 / 2 },
  { key: "16:9", title: "16:9", ratio: 16 / 9 },
];
const SCALE_PRESETS = [100, 75, 50, 33, 25];

const DropBox = styled.div`
  border: 2px dashed ${settings.BLACK_COLOR};
  border-radius: ${settings.BORDER_RADIUS};
  padding: 30px;
  text-align: center;
  cursor: pointer;
  margin-bottom: 30px;
  transition: background 0.2s;
  background: ${(props) =>
    props.isActive ? settings.LIGHT_GREEN_COLOR : "transparent"};
`;
const SettingsBox = styled.div`
  display: flex;
  flex-wrap: wrap;
  margin: 0 -15px;
`;
const OneColumn = styled.div`
  flex: 1 1 320px;
  padding: 0 15px;
  margin-bottom: 30px;
  min-width: 0;
`;
const ControlLabel = styled.div`
  margin-bottom: 5px;
  font-weight: bold;
`;
const ControlRow = styled.div`
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  margin-bottom: 15px;

  & > * + * {
    margin-left: 10px;
  }
`;
const NumberInput = styled.input`
  width: 110px;
  padding: 8px 10px;
  border: 2px solid ${settings.LIGHT_GREY_COLOR};
  border-radius: ${settings.BORDER_RADIUS};
  box-sizing: border-box;
`;
const SelectInput = styled.select`
  padding: 8px 10px;
  border: 2px solid ${settings.LIGHT_GREY_COLOR};
  border-radius: ${settings.BORDER_RADIUS};
  background: ${settings.WHITE_COLOR};
`;
const RangeInput = styled.input`
  width: 200px;
  max-width: 100%;
`;
const CheckLabel = styled.label`
  display: flex;
  align-items: center;
  margin-bottom: 10px;

  & > input {
    margin: 0 8px 0 0;
  }
`;
const FormatsBox = styled.div`
  display: flex;
  flex-wrap: wrap;
  margin-bottom: 10px;

  & > * {
    margin: 0 10px 10px 0;
  }
`;
const FormatButton = styled.button`
  padding: 8px 14px;
  border-radius: ${settings.BORDER_RADIUS};
  border: 2px solid
    ${(props) =>
      props.isActive ? settings.BLACK_COLOR : settings.LIGHT_GREY_COLOR};
  background: ${(props) =>
    props.isActive ? settings.LIGHT_GREEN_COLOR : settings.WHITE_COLOR};
  cursor: pointer;
  text-transform: uppercase;
  font-size: 80%;
`;
const CropBox = styled.div`
  position: relative;
  display: inline-block;
  line-height: 0;
  max-width: 100%;
  touch-action: none;
  user-select: none;
  border: 2px solid ${settings.BLACK_COLOR};
  border-radius: ${settings.BORDER_RADIUS};
  overflow: hidden;
  cursor: crosshair;
`;
const CropShade = styled.div`
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(4, 15, 22, 0.45);
  pointer-events: none;
`;
const CropWindow = styled.div`
  position: absolute;
  box-sizing: border-box;
  border: 2px solid ${settings.WHITE_COLOR};
  box-shadow: 0 0 0 1px ${settings.BLACK_COLOR};
  background: transparent;
  pointer-events: none;
`;
const ResultBox = styled.div`
  margin-top: 20px;
`;
const ResultImage = styled.img`
  max-width: 100%;
  border: 2px solid ${settings.BLACK_COLOR};
  border-radius: ${settings.BORDER_RADIUS};
`;
const ButtonsBox = styled.div`
  margin-top: 20px;

  & > button + button {
    margin-left: 10px;
  }
`;
const MessageBox = styled.p`
  margin-top: 20px;
`;
const InfoList = styled.ul`
  margin-top: 10px;
`;

function saveBlob(someBlob, fileName) {
  const objectUrl = URL.createObjectURL(someBlob);
  const linkElement = document.createElement("a");
  linkElement.href = objectUrl;
  linkElement.download = fileName;
  document.body.appendChild(linkElement);
  linkElement.click();
  document.body.removeChild(linkElement);
  URL.revokeObjectURL(objectUrl);
}

// Both the drawn selection and the numeric fields end up here, ratio is kept
// by moving the bottom right corner only
export function applyAspectRatio(
  cropRect,
  aspectRatio,
  sourceWidth,
  sourceHeight
) {
  if (!aspectRatio) {
    return normalizeCropRect(cropRect, sourceWidth, sourceHeight);
  }
  const safeRect = normalizeCropRect(cropRect, sourceWidth, sourceHeight);
  let nextWidth = safeRect.width;
  let nextHeight = Math.round(nextWidth / aspectRatio);
  if (nextHeight > sourceHeight - safeRect.top) {
    nextHeight = sourceHeight - safeRect.top;
    nextWidth = Math.round(nextHeight * aspectRatio);
  }
  if (nextWidth > sourceWidth - safeRect.left) {
    nextWidth = sourceWidth - safeRect.left;
    nextHeight = Math.round(nextWidth / aspectRatio);
  }
  return normalizeCropRect(
    {
      left: safeRect.left,
      top: safeRect.top,
      width: Math.max(1, nextWidth),
      height: Math.max(1, nextHeight),
    },
    sourceWidth,
    sourceHeight
  );
}

export default function ImageComponent() {
  const [sourceImage, setSourceImage] = useState(null);
  const [isBusy, setBusy] = useState(false);
  const [errorText, setErrorText] = useState("");
  const [formatKey, setFormatKey] = useState("png");
  const [qualityValue, setQuality] = useState(92);
  const [isDithered, setDithered] = useState(true);
  const [backgroundColor, setBackgroundColor] = useState(settings.WHITE_COLOR);
  const [isFlattened, setFlattened] = useState(false);
  const [resizeMode, setResizeMode] = useState(RESIZE_MODES[0].key);
  const [allowUpscale, setAllowUpscale] = useState(false);
  const [sizeInputs, setSizeInputs] = useState({ width: "", height: "" });
  const [isSizeTouched, setSizeTouched] = useState(false);
  const [cropRect, setCropRect] = useState(null);
  const [aspectKey, setAspectKey] = useState("free");
  const [resultData, setResultData] = useState(null);
  const previewCanvas = useRef(null);
  const cropBoxElement = useRef(null);
  const dragState = useRef(null);
  const resultUrl = useRef("");

  const supportedFormats = useMemo(() => detectSupportedOutputFormats(), []);
  const currentFormat = findOutputFormat(formatKey);
  const aspectRatio = (
    ASPECT_PRESETS.filter((onePreset) => onePreset.key === aspectKey)[0] ||
    ASPECT_PRESETS[0]
  ).ratio;

  const safeCropRect = useMemo(() => {
    if (!sourceImage) {
      return null;
    }
    return normalizeCropRect(cropRect, sourceImage.width, sourceImage.height);
  }, [cropRect, sourceImage]);

  const onDrop = useCallback(async (acceptedFiles) => {
    const oneFile = acceptedFiles[0];
    if (!oneFile) {
      return;
    }
    setBusy(true);
    setErrorText("");
    try {
      const decodedImage = await decodeImageFile(oneFile);
      setSourceImage((previousImage) => {
        if (previousImage) {
          previousImage.release();
        }
        return decodedImage;
      });
      setCropRect({
        left: 0,
        top: 0,
        width: decodedImage.width,
        height: decodedImage.height,
      });
      setAspectKey("free");
      setSizeTouched(false);
      setSizeInputs({
        width: String(decodedImage.width),
        height: String(decodedImage.height),
      });
    } catch (someError) {
      setSourceImage(null);
      setResultData(null);
      setErrorText(
        `${someError.message}. Try another file or convert it to png first.`
      );
    }
    setBusy(false);
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: INPUT_FILE_ACCEPT,
    multiple: false,
  });

  // The preview is only a scaled copy of the source, the crop math itself is
  // always done in the real pixels of the image
  const previewScale = useMemo(() => {
    if (!sourceImage) {
      return 1;
    }
    return Math.min(
      1,
      PREVIEW_MAX_SIDE / Math.max(sourceImage.width, sourceImage.height)
    );
  }, [sourceImage]);

  useEffect(() => {
    if (!sourceImage || !previewCanvas.current) {
      return;
    }
    const previewWidth = Math.max(
      1,
      Math.round(sourceImage.width * previewScale)
    );
    const previewHeight = Math.max(
      1,
      Math.round(sourceImage.height * previewScale)
    );
    const sourceCanvas = pixelsToCanvas(
      sourceImage.pixels,
      sourceImage.width,
      sourceImage.height
    );
    const targetCanvas = previewCanvas.current;
    targetCanvas.width = previewWidth;
    targetCanvas.height = previewHeight;
    const drawContext = targetCanvas.getContext("2d");
    drawContext.imageSmoothingEnabled = true;
    drawContext.imageSmoothingQuality = "high";
    drawContext.clearRect(0, 0, previewWidth, previewHeight);
    drawContext.drawImage(sourceCanvas, 0, 0, previewWidth, previewHeight);
  }, [sourceImage, previewScale]);

  useEffect(() => {
    if (!sourceImage || !safeCropRect || isSizeTouched) {
      return;
    }
    setSizeInputs({
      width: String(safeCropRect.width),
      height: String(safeCropRect.height),
    });
  }, [safeCropRect, sourceImage, isSizeTouched]);

  const renderPlan = useMemo(() => {
    if (!sourceImage || !safeCropRect) {
      return null;
    }
    const boxWidth = parseInt(sizeInputs.width, 10) || 0;
    const boxHeight = parseInt(sizeInputs.height, 10) || 0;
    const sizePlan = computeResizePlan({
      sourceWidth: safeCropRect.width,
      sourceHeight: safeCropRect.height,
      boxWidth,
      boxHeight,
      mode: resizeMode,
      allowUpscale,
    });
    return {
      width: sizePlan.width,
      height: sizePlan.height,
      cropRect: {
        left: safeCropRect.left + sizePlan.cropRect.left,
        top: safeCropRect.top + sizePlan.cropRect.top,
        width: sizePlan.cropRect.width,
        height: sizePlan.cropRect.height,
      },
    };
  }, [sourceImage, safeCropRect, sizeInputs, resizeMode, allowUpscale]);

  const needsBackground = isFlattened || currentFormat.hasAlpha === false;

  useEffect(() => {
    if (!sourceImage || !renderPlan) {
      return undefined;
    }
    let isDropped = false;
    setBusy(true);
    const delayTimer = setTimeout(async () => {
      try {
        const renderedImage = await renderPixels(sourceImage, {
          cropRect: renderPlan.cropRect,
          width: renderPlan.width,
          height: renderPlan.height,
          backgroundColor: needsBackground
            ? parseHexColor(backgroundColor)
            : null,
        });
        const resultBlob = await encodePixels(
          renderedImage.pixels,
          renderedImage.width,
          renderedImage.height,
          formatKey,
          { quality: qualityValue / 100, dither: isDithered }
        );
        if (isDropped) {
          return;
        }
        if (resultUrl.current) {
          URL.revokeObjectURL(resultUrl.current);
        }
        resultUrl.current = URL.createObjectURL(resultBlob);
        setResultData({
          blob: resultBlob,
          url: resultUrl.current,
          width: renderedImage.width,
          height: renderedImage.height,
        });
        setErrorText("");
      } catch (someError) {
        if (!isDropped) {
          setResultData(null);
          setErrorText(someError.message);
        }
      }
      if (!isDropped) {
        setBusy(false);
      }
    }, RENDER_DELAY);
    return () => {
      isDropped = true;
      clearTimeout(delayTimer);
    };
  }, [
    sourceImage,
    renderPlan,
    formatKey,
    qualityValue,
    isDithered,
    backgroundColor,
    needsBackground,
  ]);

  useEffect(() => {
    return () => {
      if (resultUrl.current) {
        URL.revokeObjectURL(resultUrl.current);
      }
    };
  }, []);

  const pointFromEvent = (someEvent) => {
    const boxRect = cropBoxElement.current.getBoundingClientRect();
    return {
      left: clampNumber(
        Math.round((someEvent.clientX - boxRect.left) / previewScale),
        0,
        sourceImage.width
      ),
      top: clampNumber(
        Math.round((someEvent.clientY - boxRect.top) / previewScale),
        0,
        sourceImage.height
      ),
    };
  };

  const onCropPointerDown = (someEvent) => {
    if (!sourceImage) {
      return;
    }
    const startPoint = pointFromEvent(someEvent);
    // While the whole image is selected there is nothing to move around, so
    // the drag always starts a new selection instead
    const isWholeImage =
      safeCropRect.width === sourceImage.width &&
      safeCropRect.height === sourceImage.height;
    const isInsideSelection =
      !isWholeImage &&
      startPoint.left >= safeCropRect.left &&
      startPoint.left <= safeCropRect.left + safeCropRect.width &&
      startPoint.top >= safeCropRect.top &&
      startPoint.top <= safeCropRect.top + safeCropRect.height;
    dragState.current = {
      startPoint,
      startRect: safeCropRect,
      isMoving: isInsideSelection,
    };
    if (
      someEvent.currentTarget.setPointerCapture &&
      someEvent.pointerId !== undefined
    ) {
      someEvent.currentTarget.setPointerCapture(someEvent.pointerId);
    }
  };

  const onCropPointerMove = (someEvent) => {
    if (!dragState.current || !sourceImage) {
      return;
    }
    const currentPoint = pointFromEvent(someEvent);
    const dragInfo = dragState.current;
    if (dragInfo.isMoving) {
      const leftShift = currentPoint.left - dragInfo.startPoint.left;
      const topShift = currentPoint.top - dragInfo.startPoint.top;
      setCropRect({
        left: clampNumber(
          dragInfo.startRect.left + leftShift,
          0,
          sourceImage.width - dragInfo.startRect.width
        ),
        top: clampNumber(
          dragInfo.startRect.top + topShift,
          0,
          sourceImage.height - dragInfo.startRect.height
        ),
        width: dragInfo.startRect.width,
        height: dragInfo.startRect.height,
      });
      return;
    }
    const drawnRect = {
      left: Math.min(dragInfo.startPoint.left, currentPoint.left),
      top: Math.min(dragInfo.startPoint.top, currentPoint.top),
      width: Math.abs(currentPoint.left - dragInfo.startPoint.left),
      height: Math.abs(currentPoint.top - dragInfo.startPoint.top),
    };
    if (drawnRect.width < 2 || drawnRect.height < 2) {
      return;
    }
    setCropRect(
      applyAspectRatio(
        drawnRect,
        aspectRatio,
        sourceImage.width,
        sourceImage.height
      )
    );
  };

  const onCropPointerUp = () => {
    dragState.current = null;
  };

  const onCropNumberChange = (fieldName) => (someEvent) => {
    const nextValue = parseInt(someEvent.target.value, 10);
    setCropRect(
      applyAspectRatio(
        Object.assign({}, safeCropRect, {
          [fieldName]: isNaN(nextValue) ? 1 : nextValue,
        }),
        fieldName === "width" || fieldName === "height" ? aspectRatio : null,
        sourceImage.width,
        sourceImage.height
      )
    );
  };

  const onAspectChange = (someEvent) => {
    const nextKey = someEvent.target.value;
    setAspectKey(nextKey);
    const nextRatio = (
      ASPECT_PRESETS.filter((onePreset) => onePreset.key === nextKey)[0] ||
      ASPECT_PRESETS[0]
    ).ratio;
    if (nextRatio && sourceImage) {
      setCropRect(
        applyAspectRatio(
          safeCropRect,
          nextRatio,
          sourceImage.width,
          sourceImage.height
        )
      );
    }
  };

  const onSizeChange = (fieldName) => (someEvent) => {
    setSizeTouched(true);
    setSizeInputs(
      Object.assign({}, sizeInputs, { [fieldName]: someEvent.target.value })
    );
  };

  const onScalePreset = (percentValue) => () => {
    setSizeTouched(true);
    setResizeMode("fit");
    setSizeInputs({
      width: String(
        Math.max(1, Math.round((safeCropRect.width * percentValue) / 100))
      ),
      height: String(
        Math.max(1, Math.round((safeCropRect.height * percentValue) / 100))
      ),
    });
  };

  const onResetCrop = () => {
    setAspectKey("free");
    setCropRect({
      left: 0,
      top: 0,
      width: sourceImage.width,
      height: sourceImage.height,
    });
    setSizeTouched(false);
  };

  const onDownloadClick = () => {
    if (!resultData) {
      return;
    }
    saveBlob(
      resultData.blob,
      buildOutputFileName(sourceImage.fileName, currentFormat)
    );
    toast("Saved!");
  };

  const cropWindowStyle = safeCropRect
    ? {
        left: `${safeCropRect.left * previewScale}px`,
        top: `${safeCropRect.top * previewScale}px`,
        width: `${safeCropRect.width * previewScale}px`,
        height: `${safeCropRect.height * previewScale}px`,
        boxShadow: `0 0 0 100vmax rgba(4, 15, 22, 0.45)`,
      }
    : {};

  return (
    <>
      <TextBlock>
        <p>
          Convert, resize and crop images right in the browser, nothing is ever
          uploaded anywhere.
        </p>
        <ul>
          <li>
            Reads png, jpeg, webp, avif, gif, bmp, ico, svg, tiff and heic from
            the phones
          </li>
          <li>
            Writes png, jpeg, webp, avif, tiff, bmp, gif and ico, the formats
            your browser cannot encode are hidden
          </li>
          <li>
            Resizing uses a gamma correct lanczos filter, so the result keeps
            the detail and the brightness of the original
          </li>
          <li>
            Every change is applied to the original pixels again, editing the
            same picture many times does not add any losses
          </li>
        </ul>
      </TextBlock>
      <DropBox {...getRootProps()} isActive={isDragActive}>
        <input {...getInputProps()} />
        {isDragActive ? (
          <p>Drop the image here...</p>
        ) : (
          <p>Drag an image here, or click to pick one</p>
        )}
      </DropBox>
      {errorText ? (
        <MessageBox className="dangerous">{errorText}</MessageBox>
      ) : (
        ""
      )}
      {!sourceImage ? (
        <MessageBox>
          {isBusy ? "Reading the image..." : "No image loaded yet."}
        </MessageBox>
      ) : (
        <>
          <SettingsBox>
            <OneColumn>
              <ControlLabel>Crop, drag right on the picture:</ControlLabel>
              <CropBox
                ref={cropBoxElement}
                onPointerDown={onCropPointerDown}
                onPointerMove={onCropPointerMove}
                onPointerUp={onCropPointerUp}
                onPointerLeave={onCropPointerUp}
              >
                <canvas ref={previewCanvas} />
                <CropShade />
                <CropWindow style={cropWindowStyle} />
              </CropBox>
              <ControlRow>
                <SelectInput value={aspectKey} onChange={onAspectChange}>
                  {ASPECT_PRESETS.map((onePreset) => (
                    <option key={onePreset.key} value={onePreset.key}>
                      {onePreset.title}
                    </option>
                  ))}
                </SelectInput>
                <Button small onClick={onResetCrop}>
                  Reset crop
                </Button>
              </ControlRow>
              <ControlRow>
                <NumberInput
                  type="number"
                  aria-label="Crop left"
                  value={safeCropRect.left}
                  onChange={onCropNumberChange("left")}
                />
                <NumberInput
                  type="number"
                  aria-label="Crop top"
                  value={safeCropRect.top}
                  onChange={onCropNumberChange("top")}
                />
              </ControlRow>
              <ControlRow>
                <NumberInput
                  type="number"
                  aria-label="Crop width"
                  value={safeCropRect.width}
                  onChange={onCropNumberChange("width")}
                />
                <NumberInput
                  type="number"
                  aria-label="Crop height"
                  value={safeCropRect.height}
                  onChange={onCropNumberChange("height")}
                />
              </ControlRow>
            </OneColumn>
            <OneColumn>
              <ControlLabel>Output format:</ControlLabel>
              <FormatsBox>
                {supportedFormats.map((oneFormat) => (
                  <FormatButton
                    key={oneFormat.key}
                    type="button"
                    isActive={oneFormat.key === formatKey}
                    onClick={() => setFormatKey(oneFormat.key)}
                  >
                    {oneFormat.title}
                  </FormatButton>
                ))}
              </FormatsBox>
              <p>{currentFormat.note}</p>
              {currentFormat.hasQuality ? (
                <ControlRow>
                  <RangeInput
                    type="range"
                    min="1"
                    max="100"
                    aria-label="Quality"
                    value={qualityValue}
                    onChange={(someEvent) =>
                      setQuality(parseInt(someEvent.target.value, 10))
                    }
                  />
                  <span>Quality: {qualityValue}</span>
                </ControlRow>
              ) : (
                ""
              )}
              {currentFormat.isPalette ? (
                <CheckLabel>
                  <input
                    type="checkbox"
                    checked={isDithered}
                    onChange={(someEvent) =>
                      setDithered(someEvent.target.checked)
                    }
                  />
                  Dither the colors
                </CheckLabel>
              ) : (
                ""
              )}
              <ControlLabel>Size:</ControlLabel>
              <ControlRow>
                <NumberInput
                  type="number"
                  aria-label="Output width"
                  value={sizeInputs.width}
                  onChange={onSizeChange("width")}
                />
                <NumberInput
                  type="number"
                  aria-label="Output height"
                  value={sizeInputs.height}
                  onChange={onSizeChange("height")}
                />
              </ControlRow>
              <ControlRow>
                <SelectInput
                  value={resizeMode}
                  aria-label="Resize mode"
                  onChange={(someEvent) =>
                    setResizeMode(someEvent.target.value)
                  }
                >
                  {RESIZE_MODES.map((oneMode) => (
                    <option key={oneMode.key} value={oneMode.key}>
                      {oneMode.title}
                    </option>
                  ))}
                </SelectInput>
              </ControlRow>
              <ControlRow>
                {SCALE_PRESETS.map((onePercent) => (
                  <Button
                    key={onePercent}
                    small
                    transparent
                    onClick={onScalePreset(onePercent)}
                  >
                    {onePercent}%
                  </Button>
                ))}
              </ControlRow>
              <CheckLabel>
                <input
                  type="checkbox"
                  checked={allowUpscale}
                  onChange={(someEvent) =>
                    setAllowUpscale(someEvent.target.checked)
                  }
                />
                Allow upscaling
              </CheckLabel>
              <CheckLabel>
                <input
                  type="checkbox"
                  checked={needsBackground}
                  disabled={currentFormat.hasAlpha === false}
                  onChange={(someEvent) =>
                    setFlattened(someEvent.target.checked)
                  }
                />
                Put the image on a solid background
              </CheckLabel>
              {needsBackground ? (
                <ControlRow>
                  <input
                    type="color"
                    aria-label="Background color"
                    value={backgroundColor}
                    onChange={(someEvent) =>
                      setBackgroundColor(someEvent.target.value)
                    }
                  />
                  <span>{backgroundColor}</span>
                </ControlRow>
              ) : (
                ""
              )}
            </OneColumn>
          </SettingsBox>
          <ResultBox>
            <ControlLabel>Result:</ControlLabel>
            {resultData ? (
              <>
                <ResultImage
                  src={resultData.url}
                  alt="Converted result"
                  style={
                    needsBackground
                      ? {}
                      : { background: settings.LIGHT_GREY_COLOR }
                  }
                />
                <InfoList className="typo">
                  <li>
                    Source: {sourceImage.formatTitle}, {sourceImage.width}x
                    {sourceImage.height}, {formatByteSize(sourceImage.fileSize)}
                  </li>
                  <li>
                    Result: {currentFormat.title}, {resultData.width}x
                    {resultData.height}, {formatByteSize(resultData.blob.size)}
                  </li>
                </InfoList>
                <ButtonsBox>
                  <Button onClick={onDownloadClick}>
                    Download {currentFormat.title}
                  </Button>
                </ButtonsBox>
              </>
            ) : (
              <MessageBox>
                {isBusy ? "Working on it..." : "Nothing to show yet."}
              </MessageBox>
            )}
            {isBusy && resultData ? (
              <MessageBox>Working on it...</MessageBox>
            ) : (
              ""
            )}
          </ResultBox>
        </>
      )}
    </>
  );
}
