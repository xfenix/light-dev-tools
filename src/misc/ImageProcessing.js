// Geometry and resampling math for the image tool. Everything here is free of
// dom apis on purpose: the same code runs in the browser and in the tests

export const RESIZE_MODES = [
  { key: "fit", title: "Fit into the box" },
  { key: "cover", title: "Cover the box" },
  { key: "stretch", title: "Exact size" },
];
const LANCZOS_LOBES = 3;
// A bigger table means a smaller rounding error on the way back to 8 bit
const LINEAR_TABLE_SIZE = 8192;
const BYTE_SIZES = ["B", "KB", "MB", "GB"];

const SRGB_TO_LINEAR = buildSrgbToLinearTable();
const LINEAR_TO_SRGB = buildLinearToSrgbTable();

function srgbToLinear(channelValue) {
  return channelValue <= 0.04045
    ? channelValue / 12.92
    : Math.pow((channelValue + 0.055) / 1.055, 2.4);
}

function linearToSrgb(channelValue) {
  return channelValue <= 0.0031308
    ? channelValue * 12.92
    : 1.055 * Math.pow(channelValue, 1 / 2.4) - 0.055;
}

function buildSrgbToLinearTable() {
  const tableData = new Float32Array(256);
  for (let index = 0; index < 256; index += 1) {
    tableData[index] = srgbToLinear(index / 255);
  }
  return tableData;
}

function buildLinearToSrgbTable() {
  const tableData = new Uint8Array(LINEAR_TABLE_SIZE + 1);
  for (let index = 0; index <= LINEAR_TABLE_SIZE; index += 1) {
    tableData[index] = Math.round(
      linearToSrgb(index / LINEAR_TABLE_SIZE) * 255
    );
  }
  return tableData;
}

// The classic windowed sinc, it keeps the most detail on downscale without the
// ringing of the wider windows
function lanczosWeight(pointValue, lobesCount) {
  if (pointValue === 0) {
    return 1;
  }
  if (pointValue <= -lobesCount || pointValue >= lobesCount) {
    return 0;
  }
  const scaledPoint = pointValue * Math.PI;
  return (
    (lobesCount * Math.sin(scaledPoint) * Math.sin(scaledPoint / lobesCount)) /
    (scaledPoint * scaledPoint)
  );
}

// Precomputed filter taps for one axis, shared by every row (or column)
export function buildFilterWeights(
  sourceSize,
  targetSize,
  lobesCount = LANCZOS_LOBES
) {
  const axisScale = targetSize / sourceSize;
  // On downscale the filter has to be stretched, otherwise it simply skips the
  // pixels in between and the result aliases
  const filterScale = axisScale < 1 ? 1 / axisScale : 1;
  const filterSupport = lobesCount * filterScale;
  const maxTaps = Math.min(sourceSize, Math.ceil(filterSupport * 2) + 2);
  const startIndexes = new Int32Array(targetSize);
  const tapCounts = new Int32Array(targetSize);
  const weightValues = new Float32Array(targetSize * maxTaps);

  for (let targetIndex = 0; targetIndex < targetSize; targetIndex += 1) {
    const centerPoint = (targetIndex + 0.5) / axisScale - 0.5;
    const firstIndex = Math.max(0, Math.ceil(centerPoint - filterSupport));
    const lastIndex = Math.min(
      sourceSize - 1,
      Math.floor(centerPoint + filterSupport)
    );
    const tapsCount = Math.max(0, lastIndex - firstIndex + 1);
    const weightsOffset = targetIndex * maxTaps;
    let weightsSum = 0;
    for (let tapIndex = 0; tapIndex < tapsCount; tapIndex += 1) {
      const oneWeight = lanczosWeight(
        (firstIndex + tapIndex - centerPoint) / filterScale,
        lobesCount
      );
      weightValues[weightsOffset + tapIndex] = oneWeight;
      weightsSum += oneWeight;
    }
    if (weightsSum !== 0) {
      for (let tapIndex = 0; tapIndex < tapsCount; tapIndex += 1) {
        weightValues[weightsOffset + tapIndex] /= weightsSum;
      }
    }
    startIndexes[targetIndex] = firstIndex;
    tapCounts[targetIndex] = tapsCount;
  }
  return { startIndexes, tapCounts, weightValues, maxTaps };
}

