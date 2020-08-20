import "emoji-mart/css/emoji-mart.css";

import React, { useState } from "react";
import styled, { createGlobalStyle } from "styled-components";

import { Picker } from "emoji-mart";
import TextBlock from "../generic/TextBlockBefore";
import Textarea from "../generic/Textarea";

const FlexWrap = styled.div`
  display: flex;
  column-gap: 30px;
  row-gap: 30px;

  @media (max-width: 768px) {
    flex-direction: column-reverse;
  }
`;
const OneFlexColumn = styled.div`
  flex-grow: 1;
`;
const OverrideStylesForTextarea = createGlobalStyle`
.emoji-special-textarea {
  font-size: 40px;
  height: 405px;

  @media (max-width: 768px) {
    height: 70px !important;
  }
}
`;

export default function EmojiComponent() {
  const [currentEmojiFieldValue, setCurrentEmoji] = useState("");

  const addEmoji = (emojiObject) => {
    setCurrentEmoji(currentEmojiFieldValue + emojiObject.native);
  };

  const onChangeCurrentEmoji = (event) => {
    setCurrentEmoji(event.target.value);
  };

  return (
    <>
      <OverrideStylesForTextarea />
      <TextBlock>
        <p>
          Click on any emoji, it will appear in textarea. Then you can copy it
          in the clipboard.
        </p>
      </TextBlock>
      <FlexWrap>
        <OneFlexColumn>
          <Picker native={true} onSelect={addEmoji} title="Pick emoji" />
        </OneFlexColumn>
        <OneFlexColumn>
          <Textarea
            label="Result"
            value={currentEmojiFieldValue}
            onChange={onChangeCurrentEmoji}
            hasClipboardButton
            className="emoji-special-textarea"
          ></Textarea>
        </OneFlexColumn>
      </FlexWrap>
    </>
  );
}
