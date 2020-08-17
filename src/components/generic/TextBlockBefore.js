import React from "react";
import styled from "styled-components";

const InnerTextBlock = styled.div`
  margin-bottom: 40px;
`;

export default function TextBlockBefore(props) {
  return <InnerTextBlock className="typo">{props.children}</InnerTextBlock>;
}
