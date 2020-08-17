import React, { useState } from "react";
import Textarea from "../generic/Textarea";
import TextBlock from "../generic/TextBlock";
import { Base64 } from "js-base64";

export default function Base64Component() {
  const [inputValue, setInput] = useState("");
  const [outputValue, setOutput] = useState("");
  const [isInputGood, setInputStatusIsGood] = useState(true);
  const setNewInputValue = (newValue) => {
    if (newValue != inputValue) {
      setInput(newValue);
      let newOutputValue = Base64.encode(newValue);
      setOutput(newOutputValue);
      setInputStatusIsGood(true);
    }
  };
  const setNewOutputValue = (newValue) => {
    if (newValue != outputValue) {
      setOutput(newValue);
      try {
        setInput(Base64.decode(newValue));
        setInputStatusIsGood(true);
      } catch (error) {
        setInput(
          `Cant covert this data, seems base64 is not valid.\nWe got following error: ${error}`
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
          <li>Place plain text in first input and get base64 from second.</li>
          <li>
            Or place base64 encoded payload in second and get text in first.
          </li>
        </ul>
      </TextBlock>
      <Textarea
        label="Plain text"
        onChange={(event) => setNewInputValue(event.target.value)}
        value={inputValue}
        className={isInputGood ? "" : "errorfield"}
        needClipboardButton={true}
      ></Textarea>
      <Textarea
        label="Base64"
        onChange={(event) => setNewOutputValue(event.target.value)}
        value={outputValue}
        needClipboardButton={true}
      ></Textarea>
    </>
  );
}
