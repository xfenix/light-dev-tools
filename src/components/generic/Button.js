import React from "react";
import styled from "styled-components";
import * as settings from "../../Settings";

const InnerButton = styled.button`
  border-radius: ${settings.BORDER_RADIUS};
  padding: 10px 20px;
  cursor: pointer;
  box-sizing: border-box;
  background: #bcd8b7;
  color: #fff;
  font-weight: bold;
  border: none;
  outline: none;

  &:hover {
    opacity: 0.7;
  }
`;

export default function Button(props) {
  return <InnerButton>{props.children}</InnerButton>;
}
