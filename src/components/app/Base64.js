import React from "react";
import Textarea from "../generic/Textarea";
import { styled } from "styled-components";

export default function Base64Component(props) {
  return (
    <>
      <Textarea label="Input" readonly={true} />
      <Textarea label="Output" />
    </>
  );
}
