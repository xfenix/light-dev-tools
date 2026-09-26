import * as settings from "../../misc/Settings";

import React from "react";
import styled from "styled-components";

interface ButtonLookProps {
  small?: boolean;
  transparent?: boolean;
  ghost?: boolean;
}

const InnerButton = styled.button<{
  $small?: boolean;
  $transparent?: boolean;
  $ghost?: boolean;
}>`
  border-radius: ${settings.BORDER_RADIUS};
  padding: 10px 20px;
  margin: 0;
  cursor: pointer;
  box-sizing: border-box;
  background: ${settings.LIGHT_GREEN_COLOR};
  color: ${settings.BLACK_COLOR};
  text-transform: uppercase;
  border: none;
  outline: none;
  transition: opacity 0.2s;
  ${(props) => (props.$small ? "font-size: 70%;" : "")}
  ${(props) => (props.$transparent ? "opacity: 0.6;" : "")}
  ${(props) =>
    props.$ghost
      ? `
    background: ${settings.WHITE_COLOR};
    border: 2px solid ${settings.LIGHT_GREY_COLOR};
    padding: 8px 18px;
    transition: border-color 0.2s;

    &:hover {
      border-color: ${settings.BLACK_COLOR};
    }
  `
      : ""}

  &:hover {
    ${(props) => (props.$transparent ? "opacity: 1;" : "")};
  }
`;

type ButtonProps = ButtonLookProps &
  React.ButtonHTMLAttributes<HTMLButtonElement>;

export default function Button({
  small,
  transparent,
  ghost,
  ...props
}: ButtonProps) {
  return (
    <InnerButton
      $small={small}
      $transparent={transparent}
      $ghost={ghost}
      {...props}
    />
  );
}
