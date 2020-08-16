import React, { useState } from "react";
import Textarea from "../generic/Textarea";
import { styled } from "styled-components";

export default function Base64Component(props) {
  const [inputValue, setInput] = useState("");
  const [outputValue, setOutput] = useState("");

  console.log(inputValue, outputValue);

  return (
    <>
      <Textarea
        label="Input"
        onChange={(event) => setInput(event.target.value)}
      >
        {inputValue}
      </Textarea>
      <Textarea
        label="Output"
        onChange={(event) => setOutput(event.target.value)}
      >
        {outputValue}
      </Textarea>
    </>
  );
}
