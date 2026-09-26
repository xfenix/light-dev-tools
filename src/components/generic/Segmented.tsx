import * as settings from "../../misc/Settings";

import type { ChangeEvent } from "react";
import styled from "styled-components";

const SegmentedBox = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
`;

const OneSegment = styled.label<{ $isActive: boolean }>`
  position: relative;
  display: block;
  padding: 7px 14px;
  border-radius: ${settings.BORDER_RADIUS};
  border: 2px solid
    ${(props) =>
      props.$isActive ? settings.BLACK_COLOR : settings.LIGHT_GREY_COLOR};
  background: ${(props) =>
    props.$isActive ? settings.LIGHT_GREEN_COLOR : settings.WHITE_COLOR};
  font-size: 90%;
  line-height: 1.2;
  cursor: pointer;
  transition: border-color 0.2s, background 0.2s;

  &:hover {
    border-color: ${settings.BLACK_COLOR};
  }
`;

// The radio itself still does all the work, it is only moved out of sight, so
// the keyboard and the screen readers keep the usual group behaviour
const HiddenRadio = styled.input`
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  margin: 0;
  padding: 0;
  opacity: 0;
  cursor: pointer;
`;

type SegmentedProps = {
  titleValues: readonly (string | number)[];
  value: string | number;
  groupKey: string;
  onChange?: (event: ChangeEvent<HTMLInputElement>) => void;
};

export default function Segmented(props: SegmentedProps) {
  const currentValue = String(props.value);
  return (
    <SegmentedBox>
      {props.titleValues.map((oneTitle) => {
        const oneValue = String(oneTitle);
        return (
          <OneSegment key={oneValue} $isActive={oneValue === currentValue}>
            <HiddenRadio
              type="radio"
              name={props.groupKey}
              value={oneValue}
              checked={oneValue === currentValue}
              onChange={props.onChange ? props.onChange : () => {}}
            />
            <span>{oneTitle}</span>
          </OneSegment>
        );
      })}
    </SegmentedBox>
  );
}
