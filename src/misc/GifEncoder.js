// A small gif89a writer for a single frame: median cut palette, optional
// Floyd-Steinberg dithering and the usual lzw stream. Gif is limited to 256
// colors by the format itself, so the dithering is what saves the gradients

const MAX_PALETTE_SIZE = 256;
const TRANSPARENCY_THRESHOLD = 128;
const MAX_LZW_CODE = 4096;

function makeColorBox(colorEntries) {
  let minRed = 255;
  let minGreen = 255;
  let minBlue = 255;
  let maxRed = 0;
  let maxGreen = 0;
  let maxBlue = 0;
  let pixelsCount = 0;
  for (let entryIndex = 0; entryIndex < colorEntries.length; entryIndex += 1) {
    const oneEntry = colorEntries[entryIndex];
    minRed = Math.min(minRed, oneEntry.red);
    minGreen = Math.min(minGreen, oneEntry.green);
    minBlue = Math.min(minBlue, oneEntry.blue);
    maxRed = Math.max(maxRed, oneEntry.red);
    maxGreen = Math.max(maxGreen, oneEntry.green);
    maxBlue = Math.max(maxBlue, oneEntry.blue);
    pixelsCount += oneEntry.count;
  }
  return {
    colorEntries,
    pixelsCount,
    ranges: [maxRed - minRed, maxGreen - minGreen, maxBlue - minBlue],
  };
}

function splitColorBox(oneBox) {
  const channelNames = ["red", "green", "blue"];
  const widestIndex = oneBox.ranges.indexOf(
    Math.max.apply(null, oneBox.ranges)
  );
  const channelName = channelNames[widestIndex];
  const sortedEntries = oneBox.colorEntries
    .slice()
    .sort((firstEntry, secondEntry) => {
      return firstEntry[channelName] - secondEntry[channelName];
    });
  let leftCount = 0;
  let splitIndex = 0;
  while (
    splitIndex < sortedEntries.length - 1 &&
    leftCount * 2 < oneBox.pixelsCount
  ) {
    leftCount += sortedEntries[splitIndex].count;
    splitIndex += 1;
  }
  return [
    makeColorBox(sortedEntries.slice(0, splitIndex)),
    makeColorBox(sortedEntries.slice(splitIndex)),
  ];
}

function averageBoxColor(oneBox) {
  let redSum = 0;
  let greenSum = 0;
  let blueSum = 0;
  let weightSum = 0;
  for (
    let entryIndex = 0;
    entryIndex < oneBox.colorEntries.length;
    entryIndex += 1
  ) {
    const oneEntry = oneBox.colorEntries[entryIndex];
    redSum += oneEntry.red * oneEntry.count;
    greenSum += oneEntry.green * oneEntry.count;
    blueSum += oneEntry.blue * oneEntry.count;
    weightSum += oneEntry.count;
  }
  if (weightSum === 0) {
    return [0, 0, 0];
  }
  return [
    Math.round(redSum / weightSum),
    Math.round(greenSum / weightSum),
    Math.round(blueSum / weightSum),
  ];
}

