import "react-toastify/dist/ReactToastify.css";

import * as settings from "./Settings";

import { createGlobalStyle } from "styled-components";

// Our palette https://coolors.co/b80c09-0b4f6c-01baef-fbfbff-040f16

export const ApplicationGlobalStyles = createGlobalStyle`
body {
  font-family: 'Varta', sans-serif;
  background: ${settings.WHITE_COLOR};
  color: #040F16;
}

a {
  color: ${settings.LIGHT_BLUE_COLOR};
  text-decoration: none;
  border-bottom: 1px solid ${settings.LIGHT_BLUE_COLOR};
}

a:hover {
  border-bottom-color: #056fe8;
}

h1 {
  font-size: 24px;
  color: #040F16;
}

h2 {
  font-size: 22px;
  margin-bottom: 20px;
}

.fork-me-on-github {
  border-bottom: none;
}

.typo p + p {
  margin-top: 20px;
}

.typo ul {
  margin-top: 10px;
}

.typo ul li {
  margin-left: 0;
  padding-left: 20px;
  list-style-type: none;
  position: relative;
}

.typo ul li + li {
  margin-top: 7px;
}

.typo ul li:before {
  left: 0;
  top: 0;
  position: absolute;
  display: inline-block;
  content: '\\2014';
}

.errorfield {
  border-color: ${settings.RED_COLOR};
}

.fontsmall {
  font-size: 80%;
}

.mainlayout__wrap {
  width: 100%;
  max-width: 740px;
  margin: 0 auto;
  padding: 25px 20px;
  box-sizing: border-box;
}

.mainlayout__menu {
  background: #BDEBFB;
}

.mainlayout__footer {
  color: ${settings.LIGHT_GREY_COLOR};
  border-top: 1px solid ${settings.LIGHT_GREY_COLOR};
  font-size: 90%;
}

.mainlayout__footgithub {
  margin-bottom: 5px;
  display: flex;
  align-items: center;
}

.sitetitle {
  display: inline-block;
  border-bottom: none;
}

.sitetitle:hover {
  opacity: 0.7;
}

.sitetitle__title {
  font-size: 44px;
}

.topmenu {
  margin-left: -30px;
  margin-bottom: -20px;
  overflow: hidden;
}

.topmenu__item {
  font-size: 120%;
  display: inline-block;
  padding-bottom: 3px;
  margin-left: 30px;
  margin-bottom: 20px;
}

.topmenu__item_active,
.topmenu__item:hover {
  color: ${settings.BLACK_COLOR};
  border-bottom-color: ${settings.BLACK_COLOR};
}

.emoji-mart-emoji {
  outline: none;
}
`;
