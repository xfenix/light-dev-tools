// Layout and form primitives shared by the heavier tools. Both the qr code and
// the image one need the same two column shape, the same panels and the same
// inputs, and keeping them here is the only way to keep them identical

import * as settings from "./Settings";

import styled from "styled-components";

// One column below this width, the side by side layout stops being readable
// somewhere around here anyway
export const NARROW_SCREEN = "760px";

export const ToolGrid = styled.div<{ columns?: string }>`
  display: grid;
  grid-template-columns: ${(props) =>
    props.columns ? props.columns : "minmax(0, 1fr) minmax(0, 1fr)"};
  gap: 30px;
  align-items: start;
  margin-top: 30px;

  @media (max-width: ${NARROW_SCREEN}) {
    grid-template-columns: minmax(0, 1fr);
    gap: 20px;
  }
`;

export const ToolColumn = styled.div`
  min-width: 0;
`;

// Sticky keeps the preview in sight while the settings below are being tuned,
// but only while there are two columns to speak of
export const StickyColumn = styled(ToolColumn)`
  position: sticky;
  top: 20px;

  @media (max-width: ${NARROW_SCREEN}) {
    position: static;
  }
`;

export const Panel = styled.section`
  border: 2px solid ${settings.LIGHT_GREY_COLOR};
  border-radius: ${settings.BORDER_RADIUS};
  padding: 15px;
  min-width: 0;

  & + & {
    margin-top: 20px;
  }
`;

export const PanelTitle = styled.h3`
  font-size: 13px;
  font-weight: bold;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: ${settings.GREY_COLOR};
  margin-bottom: 15px;
`;

export const FieldLabel = styled.div`
  margin-bottom: 8px;
  font-size: 90%;
  color: ${settings.GREY_COLOR};
`;

export const FieldBox = styled.div`
  min-width: 0;

  & + & {
    margin-top: 15px;
  }
`;

// Wrapping rows used to keep the left margin of the first item on every new
// line, gap is the only way to get even spacing in both directions
export const ControlRow = styled.div`
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 10px;
  min-width: 0;
`;

export const FieldsPair = styled.div`
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
  gap: 10px;
`;

export const NumberInput = styled.input`
  width: 100%;
  min-width: 0;
  padding: 8px 10px;
  font-family: inherit;
  font-size: 15px;
  color: ${settings.BLACK_COLOR};
  border: 2px solid ${settings.LIGHT_GREY_COLOR};
  border-radius: ${settings.BORDER_RADIUS};
  box-sizing: border-box;
  background: ${settings.WHITE_COLOR};
  transition: border-color 0.2s;

  &:focus {
    outline: none;
    border-color: ${settings.BLACK_COLOR};
  }
`;

export const SelectInput = styled.select`
  padding: 8px 10px;
  font-family: inherit;
  font-size: 15px;
  color: ${settings.BLACK_COLOR};
  border: 2px solid ${settings.LIGHT_GREY_COLOR};
  border-radius: ${settings.BORDER_RADIUS};
  background: ${settings.WHITE_COLOR};
  max-width: 100%;
  cursor: pointer;
  transition: border-color 0.2s;

  &:focus {
    outline: none;
    border-color: ${settings.BLACK_COLOR};
  }
`;

export const CheckLabel = styled.label<{ isDisabled?: boolean }>`
  display: flex;
  align-items: flex-start;
  cursor: ${(props) => (props.isDisabled ? "default" : "pointer")};
  color: ${(props) =>
    props.isDisabled ? settings.GREY_COLOR : settings.BLACK_COLOR};

  & + & {
    margin-top: 10px;
  }

  & > input {
    margin: 3px 8px 0 0;
    flex: none;
  }
`;

export const HintText = styled.p`
  margin-top: 8px;
  font-size: 85%;
  color: ${settings.GREY_COLOR};
  line-height: 1.4;
`;

export const DangerText = styled(HintText)`
  color: ${settings.RED_COLOR};
`;

export const ActionsBox = styled.div`
  display: grid;
  gap: 10px;
  margin-top: 15px;
`;
