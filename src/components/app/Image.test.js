import {
  buildIcoFile,
  detectFormatKey,
  encodeBmp,
  findOutputFormat,
  buildOutputFileName,
} from "../../misc/ImageCodecs";
import {
  MAX_IMAGE_SIDE,
  computeResizePlan,
  cropPixels,
  describeSizeProblem,
  flattenPixels,
  formatByteSize,
  halvePixels,
  normalizeCropRect,
  parseHexColor,
  reducePixelsByHalves,
  resamplePixels,
} from "../../misc/ImageProcessing";
import {
  buildPalette,
  encodeGif,
  lzwEncodeIndexes,
} from "../../misc/GifEncoder";

import ImageComponent from "./Image";
import React from "react";
import { render, screen } from "@testing-library/react";

const makeFlatPixels = (imageWidth, imageHeight, colorValues) => {
  const somePixels = new Uint8ClampedArray(imageWidth * imageHeight * 4);
  for (let pixelOffset = 0; pixelOffset < somePixels.length; pixelOffset += 4) {
    somePixels.set(colorValues, pixelOffset);
  }
  return somePixels;
};

// The gif spec packs the codes into a bit stream, this is the reading side of
// it, needed to check that the encoder is not lying to the decoders
const lzwDecodeIndexes = (streamBytes, minCodeSize) => {
  const clearCode = 1 << minCodeSize;
  const endCode = clearCode + 1;
  let codeSize = minCodeSize + 1;
  let codeTable = [];
  let previousEntry = null;
  const resultIndexes = [];
  let bitsBuffer = 0;
  let bitsCount = 0;
  let byteIndex = 0;

  const resetTable = () => {
    codeTable = [];
    for (let codeValue = 0; codeValue < clearCode; codeValue += 1) {
      codeTable.push([codeValue]);
    }
    codeTable.push([]);
    codeTable.push([]);
    codeSize = minCodeSize + 1;
    previousEntry = null;
  };
  resetTable();

  while (true) {
    while (bitsCount < codeSize) {
      if (byteIndex >= streamBytes.length) {
        return resultIndexes;
      }
      bitsBuffer |= streamBytes[byteIndex] << bitsCount;
      byteIndex += 1;
      bitsCount += 8;
    }
    const codeValue = bitsBuffer & ((1 << codeSize) - 1);
    bitsBuffer >>= codeSize;
    bitsCount -= codeSize;
    if (codeValue === clearCode) {
      resetTable();
      continue;
    }
    if (codeValue === endCode) {
      return resultIndexes;
    }
    let currentEntry = null;
    if (codeValue < codeTable.length) {
      currentEntry = codeTable[codeValue];
    } else {
      currentEntry = previousEntry.concat([previousEntry[0]]);
    }
    resultIndexes.push.apply(resultIndexes, currentEntry);
    if (previousEntry) {
      codeTable.push(previousEntry.concat([currentEntry[0]]));
      if (codeTable.length >= 1 << codeSize && codeSize < 12) {
        codeSize += 1;
      }
    }
    previousEntry = currentEntry;
  }
};

const readGifSubBlocks = (fileBytes, fromOffset) => {
  const streamBytes = [];
  let currentOffset = fromOffset;
  while (fileBytes[currentOffset] !== 0) {
    const blockSize = fileBytes[currentOffset];
    for (let byteIndex = 0; byteIndex < blockSize; byteIndex += 1) {
      streamBytes.push(fileBytes[currentOffset + 1 + byteIndex]);
    }
    currentOffset += blockSize + 1;
  }
  return streamBytes;
};

