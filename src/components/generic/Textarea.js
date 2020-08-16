import React from "react";
import styled from "styled-components";

const TextareaTag = styled.textarea.attrs((props) => ({
  readonly: props.readonly,
}))`
  box-sizing: border-box;
  width: 100%;
  height: 200px;
  border-radius: 5px;
  border: 2px solid #0b4f6c;
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
      <TextareaTag>{props.children}</TextareaTag>
    </>
  );
}
