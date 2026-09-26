import * as settings from "../../misc/Settings";

import {
  CheckLabel,
  ControlRow,
  DangerText,
  FieldBox,
  FieldLabel,
  FieldsPair,
  HintText,
  NumberInput,
  Panel,
  PanelTitle,
  SelectInput,
  StickyColumn,
  ToolColumn,
  ToolGrid,
} from "../../misc/Controls.styles";
import {
  CropRect,
  RESIZE_MODES,
  ResizeMode,
  clampNumber,
  computeResizePlan,
  formatByteSize,
  normalizeCropRect,
  parseHexColor,
} from "../../misc/ImageProcessing";
import {
  INPUT_FILE_ACCEPT,
  SourceImage,
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
import { ToastContainer, toast } from "react-toastify";

import Button from "../generic/Button";
import TextBlock from "../generic/TextBlockBefore";
import styled from "styled-components";
import { useDropzone } from "react-dropzone";

const PREVIEW_MAX_SIDE = 460;
const RENDER_DELAY = 250;
const ASPECT_PRESETS: ReadonlyArray<{
  key: string;
  title: string;
  ratio: number | null;
}> = [
  { key: "free", title: "Free", ratio: null },
  { key: "1:1", title: "1:1", ratio: 1 },
  { key: "4:3", title: "4:3", ratio: 4 / 3 },
  { key: "3:2", title: "3:2", ratio: 3 / 2 },
  { key: "16:9", title: "16:9", ratio: 16 / 9 },
];
const SCALE_PRESETS = [100, 75, 50, 33, 25];
// How close to an edge of the selection the pointer has to be to grab it,
// measured on the screen and converted to the pixels of the image later
const HANDLE_GRAB_SIZE = 14;
const CROP_HANDLES = ["nw", "n", "ne", "e", "se", "s", "sw", "w"] as const;
type CropHandleKey = (typeof CROP_HANDLES)[number];
const HANDLE_CURSORS: Record<CropHandleKey, string> = {
  nw: "nwse-resize",
  se: "nwse-resize",
  ne: "nesw-resize",
  sw: "nesw-resize",
  n: "ns-resize",
  s: "ns-resize",
  e: "ew-resize",
  w: "ew-resize",
};
const HANDLE_OFFSETS: Record<CropHandleKey, React.CSSProperties> = {
  nw: { left: "0%", top: "0%" },
  n: { left: "50%", top: "0%" },
  ne: { left: "100%", top: "0%" },
  e: { left: "100%", top: "50%" },
  se: { left: "100%", top: "100%" },
  s: { left: "50%", top: "100%" },
  sw: { left: "0%", top: "100%" },
  w: { left: "0%", top: "50%" },
};
// The alpha of the result has to be visible, a flat color would lie about the
// transparent parts of the picture
const CHECKER_BACKGROUND = `
  linear-gradient(45deg, ${settings.LIGHT_GREY_COLOR} 25%, transparent 25%),
  linear-gradient(-45deg, ${settings.LIGHT_GREY_COLOR} 25%, transparent 25%),
  linear-gradient(45deg, transparent 75%, ${settings.LIGHT_GREY_COLOR} 75%),
  linear-gradient(-45deg, transparent 75%, ${settings.LIGHT_GREY_COLOR} 75%)
`;

interface CropPoint {
  left: number;
  top: number;
}

interface DragState {
  startPoint: CropPoint;
  startRect: CropRect;
  handleKey: CropHandleKey | "";
  isMoving: boolean;
}

interface ResultData {
  blob: Blob;
  url: string;
  width: number;
  height: number;
  fileName: string;
  formatTitle: string;
}

function describeError(someError: unknown) {
  return someError instanceof Error ? someError.message : String(someError);
}

const DropBox = styled.div<{ $isActive: boolean }>`
  border: 2px dashed
    ${(props) =>
      props.$isActive ? settings.BLACK_COLOR : settings.LIGHT_GREY_COLOR};
  border-radius: ${settings.BORDER_RADIUS};
  padding: 30px;
  text-align: center;
  cursor: pointer;
  transition: background 0.2s, border-color 0.2s;
  background: ${(props) =>
    props.$isActive ? settings.LIGHT_GREEN_COLOR : "transparent"};

  &:hover {
    border-color: ${settings.BLACK_COLOR};
  }
`;
// Once a picture is loaded the drop area is not the main thing on the page
// anymore, so it shrinks down to a single line with the source facts on it
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
const CropBox = styled.div`
  position: relative;
  display: block;
  width: fit-content;
  max-width: 100%;
  line-height: 0;
  touch-action: none;
  user-select: none;
  border: 2px solid ${settings.BLACK_COLOR};
  border-radius: ${settings.BORDER_RADIUS};
  overflow: hidden;

  & > canvas {
    display: block;
    max-width: 100%;
    height: auto;
  }
`;
// One single layer does the dimming, the huge spread shadow paints everything
// around the selection and the box above clips it
const CropWindow = styled.div`
  position: absolute;
  box-sizing: border-box;
  border: 1px solid ${settings.WHITE_COLOR};
  box-shadow: 0 0 0 1px rgba(4, 15, 22, 0.6),
    0 0 0 100vmax rgba(4, 15, 22, 0.45);
  background: transparent;
  pointer-events: none;
`;
const CropHandle = styled.div`
  position: absolute;
  width: 10px;
  height: 10px;
  margin: -5px 0 0 -5px;
  box-sizing: border-box;
  background: ${settings.WHITE_COLOR};
  border: 1px solid ${settings.BLACK_COLOR};
  border-radius: 2px;
`;
const FormatsBox = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
`;
const FormatButton = styled.button<{ $isActive: boolean }>`
  padding: 7px 14px;
  border-radius: ${settings.BORDER_RADIUS};
  border: 2px solid
    ${(props) =>
      props.$isActive ? settings.BLACK_COLOR : settings.LIGHT_GREY_COLOR};
  background: ${(props) =>
    props.$isActive ? settings.LIGHT_GREEN_COLOR : settings.WHITE_COLOR};
  font-family: inherit;
  font-size: 80%;
  text-transform: uppercase;
  cursor: pointer;
  transition: border-color 0.2s, background 0.2s;

  &:hover {
    border-color: ${settings.BLACK_COLOR};
  }
`;
const RangeInput = styled.input`
  flex: 1 1 140px;
  min-width: 0;
`;
const RangeValue = styled.span`
  flex: none;
  width: 42px;
  text-align: right;
  font-variant-numeric: tabular-nums;
`;
const ColorInput = styled.input`
  flex: none;
  width: 44px;
  height: 38px;
  padding: 2px;
  border: 2px solid ${settings.LIGHT_GREY_COLOR};
  border-radius: ${settings.BORDER_RADIUS};
  background: ${settings.WHITE_COLOR};
  cursor: pointer;
`;
const ResultFrame = styled.div<{ $isBusy: boolean }>`
  display: inline-block;
  max-width: 100%;
  line-height: 0;
  border: 2px solid ${settings.BLACK_COLOR};
  border-radius: ${settings.BORDER_RADIUS};
  overflow: hidden;
  background-image: ${CHECKER_BACKGROUND};
  background-size: 16px 16px;
  background-position: 0 0, 0 8px, 8px -8px, -8px 0px;
  transition: opacity 0.2s;
  opacity: ${(props) => (props.$isBusy ? 0.5 : 1)};
`;
const ResultImage = styled.img`
  display: block;
  max-width: 100%;
  height: auto;
`;
const ResultFacts = styled.dl`
  display: grid;
  grid-template-columns: auto minmax(0, 1fr);
  gap: 5px 15px;
  margin-top: 15px;
  font-size: 90%;

  & > dt {
    color: ${settings.GREY_COLOR};
  }
`;
const DeltaText = styled.span<{ $isSmaller: boolean }>`
  color: ${(props) =>
    props.$isSmaller ? settings.BLACK_COLOR : settings.RED_COLOR};
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
const ResultSection = styled.div`
  margin-top: 30px;
`;
const BusyMark = styled.span`
  color: ${settings.GREY_COLOR};
  font-weight: normal;
  text-transform: none;
  letter-spacing: 0;
`;

function saveBlob(someBlob: Blob, fileName: string) {
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
  cropRect: Partial<CropRect> | null,
  aspectRatio: number | null,
  sourceWidth: number,
  sourceHeight: number
): CropRect {
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

// A selection can be a couple of pixels wide, and then both of its edges are
// under the pointer at once, so the closer one takes the drag
function pickNearerEdge(
  pointValue: number,
  firstEdge: number,
  secondEdge: number,
  grabDistance: number
) {
  const firstDistance = Math.abs(pointValue - firstEdge);
  const secondDistance = Math.abs(pointValue - secondEdge);
  if (firstDistance > grabDistance && secondDistance > grabDistance) {
    return 0;
  }
  if (secondDistance > grabDistance) {
    return -1;
  }
  if (firstDistance > grabDistance) {
    return 1;
  }
  return firstDistance <= secondDistance ? -1 : 1;
}

// A corner wins over an edge, otherwise the tiny overlap between the two makes
// the corners almost impossible to catch
export function findCropHandle(
  somePoint: CropPoint,
  cropRect: CropRect,
  grabDistance: number
): CropHandleKey | "" {
  const insideRows =
    somePoint.top >= cropRect.top - grabDistance &&
    somePoint.top <= cropRect.top + cropRect.height + grabDistance;
  const insideColumns =
    somePoint.left >= cropRect.left - grabDistance &&
    somePoint.left <= cropRect.left + cropRect.width + grabDistance;
  if (!insideRows || !insideColumns) {
    return "";
  }
  const verticalSide = pickNearerEdge(
    somePoint.top,
    cropRect.top,
    cropRect.top + cropRect.height,
    grabDistance
  );
  const horizontalSide = pickNearerEdge(
    somePoint.left,
    cropRect.left,
    cropRect.left + cropRect.width,
    grabDistance
  );
  const verticalPart =
    verticalSide === -1 ? "n" : verticalSide === 1 ? "s" : "";
  const horizontalPart =
    horizontalSide === -1 ? "w" : horizontalSide === 1 ? "e" : "";
  return `${verticalPart}${horizontalPart}` as CropHandleKey | "";
}

// The ratio has to be kept without moving the edge the pointer is not holding:
// dragging the bottom of a locked selection has to grow it downwards only, and
// the side being dragged is the one that decides the new size
export function applyAspectToHandle(
  cropRect: CropRect,
  handleKey: string,
  aspectRatio: number | null,
  sourceWidth: number,
  sourceHeight: number
): CropRect {
  if (!aspectRatio) {
    return normalizeCropRect(cropRect, sourceWidth, sourceHeight);
  }
  const safeRect = normalizeCropRect(cropRect, sourceWidth, sourceHeight);
  const keepsRightEdge = handleKey.indexOf("w") !== -1;
  const keepsBottomEdge = handleKey.indexOf("n") !== -1;
  const rightEdge = safeRect.left + safeRect.width;
  const bottomEdge = safeRect.top + safeRect.height;
  const isVertical = handleKey === "n" || handleKey === "s";
  // room in the direction the selection is allowed to grow
  const roomWidth = keepsRightEdge ? rightEdge : sourceWidth - safeRect.left;
  const roomHeight = keepsBottomEdge ? bottomEdge : sourceHeight - safeRect.top;
  const wantedWidth = isVertical
    ? safeRect.height * aspectRatio
    : safeRect.width;
  const wantedHeight = isVertical
    ? safeRect.height
    : safeRect.width / aspectRatio;
  const sizeScale = Math.min(
    1,
    roomWidth / wantedWidth,
    roomHeight / wantedHeight
  );
  let nextWidth: number;
  let nextHeight: number;
  if (isVertical) {
    nextHeight = Math.max(1, Math.round(wantedHeight * sizeScale));
    nextWidth = Math.max(1, Math.round(nextHeight * aspectRatio));
  } else {
    nextWidth = Math.max(1, Math.round(wantedWidth * sizeScale));
    nextHeight = Math.max(1, Math.round(nextWidth / aspectRatio));
  }
  // rounding can add a pixel back, and a pixel is enough to push the kept edge
  nextWidth = Math.min(nextWidth, Math.max(1, Math.round(roomWidth)));
  nextHeight = Math.min(nextHeight, Math.max(1, Math.round(roomHeight)));
  return normalizeCropRect(
    {
      left: keepsRightEdge ? rightEdge - nextWidth : safeRect.left,
      top: keepsBottomEdge ? bottomEdge - nextHeight : safeRect.top,
      width: nextWidth,
      height: nextHeight,
    },
    sourceWidth,
    sourceHeight
  );
}

// Dragging a handle moves its own side only, the opposite one stays where the
// user put it
export function resizeCropRect(
  startRect: CropRect,
  handleKey: string,
  somePoint: CropPoint
): CropRect {
  let leftEdge = startRect.left;
  let topEdge = startRect.top;
  let rightEdge = startRect.left + startRect.width;
  let bottomEdge = startRect.top + startRect.height;
  if (handleKey.indexOf("w") !== -1) {
    leftEdge = Math.min(somePoint.left, rightEdge - 1);
  }
  if (handleKey.indexOf("e") !== -1) {
    rightEdge = Math.max(somePoint.left, leftEdge + 1);
  }
  if (handleKey.indexOf("n") !== -1) {
    topEdge = Math.min(somePoint.top, bottomEdge - 1);
  }
  if (handleKey.indexOf("s") !== -1) {
    bottomEdge = Math.max(somePoint.top, topEdge + 1);
  }
  return {
    left: leftEdge,
    top: topEdge,
    width: rightEdge - leftEdge,
    height: bottomEdge - topEdge,
  };
}

export default function ImageComponent() {
  const [sourceImage, setSourceImage] = useState<SourceImage | null>(null);
  const [isBusy, setBusy] = useState(false);
  const [errorText, setErrorText] = useState("");
  const [formatKey, setFormatKey] = useState("png");
  const [qualityValue, setQuality] = useState(92);
  const [isDithered, setDithered] = useState(true);
  const [backgroundColor, setBackgroundColor] = useState(settings.WHITE_COLOR);
  const [isFlattened, setFlattened] = useState(false);
  const [resizeMode, setResizeMode] = useState<ResizeMode>(RESIZE_MODES[0].key);
  const [allowUpscale, setAllowUpscale] = useState(false);
  const [sizeInputs, setSizeInputs] = useState({ width: "", height: "" });
  const [isSizeTouched, setSizeTouched] = useState(false);
  const [cropRect, setCropRect] = useState<CropRect | null>(null);
  const [aspectKey, setAspectKey] = useState("free");
  const [cropCursor, setCropCursor] = useState("crosshair");
  const [resultData, setResultData] = useState<ResultData | null>(null);
  const previewCanvas = useRef<HTMLCanvasElement>(null);
  const cropBoxElement = useRef<HTMLDivElement>(null);
  const dragState = useRef<DragState | null>(null);
  const resultUrl = useRef("");
  const dropCounter = useRef(0);
  const liveSource = useRef<SourceImage | null>(null);

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

  // Decoding is asynchronous and a second file can be dropped while the first
  // one is still being read, so only the last drop is allowed to win
  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    const oneFile = acceptedFiles[0];
    if (!oneFile) {
      return;
    }
    dropCounter.current += 1;
    const dropNumber = dropCounter.current;
    setBusy(true);
    setErrorText("");
    try {
      const decodedImage = await decodeImageFile(oneFile);
      if (dropNumber !== dropCounter.current) {
        decodedImage.release();
        return;
      }
      if (liveSource.current) {
        liveSource.current.release();
      }
      liveSource.current = decodedImage;
      setSourceImage(decodedImage);
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
      if (dropNumber !== dropCounter.current) {
        return;
      }
      if (liveSource.current) {
        liveSource.current.release();
        liveSource.current = null;
      }
      setSourceImage(null);
      setResultData(null);
      setErrorText(
        `${describeError(
          someError
        )}. Try another file or convert it to png first.`
      );
    }
    if (dropNumber === dropCounter.current) {
      setBusy(false);
    }
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
    if (!drawContext) {
      return;
    }
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
          // the name and the format travel with the blob, otherwise a download
          // during the next render would save the old picture under a new
          // extension
          fileName: buildOutputFileName(
            sourceImage.fileName,
            findOutputFormat(formatKey)
          ),
          formatTitle: findOutputFormat(formatKey).title,
        });
        setErrorText("");
      } catch (someError) {
        if (!isDropped) {
          setResultData(null);
          setErrorText(describeError(someError));
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
      if (liveSource.current) {
        liveSource.current.release();
        liveSource.current = null;
      }
    };
  }, []);

  // The canvas is free to shrink with the column around it, so the pixels are
  // always measured against its real rendered size
  const pointFromEvent = (
    someEvent: React.PointerEvent,
    canvasNode: HTMLCanvasElement,
    activeImage: SourceImage
  ): CropPoint => {
    const canvasRect = canvasNode.getBoundingClientRect();
    const widthScale = canvasRect.width
      ? canvasRect.width / activeImage.width
      : 1;
    const heightScale = canvasRect.height
      ? canvasRect.height / activeImage.height
      : 1;
    return {
      left: clampNumber(
        Math.round((someEvent.clientX - canvasRect.left) / widthScale),
        0,
        activeImage.width
      ),
      top: clampNumber(
        Math.round((someEvent.clientY - canvasRect.top) / heightScale),
        0,
        activeImage.height
      ),
    };
  };

  const grabDistanceInPixels = (
    canvasNode: HTMLCanvasElement,
    activeImage: SourceImage
  ) => {
    const canvasRect = canvasNode.getBoundingClientRect();
    const renderedScale = canvasRect.width
      ? canvasRect.width / activeImage.width
      : 1;
    return HANDLE_GRAB_SIZE / Math.max(renderedScale, 0.0001);
  };

  const isInsideCrop = (somePoint: CropPoint, someRect: CropRect) =>
    somePoint.left >= someRect.left &&
    somePoint.left <= someRect.left + someRect.width &&
    somePoint.top >= someRect.top &&
    somePoint.top <= someRect.top + someRect.height;

  const onCropPointerDown = (someEvent: React.PointerEvent) => {
    const canvasNode = previewCanvas.current;
    if (!sourceImage || !safeCropRect || !canvasNode) {
      return;
    }
    const startPoint = pointFromEvent(someEvent, canvasNode, sourceImage);
    const handleKey = findCropHandle(
      startPoint,
      safeCropRect,
      grabDistanceInPixels(canvasNode, sourceImage)
    );
    // While the whole image is selected there is nothing to move around, so a
    // drag away from the handles starts a new selection instead
    const isWholeImage =
      safeCropRect.width === sourceImage.width &&
      safeCropRect.height === sourceImage.height;
    dragState.current = {
      startPoint,
      startRect: safeCropRect,
      handleKey,
      isMoving:
        !handleKey && !isWholeImage && isInsideCrop(startPoint, safeCropRect),
    };
    if (
      someEvent.currentTarget.setPointerCapture &&
      someEvent.pointerId !== undefined
    ) {
      someEvent.currentTarget.setPointerCapture(someEvent.pointerId);
    }
  };

  const onCropPointerMove = (someEvent: React.PointerEvent) => {
    const canvasNode = previewCanvas.current;
    if (!sourceImage || !safeCropRect || !canvasNode) {
      return;
    }
    const currentPoint = pointFromEvent(someEvent, canvasNode, sourceImage);
    const dragInfo = dragState.current;
    if (!dragInfo) {
      const hoverHandle = findCropHandle(
        currentPoint,
        safeCropRect,
        grabDistanceInPixels(canvasNode, sourceImage)
      );
      const nextCursor = hoverHandle
        ? HANDLE_CURSORS[hoverHandle]
        : isInsideCrop(currentPoint, safeCropRect)
        ? "move"
        : "crosshair";
      if (nextCursor !== cropCursor) {
        setCropCursor(nextCursor);
      }
      return;
    }
    if (dragInfo.handleKey) {
      setCropRect(
        applyAspectToHandle(
          resizeCropRect(dragInfo.startRect, dragInfo.handleKey, currentPoint),
          dragInfo.handleKey,
          aspectRatio,
          sourceImage.width,
          sourceImage.height
        )
      );
      return;
    }
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

  const onCropNumberChange =
    (fieldName: keyof CropRect) =>
    (someEvent: React.ChangeEvent<HTMLInputElement>) => {
      if (!sourceImage) {
        return;
      }
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

  const onAspectChange = (someEvent: React.ChangeEvent<HTMLSelectElement>) => {
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

  const onSizeChange =
    (fieldName: "width" | "height") =>
    (someEvent: React.ChangeEvent<HTMLInputElement>) => {
      setSizeTouched(true);
      setSizeInputs(
        Object.assign({}, sizeInputs, { [fieldName]: someEvent.target.value })
      );
    };

  const onScalePreset = (percentValue: number) => () => {
    if (!safeCropRect) {
      return;
    }
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
    if (!sourceImage) {
      return;
    }
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
    saveBlob(resultData.blob, resultData.fileName);
    toast("Saved!");
  };

  // Percents instead of pixels, this way the selection stays glued to the
  // picture even when the column squeezes the canvas below its own size
  const cropWindowStyle =
    safeCropRect && sourceImage
      ? {
          left: `${(safeCropRect.left / sourceImage.width) * 100}%`,
          top: `${(safeCropRect.top / sourceImage.height) * 100}%`,
          width: `${(safeCropRect.width / sourceImage.width) * 100}%`,
          height: `${(safeCropRect.height / sourceImage.height) * 100}%`,
        }
      : {};
  const sizeDelta =
    resultData && sourceImage && sourceImage.fileSize
      ? Math.round((resultData.blob.size / sourceImage.fileSize - 1) * 100)
      : null;

  return (
    <>
      <ToastContainer autoClose={1000} closeOnClick />
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
      {sourceImage ? (
        <CompactDropBox {...getRootProps()} $isActive={isDragActive}>
          <input {...getInputProps()} />
          <SourceName>{sourceImage.fileName}</SourceName>
          <SourceMeta>
            {sourceImage.formatTitle}, {sourceImage.width} by{" "}
            {sourceImage.height}, {formatByteSize(sourceImage.fileSize)}
          </SourceMeta>
          <ReplaceHint>
            {isDragActive ? "Drop to replace..." : "Click to replace"}
          </ReplaceHint>
        </CompactDropBox>
      ) : (
        <DropBox {...getRootProps()} $isActive={isDragActive}>
          <input {...getInputProps()} />
          {isDragActive ? (
            <p>Drop the image here...</p>
          ) : (
            <p>Drag an image here, or click to pick one</p>
          )}
        </DropBox>
      )}
      {errorText ? <ErrorBox>{errorText}</ErrorBox> : ""}
      {!sourceImage || !safeCropRect ? (
        <EmptyBox>
          {isBusy ? "Reading the image..." : "No image loaded yet."}
        </EmptyBox>
      ) : (
        <>
          <ToolGrid columns="minmax(0, 360px) minmax(0, 1fr)">
            <StickyColumn>
              <Panel>
                <PanelTitle>
                  Crop, {safeCropRect.width} by {safeCropRect.height}
                </PanelTitle>
                <FieldBox>
                  <CropBox
                    ref={cropBoxElement}
                    style={{ cursor: cropCursor }}
                    onPointerDown={onCropPointerDown}
                    onPointerMove={onCropPointerMove}
                    onPointerUp={onCropPointerUp}
                    onPointerLeave={onCropPointerUp}
                  >
                    <canvas ref={previewCanvas} />
                    <CropWindow style={cropWindowStyle}>
                      {CROP_HANDLES.map((oneHandle) => (
                        <CropHandle
                          key={oneHandle}
                          style={HANDLE_OFFSETS[oneHandle]}
                        />
                      ))}
                    </CropWindow>
                  </CropBox>
                  <HintText>
                    Drag on the picture to select, pull the handles to adjust,
                    drag inside to move.
                  </HintText>
                </FieldBox>
                <FieldBox>
                  <ControlRow>
                    <SelectInput
                      value={aspectKey}
                      aria-label="Aspect ratio"
                      onChange={onAspectChange}
                    >
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
                </FieldBox>
                <FieldBox>
                  <FieldsPair>
                    <div>
                      <FieldLabel>Left, px</FieldLabel>
                      <NumberInput
                        type="number"
                        aria-label="Crop left"
                        value={safeCropRect.left}
                        onChange={onCropNumberChange("left")}
                      />
                    </div>
                    <div>
                      <FieldLabel>Top, px</FieldLabel>
                      <NumberInput
                        type="number"
                        aria-label="Crop top"
                        value={safeCropRect.top}
                        onChange={onCropNumberChange("top")}
                      />
                    </div>
                    <div>
                      <FieldLabel>Width, px</FieldLabel>
                      <NumberInput
                        type="number"
                        aria-label="Crop width"
                        value={safeCropRect.width}
                        onChange={onCropNumberChange("width")}
                      />
                    </div>
                    <div>
                      <FieldLabel>Height, px</FieldLabel>
                      <NumberInput
                        type="number"
                        aria-label="Crop height"
                        value={safeCropRect.height}
                        onChange={onCropNumberChange("height")}
                      />
                    </div>
                  </FieldsPair>
                </FieldBox>
              </Panel>
            </StickyColumn>
            <ToolColumn>
              <Panel>
                <PanelTitle>Output format</PanelTitle>
                <FieldBox>
                  <FormatsBox>
                    {supportedFormats.map((oneFormat) => (
                      <FormatButton
                        key={oneFormat.key}
                        type="button"
                        $isActive={oneFormat.key === formatKey}
                        onClick={() => setFormatKey(oneFormat.key)}
                      >
                        {oneFormat.title}
                      </FormatButton>
                    ))}
                  </FormatsBox>
                  <HintText>{currentFormat.note}</HintText>
                </FieldBox>
                {currentFormat.hasQuality ? (
                  <FieldBox>
                    <FieldLabel>Quality</FieldLabel>
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
                      <RangeValue>{qualityValue}</RangeValue>
                    </ControlRow>
                  </FieldBox>
                ) : (
                  ""
                )}
                {currentFormat.isPalette ? (
                  <FieldBox>
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
                  </FieldBox>
                ) : (
                  ""
                )}
              </Panel>
              <Panel>
                <PanelTitle>Size</PanelTitle>
                <FieldBox>
                  <FieldsPair>
                    <div>
                      <FieldLabel>Width, px</FieldLabel>
                      <NumberInput
                        type="number"
                        aria-label="Output width"
                        value={sizeInputs.width}
                        onChange={onSizeChange("width")}
                      />
                    </div>
                    <div>
                      <FieldLabel>Height, px</FieldLabel>
                      <NumberInput
                        type="number"
                        aria-label="Output height"
                        value={sizeInputs.height}
                        onChange={onSizeChange("height")}
                      />
                    </div>
                  </FieldsPair>
                </FieldBox>
                <FieldBox>
                  <FieldLabel>How the size is applied</FieldLabel>
                  <SelectInput
                    value={resizeMode}
                    aria-label="Resize mode"
                    onChange={(someEvent) =>
                      setResizeMode(someEvent.target.value as ResizeMode)
                    }
                  >
                    {RESIZE_MODES.map((oneMode) => (
                      <option key={oneMode.key} value={oneMode.key}>
                        {oneMode.title}
                      </option>
                    ))}
                  </SelectInput>
                </FieldBox>
                <FieldBox>
                  <FieldLabel>Scale of the crop</FieldLabel>
                  <ControlRow>
                    {SCALE_PRESETS.map((onePercent) => (
                      <Button
                        key={onePercent}
                        small
                        ghost
                        onClick={onScalePreset(onePercent)}
                      >
                        {onePercent}%
                      </Button>
                    ))}
                  </ControlRow>
                </FieldBox>
                <FieldBox>
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
                </FieldBox>
              </Panel>
              <Panel>
                <PanelTitle>Background</PanelTitle>
                <CheckLabel isDisabled={currentFormat.hasAlpha === false}>
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
                  <FieldBox>
                    <ControlRow>
                      <ColorInput
                        type="color"
                        aria-label="Background color"
                        value={backgroundColor}
                        onChange={(someEvent) =>
                          setBackgroundColor(someEvent.target.value)
                        }
                      />
                      <span>{backgroundColor}</span>
                    </ControlRow>
                  </FieldBox>
                ) : (
                  ""
                )}
                {currentFormat.hasAlpha === false ? (
                  <HintText>
                    {currentFormat.title} has no transparency, the background is
                    always applied.
                  </HintText>
                ) : (
                  ""
                )}
              </Panel>
            </ToolColumn>
          </ToolGrid>
          <ResultSection>
            <PanelTitle>
              Result {isBusy ? <BusyMark>working on it...</BusyMark> : ""}
            </PanelTitle>
            {resultData ? (
              <>
                <ResultFrame $isBusy={isBusy}>
                  <ResultImage src={resultData.url} alt="Converted result" />
                </ResultFrame>
                <ResultFacts className="typo">
                  <dt>Source</dt>
                  <dd>
                    {sourceImage.formatTitle}, {sourceImage.width} by{" "}
                    {sourceImage.height}, {formatByteSize(sourceImage.fileSize)}
                  </dd>
                  <dt>Result</dt>
                  <dd>
                    {resultData.formatTitle}, {resultData.width} by{" "}
                    {resultData.height}, {formatByteSize(resultData.blob.size)}
                    {sizeDelta === null ? (
                      ""
                    ) : (
                      <>
                        {" "}
                        <DeltaText $isSmaller={sizeDelta <= 0}>
                          ({sizeDelta > 0 ? "+" : ""}
                          {sizeDelta}%)
                        </DeltaText>
                      </>
                    )}
                  </dd>
                </ResultFacts>
                <ControlRow style={{ marginTop: "20px" }}>
                  <Button onClick={onDownloadClick}>
                    Download {resultData.formatTitle}
                  </Button>
                </ControlRow>
              </>
            ) : (
              <EmptyBox>
                {isBusy ? "Working on it..." : "Nothing to show yet."}
              </EmptyBox>
            )}
          </ResultSection>
        </>
      )}
    </>
  );
}
