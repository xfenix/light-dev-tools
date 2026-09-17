// Everything about reading image files and writing them back. Decoding leans
// on the browser where it can and on the lazily loaded libraries where the
// browser gives up, encoding adds the formats canvas knows nothing about

import {
  cropPixels,
  describeSizeProblem,
  flattenPixels,
  hasTransparentPixels,
  reducePixelsByHalves,
  resamplePixels,
} from "./ImageProcessing";

import { encodeGif } from "./GifEncoder";

const SVG_FALLBACK_SIZE = 1024;
const ICO_MAX_SIDE = 256;
const TEXT_DECODER_LIMIT = 256;

export const INPUT_FILE_ACCEPT =
  "image/*,.heic,.heif,.heifs,.avif,.tif,.tiff,.bmp,.ico,.svg,.jxl";

// Every format the tool is able to read, the browser is asked first and the
// rest is handled by the decoders below
export const INPUT_FORMATS = [
  { key: "png", title: "PNG", decoder: "browser" },
  { key: "jpeg", title: "JPEG", decoder: "browser" },
  { key: "webp", title: "WebP", decoder: "browser" },
  { key: "avif", title: "AVIF", decoder: "browser" },
  { key: "gif", title: "GIF", decoder: "browser" },
  { key: "bmp", title: "BMP", decoder: "browser" },
  { key: "ico", title: "ICO", decoder: "browser" },
  { key: "svg", title: "SVG", decoder: "vector" },
  { key: "tiff", title: "TIFF", decoder: "utif" },
  { key: "heic", title: "HEIC / HEIF", decoder: "heic" },
  { key: "jxl", title: "JPEG XL", decoder: "browser" },
  { key: "unknown", title: "Unknown", decoder: "browser" },
];

export const OUTPUT_FORMATS = [
  {
    key: "png",
    title: "PNG",
    extension: "png",
    mime: "image/png",
    writer: "canvas",
    isLossless: true,
    hasAlpha: true,
    note: "Lossless, keeps the alpha channel. The safest choice.",
  },
  {
    key: "jpeg",
    title: "JPEG",
    extension: "jpg",
    mime: "image/jpeg",
    writer: "canvas",
    hasQuality: true,
    hasAlpha: false,
    note: "Lossy, no transparency, so the image is put on the background color.",
  },
  {
    key: "webp",
    title: "WebP",
    extension: "webp",
    mime: "image/webp",
    writer: "canvas",
    hasQuality: true,
    hasAlpha: true,
    note: "Smaller than jpeg at the same quality, quality 100 is near lossless.",
  },
  {
    key: "avif",
    title: "AVIF",
    extension: "avif",
    mime: "image/avif",
    writer: "canvas",
    hasQuality: true,
    hasAlpha: true,
    note: "The smallest of the lossy ones, encoding is supported by fresh browsers only.",
  },
  {
    key: "tiff",
    title: "TIFF",
    extension: "tif",
    mime: "image/tiff",
    writer: "utif",
    isLossless: true,
    hasAlpha: true,
    note: "Uncompressed, every pixel is kept as is, files are big.",
  },
  {
    key: "bmp",
    title: "BMP",
    extension: "bmp",
    mime: "image/bmp",
    writer: "bmp",
    isLossless: true,
    hasAlpha: true,
    note: "Uncompressed, transparency is written as a 32 bit bitmap.",
  },
  {
    key: "gif",
    title: "GIF",
    extension: "gif",
    mime: "image/gif",
    writer: "gif",
    hasAlpha: true,
    isPalette: true,
    note: "Only 256 colors, dithering is used to hide the banding.",
  },
  {
    key: "ico",
    title: "ICO",
    extension: "ico",
    mime: "image/x-icon",
    writer: "ico",
    isLossless: true,
    hasAlpha: true,
    maxSide: ICO_MAX_SIDE,
    note: "Windows icon, a png inside, both sides have to be 256 or less.",
  },
];

export function findOutputFormat(formatKey) {
  return (
    OUTPUT_FORMATS.filter((oneFormat) => oneFormat.key === formatKey)[0] ||
    OUTPUT_FORMATS[0]
  );
}

