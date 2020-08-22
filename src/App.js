import "react-toastify/dist/ReactToastify.css";

import { NavLink, Route, HashRouter as Router, Switch } from "react-router-dom";

import { ApplicationGlobalStyles } from "./misc/Generic.styles";
import Base64Component from "./components/app/Base64";
import ColorComponent from "./components/app/Color";
import Emoji2HexComponent from "./components/app/Emoji2Hex";
import EmojiComponent from "./components/app/Emoji";
import ForkMeOnGithub from "fork-me-on-github";
import GitHubButton from "react-github-btn";
import HashComponent from "./components/app/Hash";
import React from "react";
import { Reset } from "styled-reset";
import UrlencodeComponent from "./components/app/Urlencode";

// Our palette https://coolors.co/b80c09-0b4f6c-01baef-fbfbff-040f16

function App() {
  return (
    <>
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
            <ForkMeOnGithub
              repo="https://github.com/xfenix/light-dev-tools"
              colorBackground="black"
              colorOctocat="white"
            />
          </header>
          <div className="mainlayout__menu">
            <nav className="mainlayout__wrap">
              <div className="topmenu">
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
              </div>
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
            <div className="mainlayout__footgithub">
              <GitHubButton href="https://github.com/xfenix">
                Developed by @xfenix
              </GitHubButton>
            </div>
            <p>
              {new Date().getFullYear()} &copy; By big and strong corporation.
              Special thanks for mom. Also for cat. And many other useless text
              parts.
            </p>
          </footer>
        </main>
      </Router>
    </>
  );
}

export default App;
