import React from "react";
import styled from "styled-components";

const AllRadios = styled.div`
  margin-bottom: 25px;
  display: flex;
  column-gap: 20px;
`;

const OneRadioLabel = styled.label`
  display: flex;
  align-items: flex-start;
`;

const InputRadio = styled.input`
  margin: 0 5px 0 0;
  padding: 0;
  display: block;
`;

export default function RadioGroup(props) {
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
