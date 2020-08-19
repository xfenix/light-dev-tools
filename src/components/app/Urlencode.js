import React, { useState } from "react";

import TextBlock from "../generic/TextBlockBefore";
import Textarea from "../generic/Textarea";

export default function UrlencodeComponent() {
  const [inputValue, setInput] = useState("");
  const [outputValue, setOutput] = useState("");
  const [isInputGood, setInputStatusIsGood] = useState(true);

  const setNewInputValue = (event) => {
    const newValue = event.target.value;
    if (newValue !== inputValue) {
      setInput(newValue);
      setOutput(encodeURI(newValue));
      setInputStatusIsGood(true);
    }
  };

  const setNewOutputValue = (event) => {
    const newValue = event.target.value;
    if (newValue !== outputValue) {
      try {
        setOutput(newValue);
        setInput(decodeURI(newValue));
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
        <p>Just helper for url encoding & decoding.</p>
      </TextBlock>
      <Textarea
        label="Url to encode"
        value={inputValue}
        className={isInputGood ? "" : "errorfield"}
        onChange={setNewInputValue}
        hasClipboardButton
        small
      ></Textarea>
      <Textarea
        label="Url to decode"
        value={outputValue}
        onChange={setNewOutputValue}
        hasClipboardButton
        small
      ></Textarea>
    </>
  );
}
