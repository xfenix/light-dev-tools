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
}

a {
  color: #83BCFF;
  text-decoration: none;
  border-bottom: 1px solid #83BCFF;
}

a:hover {
  border-bottom-color: #056fe8;
}

h1 {
  font-size: 24px;
  margin-bottom: 20px;
}

.mainlayout {
  background: #E1EFF6;
}

.mainlayout__inner {
  width: 600px;
  margin: 0 auto;
  padding: 20px;
  box-sizing: border-box;
}
`;

function App() {
  return (
    <>
      <Router>
        <Reset />
        <ApplicationGlobalStyles />
        <main class="mainlayout">
          <div className="mainlayout__inner">
            <h1>Light dev tools</h1>
            <nav>
              <a href="/base64/">Base 64 tools</a>
            </nav>
          </div>
        </main>
        <Switch>
          <Route path="/base64/"><Base64Component /></Route>
        </Switch>
      </Router>
    </>
  );
}

export default App;