// Canvas silently falls back to png when it cannot encode the asked type, so
// every browser dependent format is probed once before it is offered
export function detectSupportedOutputFormats() {
  const probeCanvas = createCanvas(1, 1);
  return OUTPUT_FORMATS.filter((oneFormat) => {
    if (oneFormat.writer !== "canvas") {
      return true;
    }
    try {
      return (
        probeCanvas
          .toDataURL(oneFormat.mime)
          .indexOf(`data:${oneFormat.mime}`) === 0
      );
    } catch (someError) {
      return false;
    }
  });
}

function guardSize(imageWidth, imageHeight) {
  const sizeProblem = describeSizeProblem(imageWidth, imageHeight);
  if (sizeProblem) {
    throw new Error(sizeProblem);
  }
}

function createCanvas(canvasWidth, canvasHeight) {
  const canvasElement = document.createElement("canvas");
  canvasElement.width = canvasWidth;
  canvasElement.height = canvasHeight;
  return canvasElement;
}

function readFileAsArrayBuffer(someFile) {
  return new Promise((resolve, reject) => {
    const fileReader = new FileReader();
    fileReader.onload = () => resolve(fileReader.result);
    fileReader.onerror = () => reject(new Error("Cannot read the file"));
    fileReader.readAsArrayBuffer(someFile);
  });
}

function startsWithBytes(headBytes, byteValues, atOffset = 0) {
  return byteValues.every(
    (oneByte, byteIndex) => headBytes[atOffset + byteIndex] === oneByte
  );
}

function bytesToText(headBytes, fromOffset, bytesCount) {
  let textValue = "";
  for (let byteIndex = 0; byteIndex < bytesCount; byteIndex += 1) {
    textValue += String.fromCharCode(headBytes[fromOffset + byteIndex] || 0);
  }
  return textValue;
}

// The extension lies too often, so the type is taken from the file itself
export function detectFormatKey(headBytes, fileName = "") {
  if (startsWithBytes(headBytes, [137, 80, 78, 71])) {
    return "png";
  }
  if (startsWithBytes(headBytes, [255, 216, 255])) {
    return "jpeg";
  }
  if (bytesToText(headBytes, 0, 3) === "GIF") {
    return "gif";
  }
  if (
    bytesToText(headBytes, 0, 4) === "RIFF" &&
    bytesToText(headBytes, 8, 4) === "WEBP"
  ) {
    return "webp";
  }
  if (bytesToText(headBytes, 0, 2) === "BM") {
    return "bmp";
  }
  if (startsWithBytes(headBytes, [0, 0, 1, 0])) {
    return "ico";
  }
  if (
    startsWithBytes(headBytes, [73, 73, 42, 0]) ||
    startsWithBytes(headBytes, [77, 77, 0, 42])
  ) {
    return "tiff";
  }
  if (
    startsWithBytes(headBytes, [255, 10]) ||
    startsWithBytes(headBytes, [0, 0, 0, 12, 74, 88, 76, 32])
  ) {
    return "jxl";
  }
  if (bytesToText(headBytes, 4, 4) === "ftyp") {
    const brandName = bytesToText(headBytes, 8, 4);
    if (brandName === "avif" || brandName === "avis") {
      return "avif";
    }
    return "heic";
  }
  const headText = bytesToText(headBytes, 0, 64).trim();
  if (headText.indexOf("<svg") !== -1 || headText.indexOf("<?xml") === 0) {
    return "svg";
  }
  const dotIndex = fileName.lastIndexOf(".");
  const extensionName =
    dotIndex === -1 ? "" : fileName.slice(dotIndex + 1).toLowerCase();
  const knownByExtension = {
    jpg: "jpeg",
    jpeg: "jpeg",
    png: "png",
    gif: "gif",
    webp: "webp",
    avif: "avif",
    bmp: "bmp",
    ico: "ico",
    svg: "svg",
    tif: "tiff",
    tiff: "tiff",
    heic: "heic",
    heif: "heic",
    jxl: "jxl",
  };
  return knownByExtension[extensionName] || "unknown";
}

