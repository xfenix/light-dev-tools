import React from "react";
import styled from "styled-components";

const TextareaTag = styled.textarea.attrs((props) => ({
  readonly: true,
}))`
  box-sizing: border-box;
  width: 100%;
  height: 200px;
  border-radius: 4px;
  border: 2px solid #0b4f6c;
  padding: 10px;
  resize: vertical;
  margin-bottom: 10px;
`;

const LabelTag = styled.label`
  margin-bottom: 5px;
`;

export default function Textarea(props) {
  return (
    <>
      {props.label ? <LabelTag>{props.label}</LabelTag> : ""}
      <TextareaTag {...props}>{props.children}</TextareaTag>
    </>
  );
}
