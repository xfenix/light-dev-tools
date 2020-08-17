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
  text-transform: uppercase;
  border: none;
  outline: none;
  ${(props) => (props.small ? "font-size: 70%;" : "")}
  ${(props) => (props.transparent ? "opacity: 0.6;" : "")}

  &:hover {
    ${(props) => (props.transparent ? "opacity: 1;" : "")};
  }
`;

export default function Button(props) {
  return <InnerButton {...props}>{props.children}</InnerButton>;
}