function findInputFormat(formatKey) {
  return (
    INPUT_FORMATS.filter((oneFormat) => oneFormat.key === formatKey)[0] ||
    INPUT_FORMATS[INPUT_FORMATS.length - 1]
  );
}

async function decodeWithBrowser(someBlob) {
  if (typeof createImageBitmap === "function") {
    try {
      // Phones write the orientation into exif instead of rotating the pixels
      return await createImageBitmap(someBlob, {
        imageOrientation: "from-image",
      });
    } catch (someError) {
      try {
        return await createImageBitmap(someBlob);
      } catch (anotherError) {
        // the img element below is the last hope
      }
    }
  }
  return loadImageElement(URL.createObjectURL(someBlob), true);
}

function loadImageElement(sourceUrl, shouldRevoke) {
  return new Promise((resolve, reject) => {
    const imageElement = new Image();
    imageElement.onload = () => {
      if (shouldRevoke) {
        URL.revokeObjectURL(sourceUrl);
      }
      resolve(imageElement);
    };
    imageElement.onerror = () => {
      if (shouldRevoke) {
        URL.revokeObjectURL(sourceUrl);
      }
      reject(new Error("The browser refused to decode this image"));
    };
    imageElement.src = sourceUrl;
  });
}

function drawableToPixels(drawableImage, targetWidth, targetHeight) {
  const imageWidth =
    targetWidth ||
    drawableImage.naturalWidth ||
    drawableImage.width ||
    SVG_FALLBACK_SIZE;
  const imageHeight =
    targetHeight ||
    drawableImage.naturalHeight ||
    drawableImage.height ||
    SVG_FALLBACK_SIZE;
  guardSize(imageWidth, imageHeight);
  const canvasElement = createCanvas(imageWidth, imageHeight);
  const drawContext = canvasElement.getContext("2d");
  drawContext.imageSmoothingEnabled = true;
  drawContext.imageSmoothingQuality = "high";
  drawContext.drawImage(drawableImage, 0, 0, imageWidth, imageHeight);
  const imageData = drawContext.getImageData(0, 0, imageWidth, imageHeight);
  if (drawableImage.close) {
    drawableImage.close();
  }
  return {
    pixels: imageData.data,
    width: imageWidth,
    height: imageHeight,
  };
}

async function decodeTiffFile(fileBuffer) {
  const utifModule = await import("utif");
  const tiffLibrary = utifModule.default || utifModule;
  const allPages = tiffLibrary.decode(fileBuffer);
  if (!allPages.length) {
    throw new Error("This tiff has no pages inside");
  }
  const firstPage = allPages[0];
  tiffLibrary.decodeImage(fileBuffer, firstPage, allPages);
  guardSize(firstPage.width, firstPage.height);
  const rgbaPixels = tiffLibrary.toRGBA8(firstPage);
  return {
    pixels: new Uint8ClampedArray(rgbaPixels),
    width: firstPage.width,
    height: firstPage.height,
  };
}

async function decodeHeicFile(someFile) {
  const heicModule = await import("heic2any");
  const heicConverter = heicModule.default || heicModule;
  const convertedBlob = await heicConverter({
    blob: someFile,
    toType: "image/png",
  });
  const singleBlob = Array.isArray(convertedBlob)
    ? convertedBlob[0]
    : convertedBlob;
  return drawableToPixels(await decodeWithBrowser(singleBlob));
}

// Svg has no pixels of its own, so the natural size is only a starting point
// and the real rasterization happens at the size of the result
function readSvgSize(svgText) {
  const parsedDocument = new DOMParser().parseFromString(
    svgText,
    "image/svg+xml"
  );
  const rootNode = parsedDocument.documentElement;
  const widthValue = parseFloat(rootNode.getAttribute("width"));
  const heightValue = parseFloat(rootNode.getAttribute("height"));
  if (widthValue > 0 && heightValue > 0) {
    return { width: Math.round(widthValue), height: Math.round(heightValue) };
  }
  const viewBoxValue = (rootNode.getAttribute("viewBox") || "")
    .split(/[\s,]+/)
    .map(parseFloat);
  if (viewBoxValue.length === 4 && viewBoxValue[2] > 0 && viewBoxValue[3] > 0) {
    return {
      width: Math.round(viewBoxValue[2]),
      height: Math.round(viewBoxValue[3]),
    };
  }
  return { width: SVG_FALLBACK_SIZE, height: SVG_FALLBACK_SIZE };
}

