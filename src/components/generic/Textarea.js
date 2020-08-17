import React from "react";
import styled from "styled-components";
import Button from "./Button";
import * as settings from "../../Settings";
import copy from "copy-to-clipboard";

const TextareaWrapper = styled.div`
  position: relative;
`;

const TextareaTag = styled.textarea`
  box-sizing: border-box;
  width: 100%;
  height: 200px;
  border-radius: ${settings.BORDER_RADIUS};
  border: 2px solid ${settings.BLACK_COLOR};
  padding: 10px;
  resize: vertical;
  margin-bottom: 25px;
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
  const onClipboardButtonClick = () => {
    copy(props.value);
  };

  return (
    <>
      {props.label ? <LabelTag>{props.label}:</LabelTag> : ""}
      <TextareaWrapper>
        {props.needClipboardButton ? (
          <ButtonWrap>
            <Button onClick={onClipboardButtonClick}>Copy in clibpoard</Button>
          </ButtonWrap>
        ) : (
          ""
        )}
        <TextareaTag {...props}></TextareaTag>
      </TextareaWrapper>
    </>
  );
}
