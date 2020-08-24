import React, { useState } from "react";

import TextBlock from "../generic/TextBlockBefore";
import Textarea from "../generic/Textarea";

export default function CalculatorComponent() {
  const [currentValue, setCurrentCalcValue] = useState("");
  const [calculatedResultValue, setCalculatedResultValue] = useState("");

  const safeEval = (expressionStr) => {
    return new Function("return " + expressionStr)();
  };

  const onChangeCalc = (event) => {
    setCurrentCalcValue(event.target.value);
    try {
      setCalculatedResultValue(safeEval(event.target.value));
    } catch {}
  };

  return (
    <>
      <TextBlock>Simple calculator.</TextBlock>
      <Textarea
        label="Input expression"
        value={currentValue}
        onChange={onChangeCalc}
        className="emoji-special-textarea"
      />
      <Textarea
        label="Result"
        defaultValue={calculatedResultValue}
        className="emoji-special-textarea"
        hasClipboardButton
        readOnly
      ></Textarea>
    </>
  );
}