// Straight rgba bytes go in, straight rgba bytes come out. Inside the filter
// works on premultiplied linear light values, so neither the transparent edges
// nor the overall brightness shift around
export function resamplePixels(
  sourcePixels,
  sourceWidth,
  sourceHeight,
  targetWidth,
  targetHeight,
  options = {}
) {
  const lobesCount = options.lobes || LANCZOS_LOBES;
  const isGammaAware = options.gammaCorrect !== false;
  const horizontalFilter = buildFilterWeights(
    sourceWidth,
    targetWidth,
    lobesCount
  );
  const verticalFilter = buildFilterWeights(
    sourceHeight,
    targetHeight,
    lobesCount
  );
  const rowsBuffer = new Float32Array(targetWidth * sourceHeight * 4);

  for (let rowIndex = 0; rowIndex < sourceHeight; rowIndex += 1) {
    const sourceRowOffset = rowIndex * sourceWidth * 4;
    const targetRowOffset = rowIndex * targetWidth * 4;
    for (let columnIndex = 0; columnIndex < targetWidth; columnIndex += 1) {
      const firstIndex = horizontalFilter.startIndexes[columnIndex];
      const tapsCount = horizontalFilter.tapCounts[columnIndex];
      const weightsOffset = columnIndex * horizontalFilter.maxTaps;
      let redSum = 0;
      let greenSum = 0;
      let blueSum = 0;
      let alphaSum = 0;
      for (let tapIndex = 0; tapIndex < tapsCount; tapIndex += 1) {
        const oneWeight =
          horizontalFilter.weightValues[weightsOffset + tapIndex];
        const pixelOffset = sourceRowOffset + (firstIndex + tapIndex) * 4;
        const alphaValue = sourcePixels[pixelOffset + 3] / 255;
        const weightedAlpha = oneWeight * alphaValue;
        redSum +=
          weightedAlpha * toLinear(sourcePixels[pixelOffset], isGammaAware);
        greenSum +=
          weightedAlpha * toLinear(sourcePixels[pixelOffset + 1], isGammaAware);
        blueSum +=
          weightedAlpha * toLinear(sourcePixels[pixelOffset + 2], isGammaAware);
        alphaSum += weightedAlpha;
      }
      const bufferOffset = targetRowOffset + columnIndex * 4;
      rowsBuffer[bufferOffset] = redSum;
      rowsBuffer[bufferOffset + 1] = greenSum;
      rowsBuffer[bufferOffset + 2] = blueSum;
      rowsBuffer[bufferOffset + 3] = alphaSum;
    }
  }

  const targetPixels = new Uint8ClampedArray(targetWidth * targetHeight * 4);
  for (let rowIndex = 0; rowIndex < targetHeight; rowIndex += 1) {
    const firstIndex = verticalFilter.startIndexes[rowIndex];
    const tapsCount = verticalFilter.tapCounts[rowIndex];
    const weightsOffset = rowIndex * verticalFilter.maxTaps;
    const targetRowOffset = rowIndex * targetWidth * 4;
    for (let columnIndex = 0; columnIndex < targetWidth; columnIndex += 1) {
      let redSum = 0;
      let greenSum = 0;
      let blueSum = 0;
      let alphaSum = 0;
      for (let tapIndex = 0; tapIndex < tapsCount; tapIndex += 1) {
        const oneWeight = verticalFilter.weightValues[weightsOffset + tapIndex];
        const bufferOffset =
          ((firstIndex + tapIndex) * targetWidth + columnIndex) * 4;
        redSum += oneWeight * rowsBuffer[bufferOffset];
        greenSum += oneWeight * rowsBuffer[bufferOffset + 1];
        blueSum += oneWeight * rowsBuffer[bufferOffset + 2];
        alphaSum += oneWeight * rowsBuffer[bufferOffset + 3];
      }
      const pixelOffset = targetRowOffset + columnIndex * 4;
      if (alphaSum <= 0) {
        targetPixels[pixelOffset] = 0;
        targetPixels[pixelOffset + 1] = 0;
        targetPixels[pixelOffset + 2] = 0;
        targetPixels[pixelOffset + 3] = 0;
        continue;
      }
      targetPixels[pixelOffset] = fromLinear(redSum / alphaSum, isGammaAware);
      targetPixels[pixelOffset + 1] = fromLinear(
        greenSum / alphaSum,
        isGammaAware
      );
      targetPixels[pixelOffset + 2] = fromLinear(
        blueSum / alphaSum,
        isGammaAware
      );
      targetPixels[pixelOffset + 3] = Math.round(
        Math.min(1, Math.max(0, alphaSum)) * 255
      );
    }
  }
  return targetPixels;
}

function toLinear(byteValue, isGammaAware) {
  return isGammaAware ? SRGB_TO_LINEAR[byteValue] : byteValue / 255;
}

function fromLinear(linearValue, isGammaAware) {
  const clampedValue = Math.min(1, Math.max(0, linearValue));
  if (!isGammaAware) {
    return Math.round(clampedValue * 255);
  }
  return LINEAR_TO_SRGB[Math.round(clampedValue * LINEAR_TABLE_SIZE)];
}