// Opaque colors of the image collapsed into at most colorsLimit entries
export function buildPalette(sourcePixels, colorsLimit) {
  const countsByColor = new Map();
  for (
    let pixelOffset = 0;
    pixelOffset < sourcePixels.length;
    pixelOffset += 4
  ) {
    if (sourcePixels[pixelOffset + 3] < TRANSPARENCY_THRESHOLD) {
      continue;
    }
    const colorKey =
      sourcePixels[pixelOffset] * 65536 +
      sourcePixels[pixelOffset + 1] * 256 +
      sourcePixels[pixelOffset + 2];
    countsByColor.set(colorKey, (countsByColor.get(colorKey) || 0) + 1);
  }
  const colorEntries = [];
  countsByColor.forEach((oneCount, colorKey) => {
    colorEntries.push({
      red: Math.floor(colorKey / 65536),
      green: Math.floor(colorKey / 256) % 256,
      blue: colorKey % 256,
      count: oneCount,
    });
  });
  if (colorEntries.length === 0) {
    return [[0, 0, 0]];
  }
  if (colorEntries.length <= colorsLimit) {
    return colorEntries.map((oneEntry) => [
      oneEntry.red,
      oneEntry.green,
      oneEntry.blue,
    ]);
  }
  let allBoxes = [makeColorBox(colorEntries)];
  while (allBoxes.length < colorsLimit) {
    let bestIndex = -1;
    let bestScore = 0;
    for (let boxIndex = 0; boxIndex < allBoxes.length; boxIndex += 1) {
      const oneBox = allBoxes[boxIndex];
      const boxScore =
        Math.max.apply(null, oneBox.ranges) * Math.log(oneBox.pixelsCount + 1);
      if (oneBox.colorEntries.length > 1 && boxScore > bestScore) {
        bestScore = boxScore;
        bestIndex = boxIndex;
      }
    }
    if (bestIndex === -1) {
      break;
    }
    const splitBoxes = splitColorBox(allBoxes[bestIndex]);
    if (
      splitBoxes[0].colorEntries.length === 0 ||
      splitBoxes[1].colorEntries.length === 0
    ) {
      break;
    }
    allBoxes = allBoxes
      .slice(0, bestIndex)
      .concat(splitBoxes, allBoxes.slice(bestIndex + 1));
  }
  return allBoxes.map(averageBoxColor);
}

function findNearestColor(paletteColors, redValue, greenValue, blueValue) {
  let bestIndex = 0;
  let bestDistance = Infinity;
  for (let colorIndex = 0; colorIndex < paletteColors.length; colorIndex += 1) {
    const oneColor = paletteColors[colorIndex];
    const redDelta = redValue - oneColor[0];
    const greenDelta = greenValue - oneColor[1];
    const blueDelta = blueValue - oneColor[2];
    // Weights of the classic luminance aware distance, plain rgb distance
    // picks visibly wrong greens
    const colorDistance =
      redDelta * redDelta * 3 +
      greenDelta * greenDelta * 6 +
      blueDelta * blueDelta;
    if (colorDistance < bestDistance) {
      bestDistance = colorDistance;
      bestIndex = colorIndex;
    }
  }
  return bestIndex;
}

export function mapPixelsToPalette(
  sourcePixels,
  imageWidth,
  imageHeight,
  paletteColors,
  options = {}
) {
  const transparentIndex =
    options.transparentIndex === undefined ? -1 : options.transparentIndex;
  const isDithered = options.dither !== false;
  const targetIndexes = new Uint8Array(imageWidth * imageHeight);
  const cachedIndexes = new Map();
  const errorValues = isDithered
    ? new Float32Array(imageWidth * imageHeight * 3)
    : null;

  for (let rowIndex = 0; rowIndex < imageHeight; rowIndex += 1) {
    for (let columnIndex = 0; columnIndex < imageWidth; columnIndex += 1) {
      const pixelIndex = rowIndex * imageWidth + columnIndex;
      const pixelOffset = pixelIndex * 4;
      if (
        transparentIndex !== -1 &&
        sourcePixels[pixelOffset + 3] < TRANSPARENCY_THRESHOLD
      ) {
        targetIndexes[pixelIndex] = transparentIndex;
        continue;
      }
      let redValue = sourcePixels[pixelOffset];
      let greenValue = sourcePixels[pixelOffset + 1];
      let blueValue = sourcePixels[pixelOffset + 2];
      if (isDithered) {
        redValue += errorValues[pixelIndex * 3];
        greenValue += errorValues[pixelIndex * 3 + 1];
        blueValue += errorValues[pixelIndex * 3 + 2];
        redValue = Math.min(255, Math.max(0, redValue));
        greenValue = Math.min(255, Math.max(0, greenValue));
        blueValue = Math.min(255, Math.max(0, blueValue));
      }
      const roundedRed = Math.round(redValue);
      const roundedGreen = Math.round(greenValue);
      const roundedBlue = Math.round(blueValue);
      const cacheKey = roundedRed * 65536 + roundedGreen * 256 + roundedBlue;
      let paletteIndex = cachedIndexes.get(cacheKey);
      if (paletteIndex === undefined) {
        paletteIndex = findNearestColor(
          paletteColors,
          roundedRed,
          roundedGreen,
          roundedBlue
        );
        cachedIndexes.set(cacheKey, paletteIndex);
      }
      targetIndexes[pixelIndex] = paletteIndex;
      if (!isDithered) {
        continue;
      }
      const pickedColor = paletteColors[paletteIndex];
      spreadError(errorValues, imageWidth, imageHeight, rowIndex, columnIndex, [
        redValue - pickedColor[0],
        greenValue - pickedColor[1],
        blueValue - pickedColor[2],
      ]);
    }
  }
  return targetIndexes;
}