test("resize plan respects the mode and never upscales silently", () => {
  const fitPlan = computeResizePlan({
    sourceWidth: 1000,
    sourceHeight: 500,
    boxWidth: 300,
    boxHeight: 300,
    mode: "fit",
  });
  expect(fitPlan.width).toBe(300);
  expect(fitPlan.height).toBe(150);
  expect(fitPlan.cropRect).toEqual({
    left: 0,
    top: 0,
    width: 1000,
    height: 500,
  });

  const coverPlan = computeResizePlan({
    sourceWidth: 1000,
    sourceHeight: 500,
    boxWidth: 300,
    boxHeight: 300,
    mode: "cover",
  });
  expect(coverPlan.width).toBe(300);
  expect(coverPlan.height).toBe(300);
  expect(coverPlan.cropRect.width).toBe(500);
  expect(coverPlan.cropRect.left).toBe(250);

  const stretchPlan = computeResizePlan({
    sourceWidth: 1000,
    sourceHeight: 500,
    boxWidth: 320,
    boxHeight: 240,
    mode: "stretch",
  });
  expect(stretchPlan.width).toBe(320);
  expect(stretchPlan.height).toBe(240);

  const keptPlan = computeResizePlan({
    sourceWidth: 100,
    sourceHeight: 100,
    boxWidth: 400,
    boxHeight: 400,
    mode: "fit",
  });
  expect(keptPlan.width).toBe(100);
  const upscaledPlan = computeResizePlan({
    sourceWidth: 100,
    sourceHeight: 100,
    boxWidth: 400,
    boxHeight: 400,
    mode: "fit",
    allowUpscale: true,
  });
  expect(upscaledPlan.width).toBe(400);

  // the exact size mode has to respect the upscale switch as well
  const exactPlan = computeResizePlan({
    sourceWidth: 100,
    sourceHeight: 80,
    boxWidth: 400,
    boxHeight: 40,
    mode: "stretch",
  });
  expect(exactPlan.width).toBe(100);
  expect(exactPlan.height).toBe(40);
  const exactUpscaledPlan = computeResizePlan({
    sourceWidth: 100,
    sourceHeight: 80,
    boxWidth: 400,
    boxHeight: 40,
    mode: "stretch",
    allowUpscale: true,
  });
  expect(exactUpscaledPlan.width).toBe(400);
});

test("sizes nobody can allocate are refused", () => {
  expect(describeSizeProblem(4000, 3000)).toBe("");
  expect(describeSizeProblem(MAX_IMAGE_SIDE, 1)).toBe("");
  expect(describeSizeProblem(MAX_IMAGE_SIDE + 1, 1)).toMatch(/side cannot be/);
  expect(describeSizeProblem(0, 100)).toMatch(/at least one pixel/);
  expect(describeSizeProblem(16000, 16000)).toMatch(/megapixel limit/);
});

test("crop rectangle is clamped to the image", () => {
  expect(
    normalizeCropRect({ left: -10, top: 5, width: 999, height: 4 }, 50, 40)
  ).toEqual({ left: 0, top: 5, width: 50, height: 4 });
  expect(normalizeCropRect(null, 8, 6)).toEqual({
    left: 0,
    top: 0,
    width: 8,
    height: 6,
  });

  const sourcePixels = new Uint8ClampedArray(4 * 2 * 4);
  sourcePixels[(1 * 4 + 2) * 4] = 123;
  const croppedPixels = cropPixels(sourcePixels, 4, {
    left: 2,
    top: 1,
    width: 2,
    height: 1,
  });
  expect(croppedPixels.length).toBe(8);
  expect(croppedPixels[0]).toBe(123);
});

test("resampling keeps the color, the brightness and the transparency", () => {
  const flatPixels = makeFlatPixels(8, 8, [10, 120, 250, 255]);
  const smallerPixels = resamplePixels(flatPixels, 8, 8, 3, 3);
  expect(smallerPixels.length).toBe(3 * 3 * 4);
  for (
    let pixelOffset = 0;
    pixelOffset < smallerPixels.length;
    pixelOffset += 4
  ) {
    expect(smallerPixels[pixelOffset]).toBe(10);
    expect(smallerPixels[pixelOffset + 1]).toBe(120);
    expect(smallerPixels[pixelOffset + 2]).toBe(250);
    expect(smallerPixels[pixelOffset + 3]).toBe(255);
  }

  // A black and white checkerboard has to average into the middle gray, the
  // naive resize without the gamma correction gives a way too dark 128 here
  const checkerPixels = new Uint8ClampedArray(2 * 2 * 4);
  [0, 3].forEach((pixelIndex) => {
    checkerPixels.set([255, 255, 255, 255], pixelIndex * 4);
  });
  [1, 2].forEach((pixelIndex) => {
    checkerPixels.set([0, 0, 0, 255], pixelIndex * 4);
  });
  const grayPixels = resamplePixels(checkerPixels, 2, 2, 1, 1);
  expect(grayPixels[0]).toBeGreaterThan(180);
  expect(grayPixels[0]).toBeLessThan(195);

  // A fully transparent red neighbour must not tint the opaque green one
  const alphaPixels = new Uint8ClampedArray(2 * 1 * 4);
  alphaPixels.set([0, 255, 0, 255], 0);
  alphaPixels.set([255, 0, 0, 0], 4);
  const mixedPixels = resamplePixels(alphaPixels, 2, 1, 1, 1);
  expect(mixedPixels[0]).toBe(0);
  expect(mixedPixels[1]).toBe(255);
  expect(mixedPixels[3]).toBe(128);
});

