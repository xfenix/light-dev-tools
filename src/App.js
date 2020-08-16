import React from 'react';
import { createGlobalStyle } from 'styled-components';
import { Reset } from 'styled-reset';
import {
  BrowserRouter as Router,
  Switch,
  Route,
  Link
} from "react-router-dom";
import Base64Component from './components/Base64';

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
  font-size: 44px;
}

.topmenu {
  display: flex;
  gap: 30px;
}

.topmenu__item {
  font-size: 120%;
  diplay: block;
  padding-bottom: 3px;
}

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
              <h1 class="sitetitle">🧑‍💻 Light dev tools</h1>
            </div>
          </div>
          <div className="mainlayout__menu">
            <div className="mainlayout__wrap">
              <nav class="topmenu">
                <a href="/base64/" class="topmenu__item">Base 64</a>
                <a href="/base64/" class="topmenu__item">Hash</a>
                <a href="/base64/" class="topmenu__item">Url encode&decode</a>
                <a href="/base64/" class="topmenu__item">Base 64 tools</a>
              </nav>
            </div>
          </div>
          <div className="mainlayout__wrap mainlayout__content">
            <Switch>
              <Route path="/base64/"><Base64Component /></Route>
              <Route>
                Hello, developer. This site contains bunch of useful and simple tools.
              </Route>
            </Switch>
          </div>
        </main>
      </Router>
    </>
  );
}

export default App;
