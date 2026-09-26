import * as settings from "../../misc/Settings";

import type { MouseEvent, TextareaHTMLAttributes } from "react";

import Button from "./Button";
import copy from "copy-to-clipboard";
import styled from "styled-components";
import { toast } from "react-toastify";

type TextareaSize = "big" | "medium" | "small" | "smallest";

const MIN_HEIGHTS: Record<TextareaSize, string> = {
  big: "400px",
  medium: "200px",
  small: "100px",
  smallest: "30px",
};

// The reset link sends a fake event with an empty value, so the handlers
// depend on this part of the real event only
export type TextChangeEvent = { target: { value: string } };

const TextareaMainWrapper = styled.div`
  box-sizing: border-box;
  width: 100%;
`;
const TextareaInnerWrapper = styled.form`
  position: relative;
  height: 100%;
  width: 100%;
`;
const TextareaTag = styled.textarea<{ $size?: TextareaSize }>`
  display: block;
  box-sizing: border-box;
  width: 100%;
  height: 100%;
  font-size: 16px;
  min-height: ${(props) => (props.$size ? MIN_HEIGHTS[props.$size] : "auto")};
  border-radius: ${settings.BORDER_RADIUS};
  border: 2px solid ${settings.BLACK_COLOR};
  padding: 10px;
  resize: vertical;
  outline: none;
`;
const LabelTag = styled.label`
  margin-bottom: 5px;
  display: block;
`;
const ClipboardButtonWrap = styled.div`
  position: absolute;
  top: 2px;
  right: 2px;
  transition: opacity 0.5s;
`;
const ResetButtonWrap = styled.div`
  width: 100%;
  text-align: right;
  margin-top: 5px;
`;
const ResetLink = styled.a`
  color: ${settings.BLACK_COLOR};
  border-bottom: 1px dashed ${settings.BLACK_COLOR};
  display: inline-block;
  font-size: 90%;
  text-decoration: none;

  &:hover {
    color: ${settings.RED_COLOR};
    border-bottom-color: ${settings.RED_COLOR};
  }
`;

type TextareaProps = Omit<
  TextareaHTMLAttributes<HTMLTextAreaElement>,
  "onChange" | "value" | "defaultValue"
> & {
  value?: string;
  defaultValue?: string;
  onChange?: (event: TextChangeEvent) => void;
  label?: string;
  wrapperClassName?: string;
  hasClipboardButton?: boolean;
  compactClipboardButton?: boolean;
  notHasResetButton?: boolean;
  big?: boolean;
  medium?: boolean;
  small?: boolean;
  smallest?: boolean;
};

export default function Textarea({
  label,
  wrapperClassName,
  hasClipboardButton,
  compactClipboardButton,
  notHasResetButton,
  big,
  medium,
  small,
  smallest,
  ...textareaProps
}: TextareaProps) {
  const currentSize: TextareaSize | undefined = big
    ? "big"
    : medium
      ? "medium"
      : small
        ? "small"
        : smallest
          ? "smallest"
          : undefined;
  const currentFinalValue = textareaProps.value
    ? textareaProps.value
    : textareaProps.defaultValue;

  const onClipboardButtonClick = async (event: MouseEvent) => {
    event.preventDefault();
    if (currentFinalValue && (await copy(currentFinalValue))) {
      toast("Copied!");
    }
  };

  const onResetForm = (event: MouseEvent) => {
    if (textareaProps.onChange) {
      textareaProps.onChange({ target: { value: "" } });
    }
    event.preventDefault();
  };

  return (
    <TextareaMainWrapper className={wrapperClassName}>
      {label ? <LabelTag>{label}:</LabelTag> : ""}
      <TextareaInnerWrapper>
        <TextareaTag $size={currentSize} {...textareaProps}></TextareaTag>
        {hasClipboardButton ? (
          <ClipboardButtonWrap style={{ opacity: currentFinalValue ? 1 : 0 }}>
            <Button onClick={onClipboardButtonClick} transparent small>
              {compactClipboardButton ? "Copy" : "Copy to clibpoard"}
            </Button>
          </ClipboardButtonWrap>
        ) : (
          ""
        )}
        {notHasResetButton || textareaProps.readOnly ? (
          ""
        ) : (
          <ResetButtonWrap>
            <ResetLink onClick={onResetForm} href="#">
              Clear all field data
            </ResetLink>
          </ResetButtonWrap>
        )}
      </TextareaInnerWrapper>
    </TextareaMainWrapper>
  );
}