test("halving runs only while both sides are even", () => {
  const evenPixels = makeFlatPixels(8, 8, [40, 40, 40, 255]);
  const halvedStep = halvePixels(evenPixels, 8, 8, true);
  expect(halvedStep.width).toBe(4);
  expect(halvedStep.pixels[0]).toBe(40);

  const reducedStep = reducePixelsByHalves(evenPixels, 8, 8, 2, 2, true);
  expect(reducedStep.width).toBe(2);
  expect(reducedStep.height).toBe(2);

  const oddPixels = makeFlatPixels(7, 7, [40, 40, 40, 255]);
  const notReducedStep = reducePixelsByHalves(oddPixels, 7, 7, 2, 2, true);
  expect(notReducedStep.width).toBe(7);
});

test("flattening puts the half transparent pixel onto the background", () => {
  const halfPixels = new Uint8ClampedArray([0, 0, 0, 128]);
  const flatPixels = flattenPixels(halfPixels, parseHexColor("#ffffff"));
  expect(flatPixels[0]).toBe(127);
  expect(flatPixels[3]).toBe(255);
  expect(parseHexColor("#0f8")).toEqual({ red: 0, green: 255, blue: 136 });
  expect(parseHexColor("nonsense")).toEqual({
    red: 255,
    green: 255,
    blue: 255,
  });
});

test("format is taken from the bytes and not from the name", () => {
  expect(
    detectFormatKey(new Uint8Array([137, 80, 78, 71, 13, 10]), "a.jpg")
  ).toBe("png");
  expect(detectFormatKey(new Uint8Array([255, 216, 255, 224]), "a.png")).toBe(
    "jpeg"
  );
  expect(detectFormatKey(new Uint8Array([73, 73, 42, 0]), "a.bin")).toBe(
    "tiff"
  );
  expect(detectFormatKey(new Uint8Array([66, 77, 0, 0]), "a.bin")).toBe("bmp");
  expect(detectFormatKey(new Uint8Array([0, 0, 1, 0]), "a.bin")).toBe("ico");
  const heicHead = new Uint8Array(16);
  heicHead.set([0, 0, 0, 24], 0);
  heicHead.set(
    "ftypheic".split("").map((oneChar) => oneChar.charCodeAt(0)),
    4
  );
  expect(detectFormatKey(heicHead, "IMG_0001.HEIC")).toBe("heic");
  const svgHead = new Uint8Array(
    "<svg xmlns='x'>".split("").map((oneChar) => oneChar.charCodeAt(0))
  );
  expect(detectFormatKey(svgHead, "a.svg")).toBe("svg");
  expect(detectFormatKey(new Uint8Array([1, 2, 3, 4]), "photo.jxl")).toBe(
    "jxl"
  );
  expect(detectFormatKey(new Uint8Array([1, 2, 3, 4]), "photo.strange")).toBe(
    "unknown"
  );
});

test("bmp is written with the right header and row order", () => {
  const somePixels = new Uint8ClampedArray([
    1, 2, 3, 255, 4, 5, 6, 255, 7, 8, 9, 255, 10, 11, 12, 255,
  ]);
  const bmpBytes = encodeBmp(somePixels, 2, 2);
  const bmpView = new DataView(bmpBytes.buffer);
  expect(bmpBytes[0]).toBe(66);
  expect(bmpBytes[1]).toBe(77);
  expect(bmpView.getUint32(2, true)).toBe(bmpBytes.length);
  expect(bmpView.getUint32(14, true)).toBe(40);
  expect(bmpView.getUint16(28, true)).toBe(24);
  // the last row of the image goes first and the channels are swapped
  const pixelsOffset = bmpView.getUint32(10, true);
  expect(Array.from(bmpBytes.slice(pixelsOffset, pixelsOffset + 3))).toEqual([
    9, 8, 7,
  ]);

  const alphaBytes = encodeBmp(
    new Uint8ClampedArray([1, 2, 3, 128, 4, 5, 6, 255]),
    2,
    1
  );
  const alphaView = new DataView(alphaBytes.buffer);
  expect(alphaView.getUint32(14, true)).toBe(108);
  expect(alphaView.getUint16(28, true)).toBe(32);
  expect(alphaView.getUint32(66, true)).toBe(0xff000000);
});

test("ico wraps the png into the directory", () => {
  const pngBytes = new Uint8Array([137, 80, 78, 71, 1, 2, 3]);
  const icoBytes = buildIcoFile(pngBytes, 256, 32);
  const icoView = new DataView(icoBytes.buffer);
  expect(icoView.getUint16(2, true)).toBe(1);
  expect(icoView.getUint16(4, true)).toBe(1);
  // 256 does not fit into one byte and is written as a zero by the spec
  expect(icoBytes[6]).toBe(0);
  expect(icoBytes[7]).toBe(32);
  expect(icoView.getUint32(14, true)).toBe(pngBytes.length);
  expect(icoView.getUint32(18, true)).toBe(22);
  expect(Array.from(icoBytes.slice(22))).toEqual(Array.from(pngBytes));
});

