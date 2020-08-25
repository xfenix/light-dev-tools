import React, { useState } from "react";

import TextBlock from "../generic/TextBlockBefore";
import Textarea from "../generic/Textarea";

export default function CalculatorComponent() {
  const [currentValue, setCurrentCalcValue] = useState("");
  const [calculatedResultValue, setCalculatedResultValue] = useState("");

  const safeEval = (expressionStr) => {
    return new Function("return " + expressionStr)(); // eslint-disable-line no-new-func
  };

  const onChangeCalc = (event) => {
    setCurrentCalcValue(event.target.value);
    try {
      setCalculatedResultValue(safeEval(event.target.value));
    } catch {}
  };

  return (
    <>
      <TextBlock>
        <p>
          Simple calculator. Write any expression in input field and got
          calculated result in result.
        </p>
        <p>
          <strong className="dangerous">WARNING!</strong> This feature can be
          dangerous. Dont paste any code from the internet in in &laquo;input
          expression&raquo; field.
        </p>
      </TextBlock>
      <Textarea
        label="Input expression"
        value={currentValue}
        onChange={onChangeCalc}
        className="emoji-special-textarea"
        style={{ fontSize: "120%" }}
        smallest
      />
      <Textarea
        label="Result"
        defaultValue={calculatedResultValue}
        className="emoji-special-textarea"
        hasClipboardButton
        readOnly
        style={{ fontSize: "200%", height: "65px" }}
      ></Textarea>
    </>
  );
}