// Floyd-Steinberg, the error goes to the right and to the next row
function spreadError(
  errorValues,
  imageWidth,
  imageHeight,
  rowIndex,
  columnIndex,
  colorError
) {
  const neighbourList = [
    [columnIndex + 1, rowIndex, 7 / 16],
    [columnIndex - 1, rowIndex + 1, 3 / 16],
    [columnIndex, rowIndex + 1, 5 / 16],
    [columnIndex + 1, rowIndex + 1, 1 / 16],
  ];
  for (
    let neighbourIndex = 0;
    neighbourIndex < neighbourList.length;
    neighbourIndex += 1
  ) {
    const oneNeighbour = neighbourList[neighbourIndex];
    if (
      oneNeighbour[0] < 0 ||
      oneNeighbour[0] >= imageWidth ||
      oneNeighbour[1] >= imageHeight
    ) {
      continue;
    }
    const neighbourOffset =
      (oneNeighbour[1] * imageWidth + oneNeighbour[0]) * 3;
    errorValues[neighbourOffset] += colorError[0] * oneNeighbour[2];
    errorValues[neighbourOffset + 1] += colorError[1] * oneNeighbour[2];
    errorValues[neighbourOffset + 2] += colorError[2] * oneNeighbour[2];
  }
}

// Variable width codes are packed from the least significant bit up
function makeBitWriter() {
  const byteValues = [];
  let bitsBuffer = 0;
  let bitsCount = 0;
  return {
    writeCode(codeValue, codeSize) {
      // eslint-disable-next-line no-bitwise
      bitsBuffer |= codeValue << bitsCount;
      bitsCount += codeSize;
      while (bitsCount >= 8) {
        // eslint-disable-next-line no-bitwise
        byteValues.push(bitsBuffer & 255);
        // eslint-disable-next-line no-bitwise
        bitsBuffer >>= 8;
        bitsCount -= 8;
      }
    },
    finish() {
      if (bitsCount > 0) {
        // eslint-disable-next-line no-bitwise
        byteValues.push(bitsBuffer & 255);
        bitsBuffer = 0;
        bitsCount = 0;
      }
      return byteValues;
    },
  };
}

export function lzwEncodeIndexes(colorIndexes, minCodeSize) {
  // eslint-disable-next-line no-bitwise
  const clearCode = 1 << minCodeSize;
  const endCode = clearCode + 1;
  const bitWriter = makeBitWriter();
  let codeSize = minCodeSize + 1;
  let nextCode = endCode + 1;
  let stringTable = new Map();
  let currentCode = colorIndexes.length ? colorIndexes[0] : endCode;

  bitWriter.writeCode(clearCode, codeSize);
  for (let pixelIndex = 1; pixelIndex < colorIndexes.length; pixelIndex += 1) {
    const nextValue = colorIndexes[pixelIndex];
    const tableKey = currentCode * 256 + nextValue;
    const knownCode = stringTable.get(tableKey);
    if (knownCode !== undefined) {
      currentCode = knownCode;
      continue;
    }
    bitWriter.writeCode(currentCode, codeSize);
    if (nextCode < MAX_LZW_CODE) {
      stringTable.set(tableKey, nextCode);
      nextCode += 1;
      // The decoder builds its table one entry behind the encoder, hence the
      // extra step before the codes become wider
      // eslint-disable-next-line no-bitwise
      if (nextCode > 1 << codeSize && codeSize < 12) {
        codeSize += 1;
      }
    } else {
      bitWriter.writeCode(clearCode, codeSize);
      stringTable = new Map();
      codeSize = minCodeSize + 1;
      nextCode = endCode + 1;
    }
    currentCode = nextValue;
  }
  if (colorIndexes.length) {
    bitWriter.writeCode(currentCode, codeSize);
  }
  bitWriter.writeCode(endCode, codeSize);
  return bitWriter.finish();
}

