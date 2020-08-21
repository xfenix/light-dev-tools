import "emoji-mart/css/emoji-mart.css";

import { ChromePicker, SwatchesPicker } from "react-color";
import React, { useState } from "react";

import TextBlock from "../generic/TextBlockBefore";
import Textarea from "../generic/Textarea";
import styled from "styled-components";

const DefaultTextareaStyle = { height: "60px" };
const AllControlsWrap = styled.div`
  @media (max-width: 450px) {
    display: flex;
    flex-flow: column-reverse;
  }
`;
const InputsBox = styled.div`
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  grid-gap: 30px;
  margin-bottom: 30px;

  @media (max-width: 450px) {
    display: flex;
    flex-flow: column;
    row-gap: 30px;
    margin-bottom: 0;
  }
`;
const PickersBox = styled.div`
  display: flex;

  & > div {
    margin-right: 30px;
  }

  @media (max-width: 450px) {
    flex-flow: column;

    & > div {
      margin-bottom: 30px;
    }
  }
`;

export default function ColorComponent() {
  const [currentColor, setCurrentColor] = useState({});

  const onChangeColor = (colorObject) => {
    setCurrentColor(colorObject);
  };

  return (
    <>
      <TextBlock>
        <p>
          Click on any emoji, it will appear in textarea. Then you can copy it
          in the clipboard.
        </p>
      </TextBlock>
      <AllControlsWrap>
        <InputsBox>
          <Textarea
            label="Hex"
            style={DefaultTextareaStyle}
            notHasResetButton
            hasClipboardButton
            compactClipboardButton
            readOnly
            value={currentColor.hex}
          />
          <Textarea
            label="RGBA"
            style={DefaultTextareaStyle}
            notHasResetButton
            hasClipboardButton
            compactClipboardButton
            readOnly
            value={
              currentColor.rgb
                ? `rgba(${currentColor.rgb.r}, ${currentColor.rgb.g}, ${currentColor.rgb.b}, ${currentColor.rgb.a})`
                : ""
            }
          />
          <Textarea
            label="RGB"
            style={DefaultTextareaStyle}
            notHasResetButton
            hasClipboardButton
            compactClipboardButton
            readOnly
            value={
              currentColor.rgb
                ? `rgb(${currentColor.rgb.r}, ${currentColor.rgb.g}, ${currentColor.rgb.b})`
                : ""
            }
          />
        </InputsBox>
        <PickersBox>
          <ChromePicker
            color={currentColor ? currentColor.rgb : ""}
            onChange={onChangeColor}
          />
          <SwatchesPicker
            color={currentColor ? currentColor.rgb : ""}
            onChange={onChangeColor}
          />
        </PickersBox>
      </AllControlsWrap>
    </>
  );
}
