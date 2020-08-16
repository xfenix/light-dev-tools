import React from "react";
import { createGlobalStyle } from "styled-components";
import { Reset } from "styled-reset";
import {
  BrowserRouter as Router,
  Switch,
  Route,
  NavLink,
} from "react-router-dom";
import Base64Component from "./components/app/Base64";

// Our palette https://coolors.co/b80c09-0b4f6c-01baef-fbfbff-040f16

const ApplicationGlobalStyles = createGlobalStyle`
@import url('https://fonts.googleapis.com/css2?family=Varta&display=swap');

body {
  font-family: 'Varta', sans-serif;
  background: #FBFBFF;
}

a {
  color: #01BAEF;
  text-decoration: none;
  border-bottom: 1px solid #01BAEF;
}

a:hover {
  border-bottom-color: #056fe8;
}

h1 {
  font-size: 24px;
  color: #040F16;
}

.mainlayout__wrap {
  width: 700px;
  margin: 0 auto;
  padding: 30px 20px;
}

.mainlayout__menu {
  box-sizing: border-box;
  background: #d5f3ff;
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
  diplay: block;
  padding-bottom: 3px;
}

.topmenu__item_active,
.topmenu__item:hover {
  color: #040F16;
  border-bottom-color: #040F16;
}
`;

function App() {
  return (
    <>
      <Router>
        <Reset />
        <ApplicationGlobalStyles />
        <main class="mainlayout">
          <div className="mainlayout__topline">
            <div className="mainlayout__wrap">
              <NavLink to="/" className="sitetitle" activeClassName="">
                <h1 class="sitetitle__title">🧑‍💻&nbsp;Light dev tools</h1>
              </NavLink>
            </div>
          </div>
          <div className="mainlayout__menu">
            <div className="mainlayout__wrap">
              <nav class="topmenu">
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
                Hello, developer. This site contains bunch of useful and simple
                tools.
              </Route>
            </Switch>
          </div>
        </main>
      </Router>
    </>
  );
}

export default App;