// Cuts the rectangle out of the rgba buffer, the rectangle is expected to be
// already clamped by normalizeCropRect
export function cropPixels(sourcePixels, sourceWidth, cropRect) {
  const targetPixels = new Uint8ClampedArray(
    cropRect.width * cropRect.height * 4
  );
  for (let rowIndex = 0; rowIndex < cropRect.height; rowIndex += 1) {
    const sourceOffset =
      ((cropRect.top + rowIndex) * sourceWidth + cropRect.left) * 4;
    targetPixels.set(
      sourcePixels.subarray(sourceOffset, sourceOffset + cropRect.width * 4),
      rowIndex * cropRect.width * 4
    );
  }
  return targetPixels;
}

// Keeps the selection inside the image and never lets it collapse to nothing
export function normalizeCropRect(cropRect, sourceWidth, sourceHeight) {
  const safeRect = cropRect || {};
  const left = clampNumber(Math.round(safeRect.left || 0), 0, sourceWidth - 1);
  const top = clampNumber(Math.round(safeRect.top || 0), 0, sourceHeight - 1);
  const width = clampNumber(
    Math.round(safeRect.width || sourceWidth),
    1,
    sourceWidth - left
  );
  const height = clampNumber(
    Math.round(safeRect.height || sourceHeight),
    1,
    sourceHeight - top
  );
  return { left, top, width, height };
}

export function clampNumber(someValue, minValue, maxValue) {
  if (!isFinite(someValue)) {
    return minValue;
  }
  return Math.min(maxValue, Math.max(minValue, someValue));
}

// Turns the box asked by the user into the real output size plus the piece of
// the source it has to be taken from
export function computeResizePlan(options) {
  const sourceWidth = options.sourceWidth;
  const sourceHeight = options.sourceHeight;
  const fullRect = {
    left: 0,
    top: 0,
    width: sourceWidth,
    height: sourceHeight,
  };
  const boxWidth = Math.round(options.boxWidth || 0);
  const boxHeight = Math.round(options.boxHeight || 0);
  if (boxWidth <= 0 && boxHeight <= 0) {
    return { width: sourceWidth, height: sourceHeight, cropRect: fullRect };
  }
  if (options.mode === "stretch" && boxWidth > 0 && boxHeight > 0) {
    return { width: boxWidth, height: boxHeight, cropRect: fullRect };
  }
  const widthRatio = boxWidth > 0 ? boxWidth / sourceWidth : null;
  const heightRatio = boxHeight > 0 ? boxHeight / sourceHeight : null;
  if (options.mode === "cover" && widthRatio !== null && heightRatio !== null) {
    const coverScale = limitScale(
      Math.max(widthRatio, heightRatio),
      options.allowUpscale
    );
    const cropWidth = clampNumber(
      Math.round(boxWidth / coverScale),
      1,
      sourceWidth
    );
    const cropHeight = clampNumber(
      Math.round(boxHeight / coverScale),
      1,
      sourceHeight
    );
    return {
      width: Math.max(1, Math.round(cropWidth * coverScale)),
      height: Math.max(1, Math.round(cropHeight * coverScale)),
      cropRect: {
        left: Math.round((sourceWidth - cropWidth) / 2),
        top: Math.round((sourceHeight - cropHeight) / 2),
        width: cropWidth,
        height: cropHeight,
      },
    };
  }
  const ratioCandidates = [widthRatio, heightRatio].filter(
    (oneRatio) => oneRatio !== null
  );
  const fitScale = limitScale(
    Math.min.apply(null, ratioCandidates),
    options.allowUpscale
  );
  return {
    width: Math.max(1, Math.round(sourceWidth * fitScale)),
    height: Math.max(1, Math.round(sourceHeight * fitScale)),
    cropRect: fullRect,
  };
}

function limitScale(scaleValue, allowUpscale) {
  return allowUpscale ? scaleValue : Math.min(1, scaleValue);
}

export function formatByteSize(bytesCount) {
  let restValue = bytesCount;
  let unitIndex = 0;
  while (restValue >= 1024 && unitIndex < BYTE_SIZES.length - 1) {
    restValue /= 1024;
    unitIndex += 1;
  }
  const digitsCount = unitIndex === 0 || restValue >= 100 ? 0 : 1;
  return `${restValue.toFixed(digitsCount)} ${BYTE_SIZES[unitIndex]}`;
}