test("lzw stream decodes back into the very same indexes", () => {
  const someIndexes = [];
  for (let stepIndex = 0; stepIndex < 5000; stepIndex += 1) {
    someIndexes.push((stepIndex * 7 + Math.floor(stepIndex / 13)) % 256);
  }
  const streamBytes = lzwEncodeIndexes(new Uint8Array(someIndexes), 8);
  expect(lzwDecodeIndexes(streamBytes, 8)).toEqual(someIndexes);
});

test("gif file carries the palette and the pixels of the image", () => {
  const somePixels = new Uint8ClampedArray(4 * 4 * 4);
  for (let pixelIndex = 0; pixelIndex < 16; pixelIndex += 1) {
    const isRed = pixelIndex % 2 === 0;
    somePixels.set(isRed ? [255, 0, 0, 255] : [0, 0, 255, 255], pixelIndex * 4);
  }
  const gifBytes = encodeGif(somePixels, 4, 4, { dither: false });
  expect(String.fromCharCode.apply(null, gifBytes.slice(0, 6))).toBe("GIF89a");
  expect(gifBytes[gifBytes.length - 1]).toBe(59);

  const paletteBits = (gifBytes[10] & 7) + 1;
  const paletteSize = 1 << paletteBits;
  const paletteOffset = 13;
  const imageOffset = paletteOffset + paletteSize * 3;
  expect(gifBytes[imageOffset]).toBe(44);
  const minCodeSize = gifBytes[imageOffset + 10];
  const colorIndexes = lzwDecodeIndexes(
    readGifSubBlocks(gifBytes, imageOffset + 11),
    minCodeSize
  );
  expect(colorIndexes.length).toBe(16);
  const decodedColors = colorIndexes.map((oneIndex) =>
    Array.from(
      gifBytes.slice(
        paletteOffset + oneIndex * 3,
        paletteOffset + oneIndex * 3 + 3
      )
    )
  );
  expect(decodedColors[0]).toEqual([255, 0, 0]);
  expect(decodedColors[1]).toEqual([0, 0, 255]);
});

test("gif refuses the sizes the format cannot describe", () => {
  const onePixel = new Uint8ClampedArray([1, 2, 3, 255]);
  expect(() => encodeGif(onePixel, 65536, 1)).toThrow(/gif side/);
  expect(() => encodeGif(onePixel, 0, 1)).toThrow(/gif side/);
  expect(encodeGif(onePixel, 1, 1).length).toBeGreaterThan(0);
});

test("the palette survives a picture with a lot of colors", () => {
  const somePixels = new Uint8ClampedArray(64 * 64 * 4);
  for (let pixelIndex = 0; pixelIndex < 64 * 64; pixelIndex += 1) {
    somePixels.set(
      [pixelIndex % 256, (pixelIndex * 7) % 256, (pixelIndex * 13) % 256, 255],
      pixelIndex * 4
    );
  }
  const paletteColors = buildPalette(somePixels, 256);
  expect(paletteColors.length).toBeLessThanOrEqual(256);
  expect(paletteColors.length).toBeGreaterThan(16);

  // a handful of flat colors still comes back untouched
  const flatPixels = new Uint8ClampedArray([
    255, 0, 0, 255, 0, 0, 255, 255, 255, 0, 0, 255,
  ]);
  expect(buildPalette(flatPixels, 256).sort()).toEqual(
    [
      [255, 0, 0],
      [0, 0, 255],
    ].sort()
  );
});

test("output file keeps the name and gets the new extension", () => {
  expect(buildOutputFileName("my photo.HEIC", findOutputFormat("webp"))).toBe(
    "my photo.webp"
  );
  expect(buildOutputFileName("", findOutputFormat("jpeg"))).toBe("image.jpg");
  expect(formatByteSize(999)).toBe("999 B");
  expect(formatByteSize(2048)).toBe("2.0 KB");
  expect(formatByteSize(5 * 1024 * 1024)).toBe("5.0 MB");
});

test("the tool renders the drop zone and waits for a file", () => {
  render(<ImageComponent />);
  expect(screen.getByText(/Drag an image here/)).toBeInTheDocument();
  expect(screen.getByText("No image loaded yet.")).toBeInTheDocument();
});
