import React from "react";
import styled from "styled-components";

const AllRadios = styled.div`
  margin-bottom: 25px;
  display: flex;
  column-gap: 20px;
`;

const OneRadioWrap = styled.label`
  display: flex;
  align-items: flex-start;
`;

const InputRadio = styled.input`
  margin: 0 5px 0 0;
`;

export default function RadioGroup(props) {
  return (
    <AllRadios>
      {props.titleValues.map((hashTitle, hashIndex) => {
        return (
          <OneRadioWrap key={hashIndex}>
            <InputRadio
              {...(hashIndex === 0 ? { defaultChecked: true } : {})}
              name="hashfn"
              type="radio"
              onChange={props.onChange ? props.onChange : () => {}}
              value={hashTitle}
            />
            <div>{hashTitle}</div>
          </OneRadioWrap>
        );
      })}
    </AllRadios>
  );
}
