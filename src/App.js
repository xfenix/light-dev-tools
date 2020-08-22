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

const MAIN_MENU = [
  {
    slug: "base64",
    component: Base64Component,
    title: "Base 64",
  },
  {
    slug: "hash",
    component: HashComponent,
    title: "Hash",
  },
  {
    slug: "urlencode",
    component: UrlencodeComponent,
    title: "Url encode&decode",
  },
  {
    slug: "emoji",
    component: EmojiComponent,
    title: "Emoji picker",
  },
  {
    slug: "emoji2hex",
    component: Emoji2HexComponent,
    title: "Emoji2hex",
  },
  {
    slug: "color",
    component: ColorComponent,
    title: "Color picker",
  },
];

function App() {
  return (
    <>
      <Router>
        <Reset />
        <ApplicationGlobalStyles />
        <main className="mainlayout">
          <header className="mainlayout__topline mainlayout__wrap">
            <NavLink to="/" className="sitelogo" activeClassName="">
              <h1 className="sitelogo__title">
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
                {MAIN_MENU.map((oneItemDict) => {
                  return (
                    <NavLink
                      to={"/tool/" + oneItemDict.slug}
                      className="topmenu__item link"
                      activeClassName="topmenu__item_active link_active"
                    >
                      {oneItemDict.title}
                    </NavLink>
                  );
                })}
              </div>
            </nav>
          </div>
          <div className="mainlayout__wrap mainlayout__content">
            <Switch>
              {MAIN_MENU.map((oneItemDict) => {
                return (
                  <Route path={"/tool/" + oneItemDict.slug}>
                    <oneItemDict.component />
                  </Route>
                );
              })}
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
