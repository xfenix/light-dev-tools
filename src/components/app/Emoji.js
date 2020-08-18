import "emoji-mart/css/emoji-mart.css";

import React, { useState } from "react";

import { Picker } from "emoji-mart";
import TextBlock from "../generic/TextBlockBefore";
import Textarea from "../generic/Textarea";
import styled from "styled-components";

const FlexWrap = styled.div`
  display: flex;
  column-gap: 30px;
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
      <TextBlock>
        <p>
          Click on any emoji, it will appear in textarea. Then you can copy it
          in the clipboard.
        </p>
      </TextBlock>
      <FlexWrap>
        <div>
          <Picker native={true} onSelect={addEmoji} title="Pick emoji" />
        </div>
        <div>
          <Textarea
            label="Result"
            value={currentEmojiFieldValue}
            onChange={onChangeCurrentEmoji}
            hasClipboardButton
            medium
            style={{ fontSize: "40px", height: "405px" }}
          ></Textarea>
        </div>
      </FlexWrap>
    </>
  );
}
