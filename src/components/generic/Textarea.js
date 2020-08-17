import React from "react";
import styled from "styled-components";
import { useToasts } from "react-toast-notifications";
import Button from "./Button";
import * as settings from "../../Settings";
import copy from "copy-to-clipboard";

const TextareaWrapper = styled.div`
  position: relative;
  margin-bottom: 25px;
`;

const TextareaTag = styled.textarea`
  box-sizing: border-box;
  width: 100%;
  min-height: ${(props) => (props.medium ? "200px" : "auto")};
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

const ButtonWrap = styled.div`
  position: absolute;
  top: 2px;
  right: 2px;
`;

export default function Textarea(props) {
  const { addToast } = useToasts();
  const onClipboardButtonClick = () => {
    copy(props.value);
    addToast("Copied!", {
      appearance: "success",
      autoDismiss: true,
      autoDismissTimeout: 1000,
    });
  };

  return (
    <>
      {props.label ? <LabelTag>{props.label}:</LabelTag> : ""}

      <TextareaWrapper>
        <TextareaTag {...props}></TextareaTag>
        {props.needClipboardButton ? (
          <ButtonWrap>
            <Button onClick={onClipboardButtonClick} transparent small>
              Copy to clibpoard
            </Button>
          </ButtonWrap>
        ) : (
          ""
        )}
      </TextareaWrapper>
    </>
  );
}