function pushSubBlocks(targetBytes, sourceBytes) {
  let blockStart = 0;
  while (blockStart < sourceBytes.length) {
    const blockSize = Math.min(255, sourceBytes.length - blockStart);
    targetBytes.push(blockSize);
    for (let byteIndex = 0; byteIndex < blockSize; byteIndex += 1) {
      targetBytes.push(sourceBytes[blockStart + byteIndex]);
    }
    blockStart += blockSize;
  }
  targetBytes.push(0);
}

function pushShort(targetBytes, shortValue) {
  // eslint-disable-next-line no-bitwise
  targetBytes.push(shortValue & 255, (shortValue >> 8) & 255);
}

export function encodeGif(sourcePixels, imageWidth, imageHeight, options = {}) {
  const wantsTransparency = options.transparent !== false;
  const hasTransparency =
    wantsTransparency && hasFullyTransparentPixel(sourcePixels);
  const colorsLimit = hasTransparency ? MAX_PALETTE_SIZE - 1 : MAX_PALETTE_SIZE;
  const paletteColors = buildPalette(sourcePixels, colorsLimit);
  const transparentIndex = hasTransparency ? paletteColors.length : -1;
  const colorIndexes = mapPixelsToPalette(
    sourcePixels,
    imageWidth,
    imageHeight,
    paletteColors,
    { transparentIndex, dither: options.dither }
  );
  const fullPalette = hasTransparency
    ? paletteColors.concat([[0, 0, 0]])
    : paletteColors.slice();
  let paletteBits = 1;
  // eslint-disable-next-line no-bitwise
  while (1 << paletteBits < fullPalette.length) {
    paletteBits += 1;
  }
  // eslint-disable-next-line no-bitwise
  const paletteSize = 1 << paletteBits;

  const fileBytes = [];
  "GIF89a"
    .split("")
    .forEach((oneChar) => fileBytes.push(oneChar.charCodeAt(0)));
  pushShort(fileBytes, imageWidth);
  pushShort(fileBytes, imageHeight);
  // Global color table is here, the color resolution is the usual 8 bits
  fileBytes.push(240 + (paletteBits - 1), 0, 0);
  for (let colorIndex = 0; colorIndex < paletteSize; colorIndex += 1) {
    const oneColor = fullPalette[colorIndex] || [0, 0, 0];
    fileBytes.push(oneColor[0], oneColor[1], oneColor[2]);
  }
  if (hasTransparency) {
    fileBytes.push(33, 249, 4, 1, 0, 0, transparentIndex, 0);
  }
  fileBytes.push(44);
  pushShort(fileBytes, 0);
  pushShort(fileBytes, 0);
  pushShort(fileBytes, imageWidth);
  pushShort(fileBytes, imageHeight);
  fileBytes.push(0);
  const minCodeSize = Math.max(2, paletteBits);
  fileBytes.push(minCodeSize);
  pushSubBlocks(fileBytes, lzwEncodeIndexes(colorIndexes, minCodeSize));
  fileBytes.push(59);
  return new Uint8Array(fileBytes);
}

function hasFullyTransparentPixel(sourcePixels) {
  for (
    let pixelOffset = 3;
    pixelOffset < sourcePixels.length;
    pixelOffset += 4
  ) {
    if (sourcePixels[pixelOffset] < TRANSPARENCY_THRESHOLD) {
      return true;
    }
  }
  return false;
}