export async function decodeImageFile(someFile) {
  const fileBuffer = await readFileAsArrayBuffer(someFile);
  const headBytes = new Uint8Array(
    fileBuffer.slice(0, Math.min(TEXT_DECODER_LIMIT, fileBuffer.byteLength))
  );
  const formatKey = detectFormatKey(headBytes, someFile.name || "");
  const inputFormat = findInputFormat(formatKey);
  const commonPart = {
    formatKey,
    formatTitle: inputFormat.title,
    fileName: someFile.name || "image",
    fileSize: someFile.size,
  };

  if (inputFormat.decoder === "vector") {
    const svgText = new TextDecoder("utf-8").decode(fileBuffer);
    const naturalSize = readSvgSize(svgText);
    const svgUrl = URL.createObjectURL(
      new Blob([svgText], { type: "image/svg+xml" })
    );
    const rasterize = async (targetWidth, targetHeight) => {
      const svgImage = await loadImageElement(svgUrl, false);
      return drawableToPixels(svgImage, targetWidth, targetHeight);
    };
    let naturalPixels = null;
    try {
      naturalPixels = await rasterize(naturalSize.width, naturalSize.height);
    } catch (someError) {
      URL.revokeObjectURL(svgUrl);
      throw someError;
    }
    return Object.assign({}, commonPart, naturalPixels, {
      isVector: true,
      rasterize,
      release: () => URL.revokeObjectURL(svgUrl),
    });
  }

  let decodedImage = null;
  if (inputFormat.decoder === "utif") {
    decodedImage = await decodeTiffFile(fileBuffer);
  } else if (inputFormat.decoder === "heic") {
    decodedImage = await decodeHeicFile(someFile);
  } else {
    decodedImage = drawableToPixels(await decodeWithBrowser(someFile));
  }
  return Object.assign({}, commonPart, decodedImage, {
    isVector: false,
    release: () => {},
  });
}

// Crop, then resize, then put the result on a background if it is needed. The
// source pixels are never touched, so nothing is lost between the runs
export async function renderPixels(sourceImage, renderPlan) {
  const cropRect = renderPlan.cropRect;
  const targetWidth = Math.max(1, Math.round(renderPlan.width));
  const targetHeight = Math.max(1, Math.round(renderPlan.height));
  guardSize(targetWidth, targetHeight);
  const isGammaAware = renderPlan.gammaCorrect !== false;
  let currentStep = null;

  if (sourceImage.isVector) {
    // A vector source is redrawn at the final resolution, this way the edges
    // stay perfectly sharp whatever the size is
    const widthScale = targetWidth / cropRect.width;
    const heightScale = targetHeight / cropRect.height;
    const rasterized = await sourceImage.rasterize(
      Math.max(1, Math.round(sourceImage.width * widthScale)),
      Math.max(1, Math.round(sourceImage.height * heightScale))
    );
    const scaledRect = {
      left: Math.max(0, Math.round(cropRect.left * widthScale)),
      top: Math.max(0, Math.round(cropRect.top * heightScale)),
      width: 0,
      height: 0,
    };
    scaledRect.width = Math.max(
      1,
      Math.min(rasterized.width - scaledRect.left, targetWidth)
    );
    scaledRect.height = Math.max(
      1,
      Math.min(rasterized.height - scaledRect.top, targetHeight)
    );
    currentStep = {
      pixels: cropPixels(rasterized.pixels, rasterized.width, scaledRect),
      width: scaledRect.width,
      height: scaledRect.height,
    };
  } else {
    currentStep = {
      pixels: cropPixels(sourceImage.pixels, sourceImage.width, cropRect),
      width: cropRect.width,
      height: cropRect.height,
    };
  }

  if (
    currentStep.width !== targetWidth ||
    currentStep.height !== targetHeight
  ) {
    currentStep = reducePixelsByHalves(
      currentStep.pixels,
      currentStep.width,
      currentStep.height,
      targetWidth,
      targetHeight,
      isGammaAware
    );
    if (
      currentStep.width !== targetWidth ||
      currentStep.height !== targetHeight
    ) {
      currentStep = {
        pixels: resamplePixels(
          currentStep.pixels,
          currentStep.width,
          currentStep.height,
          targetWidth,
          targetHeight,
          { gammaCorrect: isGammaAware }
        ),
        width: targetWidth,
        height: targetHeight,
      };
    }
  }

  if (renderPlan.backgroundColor) {
    currentStep = {
      pixels: flattenPixels(currentStep.pixels, renderPlan.backgroundColor),
      width: currentStep.width,
      height: currentStep.height,
    };
  }
  return currentStep;
}

