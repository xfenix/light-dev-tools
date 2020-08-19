import * as settings from "../../Settings";

import Button from "./Button";
import React from "react";
import copy from "copy-to-clipboard";
import styled from "styled-components";
import { useToasts } from "react-toast-notifications";

const TextareaWrapper = styled.form`
  position: relative;
  margin-bottom: 25px;
`;
const TextareaTag = styled.textarea`
  box-sizing: border-box;
  width: 100%;
  min-height: ${(props) =>
    props.medium
      ? "200px"
      : props.small
      ? "100px"
      : props.smallest
      ? "30px"
      : "auto"};
  border-radius: ${settings.BORDER_RADIUS};
  border: 2px solid ${settings.BLACK_COLOR};
  padding: 10px;
  resize: vertical;
  outline: none;
`;
const LabelTag = styled.label`
  margin-bottom: 5px;
  display: block;
`;
const ClipboardButtonWrap = styled.div`
  position: absolute;
  top: 2px;
  right: 2px;
`;
const ResetButtonWrap = styled.div`
  width: 100%;
  text-align: right;
  margin-top: 5px;
`;
const ResetLink = styled.a`
  border-bottom: 1px dashed ${settings.LIGHT_BLUE_COLOR};
  display: inline-block;
  font-size: 90%;

  &:hover {
    color: ${settings.RED_COLOR};
    border-bottom-color: ${settings.RED_COLOR};
  }
`;

export default function Textarea(props) {
  const { addToast } = useToasts();

  const onClipboardButtonClick = () => {
    const currentFinalValue = props.value ? props.value : props.defaultValue;
    if (currentFinalValue) {
      copy(currentFinalValue);
      addToast("Copied!", {
        appearance: "success",
        autoDismiss: true,
        autoDismissTimeout: 1000,
      });
    }
  };

  const onResetForm = (event) => {
    // Dont forget to update event fields in case of any interface change
    if (props.onChange) {
      props.onChange(
        Object.create({
          target: {
            value: "",
          },
        })
      );
    }
    event.preventDefault();
  };

  return (
    <>
      {props.label ? <LabelTag>{props.label}:</LabelTag> : ""}

      <TextareaWrapper>
        <TextareaTag {...props}></TextareaTag>
        {props.hasClipboardButton ? (
          <ClipboardButtonWrap>
            <Button onClick={onClipboardButtonClick} transparent small>
              Copy to clibpoard
            </Button>
          </ClipboardButtonWrap>
        ) : (
          ""
        )}
        {props.notHasResetButton ? (
          ""
        ) : props.readOnly ? (
          ""
        ) : (
          <ResetButtonWrap>
            <ResetLink onClick={onResetForm} href="#">
              Clear all field data
            </ResetLink>
          </ResetButtonWrap>
        )}
      </TextareaWrapper>
    </>
  );
}
