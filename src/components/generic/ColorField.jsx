import * as settings from "../../misc/Settings";

import React, { useEffect, useState } from "react";

import { ChromePicker } from "react-color";
import styled from "styled-components";

const SHORT_HEX_LENGTH = 3;

const FieldWrap = styled.div`
  min-width: 0;
`;
const FieldRow = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  min-width: 0;
`;
const SwatchButton = styled.button`
  flex: none;
  width: 38px;
  height: 38px;
  padding: 0;
  border-radius: ${settings.BORDER_RADIUS};
  border: 2px solid ${settings.BLACK_COLOR};
  cursor: pointer;
  outline: none;
`;
const HexInput = styled.input`
  width: 100%;
  min-width: 0;
  padding: 8px 10px;
  font-family: inherit;
  font-size: 15px;
  text-transform: lowercase;
  color: ${settings.BLACK_COLOR};
  border: 2px solid ${settings.LIGHT_GREY_COLOR};
  border-radius: ${settings.BORDER_RADIUS};
  box-sizing: border-box;
  background: ${settings.WHITE_COLOR};
  transition: border-color 0.2s;

  &:focus {
    outline: none;
    border-color: ${settings.BLACK_COLOR};
  }
`;
const ToggleLink = styled.button`
  flex: none;
  padding: 0;
  font-family: inherit;
  font-size: 85%;
  color: ${settings.GREY_COLOR};
  background: none;
  border: none;
  border-bottom: 1px dashed ${settings.GREY_COLOR};
  cursor: pointer;

  &:hover {
    color: ${settings.BLACK_COLOR};
    border-bottom-color: ${settings.BLACK_COLOR};
  }
`;
// The picker takes its place in the flow instead of floating above the form:
// nothing ends up hidden under it and nothing jumps when it closes
const PickerBox = styled.div`
  margin-top: 10px;
  line-height: 0;

  & .chrome-picker {
    box-sizing: border-box !important;
    box-shadow: none !important;
    border: 2px solid ${settings.LIGHT_GREY_COLOR} !important;
    border-radius: ${settings.BORDER_RADIUS} !important;
    font-family: inherit !important;
  }
`;

export function expandHexValue(someValue) {
  const cleanValue = String(someValue).trim().replace("#", "").toLowerCase();
  if (!/^[0-9a-f]+$/.test(cleanValue)) {
    return "";
  }
  if (cleanValue.length === SHORT_HEX_LENGTH) {
    return `#${cleanValue.replace(/./g, (oneChar) => oneChar + oneChar)}`;
  }
  return cleanValue.length === SHORT_HEX_LENGTH * 2 ? `#${cleanValue}` : "";
}

export default function ColorField(props) {
  const [draftValue, setDraftValue] = useState(props.value);

  useEffect(() => {
    setDraftValue(props.value);
  }, [props.value]);

  useEffect(() => {
    if (!props.isOpen) {
      return undefined;
    }
    const onKeyDown = (someEvent) => {
      if (someEvent.key === "Escape") {
        props.onToggle(false);
      }
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  });

  const onHexChange = (someEvent) => {
    const nextValue = someEvent.target.value;
    setDraftValue(nextValue);
    const fullValue = expandHexValue(nextValue);
    if (fullValue) {
      props.onChange(fullValue);
    }
  };

  // A half typed value is not a color, so the field falls back to the last
  // good one as soon as it loses the focus
  const onHexBlur = () => {
    setDraftValue(props.value);
  };

  return (
    <FieldWrap>
      <FieldRow>
        <SwatchButton
          type="button"
          aria-label={`${props.label}, open the picker`}
          aria-expanded={props.isOpen}
          style={{ background: props.value }}
          onClick={() => props.onToggle(!props.isOpen)}
        />
        <HexInput
          type="text"
          spellCheck="false"
          aria-label={props.label}
          value={draftValue}
          onChange={onHexChange}
          onBlur={onHexBlur}
        />
        <ToggleLink type="button" onClick={() => props.onToggle(!props.isOpen)}>
          {props.isOpen ? "Hide" : "Pick"}
        </ToggleLink>
      </FieldRow>
      {props.isOpen ? (
        <PickerBox>
          <ChromePicker
            color={props.value}
            width="100%"
            onChange={(colorObject) => props.onChange(colorObject.hex)}
            disableAlpha
          />
        </PickerBox>
      ) : (
        ""
      )}
    </FieldWrap>
  );
}