export function pixelsToCanvas(sourcePixels, imageWidth, imageHeight) {
  const canvasElement = createCanvas(imageWidth, imageHeight);
  canvasElement
    .getContext("2d")
    .putImageData(
      new ImageData(
        new Uint8ClampedArray(sourcePixels),
        imageWidth,
        imageHeight
      ),
      0,
      0
    );
  return canvasElement;
}

function encodeWithCanvas(
  sourcePixels,
  imageWidth,
  imageHeight,
  oneFormat,
  qualityValue
) {
  const canvasElement = pixelsToCanvas(sourcePixels, imageWidth, imageHeight);
  return new Promise((resolve, reject) => {
    canvasElement.toBlob(
      (resultBlob) => {
        if (!resultBlob) {
          reject(new Error(`This browser cannot write ${oneFormat.title}`));
          return;
        }
        if (resultBlob.type && resultBlob.type !== oneFormat.mime) {
          reject(
            new Error(
              `This browser cannot write ${oneFormat.title}, it returned ${resultBlob.type}`
            )
          );
          return;
        }
        resolve(resultBlob);
      },
      oneFormat.mime,
      oneFormat.hasQuality ? qualityValue : undefined
    );
  });
}

// Bottom up rows, 32 bit with an alpha channel or plain 24 bit when there is
// nothing to keep transparent
export function encodeBmp(sourcePixels, imageWidth, imageHeight) {
  const withAlpha = hasTransparentPixels(sourcePixels);
  const headerSize = withAlpha ? 108 : 40;
  const bytesPerPixel = withAlpha ? 4 : 3;
  const rowSize = withAlpha
    ? imageWidth * 4
    : Math.ceil((imageWidth * 3) / 4) * 4;
  const pixelsOffset = 14 + headerSize;
  const fileSize = pixelsOffset + rowSize * imageHeight;
  const fileBytes = new Uint8Array(fileSize);
  const fileView = new DataView(fileBytes.buffer);

  fileBytes[0] = 66;
  fileBytes[1] = 77;
  fileView.setUint32(2, fileSize, true);
  fileView.setUint32(10, pixelsOffset, true);
  fileView.setUint32(14, headerSize, true);
  fileView.setInt32(18, imageWidth, true);
  fileView.setInt32(22, imageHeight, true);
  fileView.setUint16(26, 1, true);
  fileView.setUint16(28, bytesPerPixel * 8, true);
  fileView.setUint32(30, withAlpha ? 3 : 0, true);
  fileView.setUint32(34, rowSize * imageHeight, true);
  fileView.setInt32(38, 2835, true);
  fileView.setInt32(42, 2835, true);
  if (withAlpha) {
    fileView.setUint32(54, 0x00ff0000, true);
    fileView.setUint32(58, 0x0000ff00, true);
    fileView.setUint32(62, 0x000000ff, true);
    fileView.setUint32(66, 0xff000000, true);
    // "BGRs" in the little endian order, the plain sRGB color space
    fileView.setUint32(70, 0x73524742, false);
  }

  for (let rowIndex = 0; rowIndex < imageHeight; rowIndex += 1) {
    const sourceRowOffset = (imageHeight - 1 - rowIndex) * imageWidth * 4;
    let targetOffset = pixelsOffset + rowIndex * rowSize;
    for (let columnIndex = 0; columnIndex < imageWidth; columnIndex += 1) {
      const pixelOffset = sourceRowOffset + columnIndex * 4;
      fileBytes[targetOffset] = sourcePixels[pixelOffset + 2];
      fileBytes[targetOffset + 1] = sourcePixels[pixelOffset + 1];
      fileBytes[targetOffset + 2] = sourcePixels[pixelOffset];
      if (withAlpha) {
        fileBytes[targetOffset + 3] = sourcePixels[pixelOffset + 3];
      }
      targetOffset += bytesPerPixel;
    }
  }
  return fileBytes;
}

