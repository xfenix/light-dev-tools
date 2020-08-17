import React from "react";
import { createGlobalStyle } from "styled-components";
import { Reset } from "styled-reset";
import { ToastProvider } from "react-toast-notifications";
import {
  BrowserRouter as Router,
  Switch,
  Route,
  NavLink,
} from "react-router-dom";
import Base64Component from "./components/app/Base64";
import * as settings from "./Settings";

// Our palette https://coolors.co/b80c09-0b4f6c-01baef-fbfbff-040f16

const ApplicationGlobalStyles = createGlobalStyle`
@import url('https://fonts.googleapis.com/css2?family=Varta&display=swap');

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
  width: 700px;
  margin: 0 auto;
  padding: 25px 20px;
}

.mainlayout__menu {
  box-sizing: border-box;
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
`;

function App() {
  return (
    <>
      <ToastProvider>
        <Router>
          <Reset />
          <ApplicationGlobalStyles />
          <main className="mainlayout">
            <header className="mainlayout__topline">
              <div className="mainlayout__wrap">
                <NavLink to="/" className="sitetitle" activeClassName="">
                  <h1 className="sitetitle__title">
                    <span role="img">🧑‍💻</span>&nbsp;Light dev tools
                  </h1>
                </NavLink>
              </div>
            </header>
            <div className="mainlayout__menu">
              <div className="mainlayout__wrap">
                <nav className="topmenu">
                  <NavLink
                    to="/base64/"
                    className="topmenu__item"
                    activeClassName="topmenu__item_active"
                  >
                    Base 64
                  </NavLink>
                  <NavLink
                    to="/what/"
                    className="topmenu__item"
                    activeClassName="topmenu__item_active"
                  >
                    Hash
                  </NavLink>
                  <NavLink
                    to="/thehell/"
                    className="topmenu__item"
                    activeClassName="topmenu__item_active"
                  >
                    Url encode&decode
                  </NavLink>
                </nav>
              </div>
            </div>
            <div className="mainlayout__wrap mainlayout__content">
              <Switch>
                <Route path="/base64/">
                  <Base64Component />
                </Route>
                <Route>
                  Hello, developer. This site contains bunch of useful and
                  simple tools.
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
