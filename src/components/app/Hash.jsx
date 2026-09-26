import React, { useState } from "react";

import Hashes from "jshashes";
import RadioGroup from "../generic/RadioGroup";
import TextBlock from "../generic/TextBlockBefore";
import Textarea from "../generic/Textarea";

const AVAIL_HASHES = ["MD5", "SHA1", "SHA256", "SHA512"];

export default function HashComponent() {
  const [currentHash, setCurrentHash] = useState(AVAIL_HASHES[0]);
  const [inputValue, setInput] = useState("");
  const [outputValue, setOutput] = useState("");

  const onHashInput = (event) => {
    const newValue = event.target.value;
    if (newValue !== inputValue) {
      setInput(newValue);
      setOutput(new Hashes[currentHash]().hex(newValue));
    }
  };

  const onHashSelect = (event) => {
    setCurrentHash(event.target.value);
    setOutput(new Hashes[event.target.value]().hex(inputValue));
  };

  return (
    <>
      <TextBlock>
        <p>Select hash type, provide input and get the hex digest.</p>
      </TextBlock>
      <RadioGroup
        titleValues={AVAIL_HASHES}
        onChange={onHashSelect}
        groupKey="hashfn"
      />
      <Textarea
        label="Input"
        onChange={onHashInput}
        value={inputValue}
        wrapperClassName="inputgroup"
        small
      ></Textarea>
      <Textarea
        label="Hash digest"
        defaultValue={outputValue}
        wrapperClassName="inputgroup"
        hasClipboardButton
        smallest
        readOnly
      ></Textarea>
    </>
  );
}
