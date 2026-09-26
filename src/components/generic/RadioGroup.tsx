import type { ChangeEvent } from "react";
import styled from "styled-components";

const AllRadios = styled.div`
  margin-bottom: -20px;
  padding-bottom: 30px;
  display: flex;
  flex-wrap: wrap;
`;

const OneRadioLabel = styled.label`
  display: flex;
  align-items: flex-start;
  margin-right: 20px;
  margin-bottom: 20px;
`;

const InputRadio = styled.input`
  margin: 0 5px 0 0;
  padding: 0;
  display: block;
`;

type RadioGroupProps = {
  titleValues: readonly string[];
  groupKey: string;
  onChange?: (event: ChangeEvent<HTMLInputElement>) => void;
};

export default function RadioGroup(props: RadioGroupProps) {
  return (
    <AllRadios>
      {props.titleValues.map((hashTitle, hashIndex) => {
        return (
          <OneRadioLabel key={hashIndex}>
            <InputRadio
              type="radio"
              name={props.groupKey}
              onChange={props.onChange ? props.onChange : () => {}}
              value={hashTitle}
              {...(hashIndex === 0 ? { defaultChecked: true } : {})}
            />
            <div>{hashTitle}</div>
          </OneRadioLabel>
        );
      })}
    </AllRadios>
  );
}
