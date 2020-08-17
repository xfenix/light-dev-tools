import React from "react";
import styled from "styled-components";
import Button from "./Button";
import * as settings from "../../Settings";

const TextareaWrapper = styled.div`
  position: relative;
`;

const TextareaTag = styled.textarea`
  box-sizing: border-box;
  width: 100%;
  height: 200px;
  border-radius: 5px;
  border: 2px solid ${settings.BLACK_COLOR};
  padding: 10px;
  resize: vertical;
  margin-bottom: 25px;
`;

const LabelTag = styled.label`
  margin-bottom: 5px;
  display: block;
`;

export default function Textarea(props) {
  return (
    <>
      {props.label ? <LabelTag>{props.label}:</LabelTag> : ""}
      <TextareaWrapper>
        <Button>Hello World</Button>
        <TextareaTag {...props}></TextareaTag>
      </TextareaWrapper>
    </>
  );
}
