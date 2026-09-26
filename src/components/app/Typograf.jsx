import React, { useState } from "react";

import TextBlock from "../generic/TextBlockBefore";
import Textarea from "../generic/Textarea";
import Typograf from "typograf";

export default function TypografComponent() {
  const [currentValue, setCurrentInputValue] = useState("");
  const [outputValue, setCurrentOutputValue] = useState("");
  const typografActor = new Typograf({ locale: ["ru", "en-US"] });

  const onChangeInputText = (event) => {
    setCurrentInputValue(event.target.value);
    setCurrentOutputValue(typografActor.execute(event.target.value));
  };

  return (
    <>
      <TextBlock>Typograf helps you to build perfect text for web.</TextBlock>
      <Textarea
        label="Input text"
        value={currentValue}
        onChange={onChangeInputText}
        className="emoji-special-textarea"
        big
      />
      <Textarea
        label="Ready text"
        defaultValue={outputValue}
        className="emoji-special-textarea"
        hasClipboardButton
        big
      />
    </>
  );
}
