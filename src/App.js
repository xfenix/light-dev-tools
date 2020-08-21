import * as settings from "./Settings";

import { NavLink, Route, HashRouter as Router, Switch } from "react-router-dom";

import Base64Component from "./components/app/Base64";
import ColorComponent from "./components/app/Color";
import Emoji2HexComponent from "./components/app/Emoji2Hex";
import EmojiComponent from "./components/app/Emoji";
import HashComponent from "./components/app/Hash";
import React from "react";
import { Reset } from "styled-reset";
import { ToastProvider } from "react-toast-notifications";
import UrlencodeComponent from "./components/app/Urlencode";
import { createGlobalStyle } from "styled-components";

// Our palette https://coolors.co/b80c09-0b4f6c-01baef-fbfbff-040f16

const ApplicationGlobalStyles = createGlobalStyle`
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
  display: flex;
  column-gap: 30px;
  row-gap: 20px;
  flex-wrap: wrap;
}

.topmenu__item {
  font-size: 120%;
  display: block;
  padding-bottom: 3px;
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

function App() {
  return (
    <>
      <ToastProvider>
        <Router>
          <Reset />
          <ApplicationGlobalStyles />
          <main className="mainlayout">
            <header className="mainlayout__topline mainlayout__wrap">
              <NavLink to="/" className="sitetitle" activeClassName="">
                <h1 className="sitetitle__title">
                  <span role="img" aria-label="Software engineer">
                    &#x1F9D1;&#x200D;&#x1F4BB;
                  </span>
                  &nbsp;Light dev tools
                </h1>
              </NavLink>
            </header>
            <div className="mainlayout__menu">
              <nav className="topmenu mainlayout__wrap">
                <NavLink
                  to="/tool/base64/"
                  className="topmenu__item"
                  activeClassName="topmenu__item_active"
                >
                  Base 64
                </NavLink>
                <NavLink
                  to="/tool/hash/"
                  className="topmenu__item"
                  activeClassName="topmenu__item_active"
                >
                  Hash
                </NavLink>
                <NavLink
                  to="/tool/urlencode/"
                  className="topmenu__item"
                  activeClassName="topmenu__item_active"
                >
                  Url encode&decode
                </NavLink>
                <NavLink
                  to="/tool/emoji/"
                  className="topmenu__item"
                  activeClassName="topmenu__item_active"
                >
                  Emoji picker
                </NavLink>
                <NavLink
                  to="/tool/emoji2hex/"
                  className="topmenu__item"
                  activeClassName="topmenu__item_active"
                >
                  Emoji2hex
                </NavLink>
                <NavLink
                  to="/tool/color/"
                  className="topmenu__item"
                  activeClassName="topmenu__item_active"
                >
                  Color picker
                </NavLink>
              </nav>
            </div>
            <div className="mainlayout__wrap mainlayout__content">
              <Switch>
                <Route path="/tool/base64/">
                  <Base64Component />
                </Route>
                <Route path="/tool/hash/">
                  <HashComponent />
                </Route>
                <Route path="/tool/urlencode/">
                  <UrlencodeComponent />
                </Route>
                <Route path="/tool/emoji/">
                  <EmojiComponent />
                </Route>
                <Route path="/tool/emoji2hex/">
                  <Emoji2HexComponent />
                </Route>
                <Route path="/tool/color/">
                  <ColorComponent />
                </Route>
                <Route path="/">
                  <div className="typo">
                    <h2>Hello</h2>
                    <p>
                      Dear developer, this site contains bunch of useful and
                      simple tools.
                    </p>
                    <p>Use them for the greater good!</p>
                  </div>
                </Route>
              </Switch>
            </div>
            <footer className="mainlayout__wrap mainlayout__footer typo">
              {new Date().getFullYear()} &copy; fancy copyright and footer text.
              <br />
              By big and strong corporation. Special thanks for mom. Also for
              cat.
            </footer>
          </main>
        </Router>
      </ToastProvider>
    </>
  );
}

export default App;