// The modern icon is simply a png wrapped into the old directory structure
export function buildIcoFile(pngBytes, imageWidth, imageHeight) {
  const headerBytes = new Uint8Array(22);
  const headerView = new DataView(headerBytes.buffer);
  headerView.setUint16(0, 0, true);
  headerView.setUint16(2, 1, true);
  headerView.setUint16(4, 1, true);
  headerBytes[6] = imageWidth >= ICO_MAX_SIDE ? 0 : imageWidth;
  headerBytes[7] = imageHeight >= ICO_MAX_SIDE ? 0 : imageHeight;
  headerBytes[8] = 0;
  headerBytes[9] = 0;
  headerView.setUint16(10, 1, true);
  headerView.setUint16(12, 32, true);
  headerView.setUint32(14, pngBytes.length, true);
  headerView.setUint32(18, headerBytes.length, true);
  const fileBytes = new Uint8Array(headerBytes.length + pngBytes.length);
  fileBytes.set(headerBytes, 0);
  fileBytes.set(pngBytes, headerBytes.length);
  return fileBytes;
}

export async function encodePixels(
  sourcePixels,
  imageWidth,
  imageHeight,
  formatKey,
  options = {}
) {
  const oneFormat = findOutputFormat(formatKey);
  const qualityValue =
    options.quality === undefined
      ? 1
      : Math.min(1, Math.max(0, options.quality));

  if (oneFormat.writer === "canvas") {
    return encodeWithCanvas(
      sourcePixels,
      imageWidth,
      imageHeight,
      oneFormat,
      qualityValue
    );
  }
  if (oneFormat.writer === "bmp") {
    return new Blob([encodeBmp(sourcePixels, imageWidth, imageHeight)], {
      type: oneFormat.mime,
    });
  }
  if (oneFormat.writer === "gif") {
    return new Blob(
      [
        encodeGif(sourcePixels, imageWidth, imageHeight, {
          dither: options.dither,
        }),
      ],
      { type: oneFormat.mime }
    );
  }
  if (oneFormat.writer === "utif") {
    const utifModule = await import("utif");
    const tiffLibrary = utifModule.default || utifModule;
    return new Blob(
      [
        tiffLibrary.encodeImage(
          new Uint8Array(sourcePixels),
          imageWidth,
          imageHeight
        ),
      ],
      { type: oneFormat.mime }
    );
  }
  if (oneFormat.writer === "ico") {
    if (imageWidth > ICO_MAX_SIDE || imageHeight > ICO_MAX_SIDE) {
      throw new Error(
        `An icon cannot be bigger than ${ICO_MAX_SIDE} pixels, resize it first`
      );
    }
    const pngBlob = await encodeWithCanvas(
      sourcePixels,
      imageWidth,
      imageHeight,
      findOutputFormat("png"),
      1
    );
    const pngBytes = new Uint8Array(await readFileAsArrayBuffer(pngBlob));
    return new Blob([buildIcoFile(pngBytes, imageWidth, imageHeight)], {
      type: oneFormat.mime,
    });
  }
  throw new Error("Unknown output format");
}

export function buildOutputFileName(sourceName, oneFormat) {
  const cleanName = String(sourceName || "image").replace(/\.[^.]+$/, "");
  return `${cleanName || "image"}.${oneFormat.extension}`;
}
