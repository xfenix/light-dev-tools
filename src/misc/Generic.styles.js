import "react-toastify/dist/ReactToastify.css";

import * as settings from "./Settings";

import { createGlobalStyle } from "styled-components";

// Our palette https://coolors.co/b80c09-0b4f6c-01baef-fbfbff-040f16

export const ApplicationGlobalStyles = createGlobalStyle`
/* Global tags */
body {
  font-family: 'Varta', sans-serif;
  background: ${settings.WHITE_COLOR};
  color: #040F16;
}

a {
  color: ${settings.BLACK_COLOR};
  border-bottom: none;
  text-decoration: underline;
}

h1 {
  font-size: 24px;
  color: #040F16;
}

h2 {
  font-size: 22px;
  margin-bottom: 20px;
}

/* Global classes */
.link {
  text-decoration: none;
  color: ${settings.BLACK_COLOR};
  transition: color 0.2s;

  &::after {
    display: block;
    content: '';
    background: ${settings.BLACK_COLOR};
    width: 100%;
    height: 1px;
  }
}

.link:hover,
.link_active {
  color: ${settings.LIGHT_BLUE_COLOR} !important;

  &::after {
    background: linear-gradient(to right, rgba(197,225,127,1) 0%, rgba(196,225,127,1) 12%, rgba(247,253,202,1) 12%, rgba(247,253,202,1) 25%, rgba(240,208,113,1) 25%, rgba(252,208,113,1) 39%, rgba(240,117,107,1) 39%, rgba(240,118,107,1) 52%, rgba(219,157,190,1) 52%, rgba(219,157,190,1) 65%, rgba(196,136,223,1) 65%, rgba(196,156,223,1) 78%, rgba(101,153,226,1) 78%, rgba(101,153,226,1) 89%, rgba(97,194,228,1) 89%, rgba(97,194,228,1) 100%);
  }
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

.inputgroup + .inputgroup {
  margin-top: 10px;
}

/* Global layout things */
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
  margin-top: 20px;
  padding-top: 20px;
}

.mainlayout__footgithub {
  margin-bottom: 5px;
  display: flex;
  align-items: center;
}

.sitelogo {
  display: inline-block;
  border-bottom: none;
  text-decoration: none;

  &::after {
    display: none;
  }
}

.sitelogo__title {
  font-size: 44px;
  transition: color .4s;

  &:hover {
    color: ${settings.LIGHT_BLUE_COLOR} !important;
  }
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

/* Some overrides */
.emoji-mart-emoji {
  outline: none;
}
`;
