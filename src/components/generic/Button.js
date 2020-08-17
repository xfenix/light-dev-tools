import React from "react";
import styled from "styled-components";
import * as settings from "../../Settings";

const InnerButton = styled.button`
  border-radius: 4px;
  padding: 10px 20px;
  cursor: pointer;

  &:hover {
    border-color: ${settings.BLACK_COLOR};
  }
`;

export default function Button(props) {
  return <InnerButton>{props.children}</InnerButton>;
}