// Averaging 2x2 blocks is both exact and cheap, so a huge photo is brought
// close to the target size this way before the expensive filter kicks in
export function halvePixels(
  sourcePixels,
  sourceWidth,
  sourceHeight,
  isGammaAware
) {
  const targetWidth = sourceWidth / 2;
  const targetHeight = sourceHeight / 2;
  const targetPixels = new Uint8ClampedArray(targetWidth * targetHeight * 4);
  for (let rowIndex = 0; rowIndex < targetHeight; rowIndex += 1) {
    const firstRowOffset = rowIndex * 2 * sourceWidth * 4;
    const secondRowOffset = firstRowOffset + sourceWidth * 4;
    for (let columnIndex = 0; columnIndex < targetWidth; columnIndex += 1) {
      const columnOffset = columnIndex * 8;
      const pixelOffsets = [
        firstRowOffset + columnOffset,
        firstRowOffset + columnOffset + 4,
        secondRowOffset + columnOffset,
        secondRowOffset + columnOffset + 4,
      ];
      let redSum = 0;
      let greenSum = 0;
      let blueSum = 0;
      let alphaSum = 0;
      for (let cornerIndex = 0; cornerIndex < 4; cornerIndex += 1) {
        const pixelOffset = pixelOffsets[cornerIndex];
        const alphaValue = sourcePixels[pixelOffset + 3] / 255;
        redSum +=
          alphaValue * toLinear(sourcePixels[pixelOffset], isGammaAware);
        greenSum +=
          alphaValue * toLinear(sourcePixels[pixelOffset + 1], isGammaAware);
        blueSum +=
          alphaValue * toLinear(sourcePixels[pixelOffset + 2], isGammaAware);
        alphaSum += alphaValue;
      }
      const targetOffset = (rowIndex * targetWidth + columnIndex) * 4;
      if (alphaSum <= 0) {
        continue;
      }
      targetPixels[targetOffset] = fromLinear(redSum / alphaSum, isGammaAware);
      targetPixels[targetOffset + 1] = fromLinear(
        greenSum / alphaSum,
        isGammaAware
      );
      targetPixels[targetOffset + 2] = fromLinear(
        blueSum / alphaSum,
        isGammaAware
      );
      targetPixels[targetOffset + 3] = Math.round((alphaSum / 4) * 255);
    }
  }
  return { pixels: targetPixels, width: targetWidth, height: targetHeight };
}

// Halving is exact only while both sides are even, an odd side simply stops
// the chain and leaves the rest of the work to the filter
export function reducePixelsByHalves(
  sourcePixels,
  sourceWidth,
  sourceHeight,
  targetWidth,
  targetHeight,
  isGammaAware
) {
  let currentStep = {
    pixels: sourcePixels,
    width: sourceWidth,
    height: sourceHeight,
  };
  while (
    currentStep.width % 2 === 0 &&
    currentStep.height % 2 === 0 &&
    currentStep.width >= targetWidth * 2 &&
    currentStep.height >= targetHeight * 2
  ) {
    currentStep = halvePixels(
      currentStep.pixels,
      currentStep.width,
      currentStep.height,
      isGammaAware
    );
  }
  return currentStep;
}

// Lays the image over an opaque color, needed by the formats without an alpha
// channel and by anybody who wants a solid background
export function flattenPixels(sourcePixels, backgroundColor) {
  const targetPixels = new Uint8ClampedArray(sourcePixels.length);
  const backRed = backgroundColor.red;
  const backGreen = backgroundColor.green;
  const backBlue = backgroundColor.blue;
  for (
    let pixelOffset = 0;
    pixelOffset < sourcePixels.length;
    pixelOffset += 4
  ) {
    const alphaValue = sourcePixels[pixelOffset + 3] / 255;
    const restValue = 1 - alphaValue;
    targetPixels[pixelOffset] = Math.round(
      sourcePixels[pixelOffset] * alphaValue + backRed * restValue
    );
    targetPixels[pixelOffset + 1] = Math.round(
      sourcePixels[pixelOffset + 1] * alphaValue + backGreen * restValue
    );
    targetPixels[pixelOffset + 2] = Math.round(
      sourcePixels[pixelOffset + 2] * alphaValue + backBlue * restValue
    );
    targetPixels[pixelOffset + 3] = 255;
  }
  return targetPixels;
}

export function hasTransparentPixels(sourcePixels) {
  for (
    let pixelOffset = 3;
    pixelOffset < sourcePixels.length;
    pixelOffset += 4
  ) {
    if (sourcePixels[pixelOffset] !== 255) {
      return true;
    }
  }
  return false;
}

export function parseHexColor(hexValue) {
  const cleanValue = String(hexValue || "").replace("#", "");
  const fullValue =
    cleanValue.length === 3
      ? cleanValue.replace(/./g, (oneChar) => oneChar + oneChar)
      : cleanValue;
  const numberValue = parseInt(fullValue, 16);
  if (fullValue.length !== 6 || isNaN(numberValue)) {
    return { red: 255, green: 255, blue: 255 };
  }
  return {
    // eslint-disable-next-line no-bitwise
    red: (numberValue >> 16) & 255,
    // eslint-disable-next-line no-bitwise
    green: (numberValue >> 8) & 255,
    // eslint-disable-next-line no-bitwise
    blue: numberValue & 255,
  };
}
