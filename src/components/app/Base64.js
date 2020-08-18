import React, { useState } from "react";

import { Base64 } from "js-base64";
import TextBlock from "../generic/TextBlockBefore";
import Textarea from "../generic/Textarea";

export default function Base64Component() {
  const [inputValue, setInput] = useState("");
  const [outputValue, setOutput] = useState("");
  const [isInputGood, setInputStatusIsGood] = useState(true);
  const setNewInputValue = (event) => {
    const newValue = event.target.value;
    if (newValue !== inputValue) {
      const newOutputValue = Base64.encode(newValue);
      setInput(newValue);
      setOutput(newOutputValue);
      setInputStatusIsGood(true);
    }
  };
  const setNewOutputValue = (event) => {
    const newValue = event.target.value;
    if (newValue !== outputValue) {
      setOutput(newValue);
      try {
        setInput(Base64.decode(newValue));
        setInputStatusIsGood(true);
      } catch (error) {
        setInput(
          `Cant decode to plain text, seems base64 payload is broken.\n\nWe got following error: [${error}]`
        );
        setInputStatusIsGood(false);
      }
    }
  };

  return (
    <>
      <TextBlock>
        <p>Usage scenarios:</p>
        <ul>
          <li>Place plain text in first input and get base64 from second</li>
          <li>
            Or place base64 encoded payload in second and get text in first
          </li>
        </ul>
      </TextBlock>
      <Textarea
        label="Plain text"
        onChange={setNewInputValue}
        value={inputValue}
        className={isInputGood ? "" : "errorfield"}
        hasClipboardButton
        medium
      ></Textarea>
      <Textarea
        label="Base64"
        onChange={setNewOutputValue}
        value={outputValue}
        hasClipboardButton
        medium
      ></Textarea>
    </>
  );
}
