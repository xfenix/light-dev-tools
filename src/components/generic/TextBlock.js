import React from "react";
import styled from "styled-components";

const InnerTextBlock = styled.div`
  margin-bottom: 50px;
`;

export default function TextBlock(props) {
  return <InnerTextBlock className="typo">{props.children}</InnerTextBlock>;
}
