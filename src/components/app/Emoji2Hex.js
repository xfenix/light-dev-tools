import "emoji-mart/css/emoji-mart.css";

import React, { useState } from "react";

import { Picker } from "emoji-mart/dist-modern/index";
import TextBlock from "../generic/TextBlockBefore";
import Textarea from "../generic/Textarea";
import styled from "styled-components";

const FlexWrap = styled.div`
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  grid-gap: 30px;

  @media (max-width: 650px) {
    grid-gap: 0;
    display: flex;
    flex-direction: column-reverse;
  }
`;
const OneFlexColumn = styled.div`
  @media (max-width: 650px) {
    &:first-child {
      margin-top: 30px;
    }
  }
`;

export default function Emoji2HexComponent() {
  const [currentEmojiHexCode, setCurrentEmojiCode] = useState("");

  const convertEmojiPartToCode = (oneEmoji) => {
    let comp;
    if (oneEmoji.length === 1) {
      comp = oneEmoji.charCodeAt(0);
    }
    comp =
      (oneEmoji.charCodeAt(0) - 0xd800) * 0x400 +
      (oneEmoji.charCodeAt(1) - 0xdc00) +
      0x10000;
    if (comp < 0) {
      comp = oneEmoji.charCodeAt(0);
    }
    return comp;
  };

  const convertEmojiToHex = (emojiNative) => {
    let outputBuffer = [];
    for (let letter of emojiNative) {
      let emojiCode = convertEmojiPartToCode(letter);
      if (isNaN(emojiCode)) {
        emojiCode = letter.charCodeAt(0);
      }
      outputBuffer.push(`&#x${emojiCode.toString(16)};`);
    }
    return outputBuffer.join("");
  };

  const onChangeCurrentEmoji = (emojiObject) => {
    setCurrentEmojiCode(convertEmojiToHex(emojiObject.native));
  };

  return (
    <>
      <TextBlock>
        <p>Click on any emoji and get html compatible codes for it.</p>
      </TextBlock>
      <FlexWrap>
        <OneFlexColumn>
          <Picker
            native={true}
            onSelect={onChangeCurrentEmoji}
            title="Pick emoji"
          />
        </OneFlexColumn>
        <OneFlexColumn>
          <Textarea
            label="HEX"
            defaultValue={currentEmojiHexCode}
            style={{ fontSize: "35px" }}
            medium
            hasClipboardButton
            readOnly
          ></Textarea>
        </OneFlexColumn>
      </FlexWrap>
    </>
  );
}
