import * as settings from "../../misc/Settings";

import { ToastContainer, toast } from "react-toastify";

import Button from "./Button";
import React from "react";
import copy from "copy-to-clipboard";
import styled from "styled-components";

const TextareaMainWrapper = styled.div`
  box-sizing: border-box;
  width: 100%;
`;
const TextareaInnerWrapper = styled.form`
  position: relative;
  height: 100%;
  width: 100%;
`;
const TextareaTag = styled.textarea`
  display: block;
  box-sizing: border-box;
  width: 100%;
  height: 100%;
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
  transition: opacity 0.5s;
`;
const ResetButtonWrap = styled.div`
  width: 100%;
  text-align: right;
  margin-top: 5px;
`;
const ResetLink = styled.a`
  color: ${settings.BLACK_COLOR};
  border-bottom: 1px dashed ${settings.BLACK_COLOR};
  display: inline-block;
  font-size: 90%;
  text-decoration: none;

  &:hover {
    color: ${settings.RED_COLOR};
    border-bottom-color: ${settings.RED_COLOR};
  }
`;

export default function Textarea(props) {
  const onClipboardButtonClick = (event) => {
    const currentFinalValue = props.value ? props.value : props.defaultValue;
    if (currentFinalValue) {
      copy(currentFinalValue);
      toast("Copied!");
    }
    event.preventDefault();
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
    <TextareaMainWrapper>
      <ToastContainer autoClose={1000} closeOnClick />
      {props.label ? <LabelTag>{props.label}:</LabelTag> : ""}
      <TextareaInnerWrapper>
        <TextareaTag {...props}></TextareaTag>
        {props.hasClipboardButton ? (
          <ClipboardButtonWrap
            style={{ opacity: props.value || props.defaultValue ? 1 : 0 }}
          >
            <Button onClick={onClipboardButtonClick} transparent small>
              {props.compactClipboardButton ? "Copy" : "Copy to clibpoard"}
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
      </TextareaInnerWrapper>
    </TextareaMainWrapper>
  );
}
