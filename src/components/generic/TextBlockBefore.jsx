import React from "react";
import styled from "styled-components";

const InnerTextBlock = styled.div`
  margin-bottom: 30px;
`;

const Header = styled.h4`
  font-size: 18px;
  font-weight: bold;
  margin-bottom: 10px;
`;

export default function TextBlockBefore(props) {
  return (
    <InnerTextBlock className="typo">
      <Header>Description</Header>
      {props.children}
    </InnerTextBlock>
  );
}
