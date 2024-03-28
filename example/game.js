import Phaser from "phaser";

import LoadingScene from "./scenes/loading";
import { PlayePlugin } from "../lib";
import PlayScene from "./scenes/play";
import MenuScene from "./scenes/menu";

const config = {
  parent: "game",
  backgroundColor: "#f0f5fc",

  plugins: {
    global: [
      {
        plugin: PlayePlugin,
        key: "playe",
        start: true,
        data: {
          loadingSceneKey: "LoadingScene",
          gameplaySceneKey: "PlayScene",
        },
      },
    ],
  },
};

export default class Game extends Phaser.Game {
  start() {
    super.start();
    this.input.keyboard.addCapture("SPACE"); // to prevent the page from scrolling

    this.scene.add("LoadingScene", LoadingScene, true);
    this.scene.add("PlayScene", PlayScene, false);
    this.scene.add("MenuScene", MenuScene, false);
  }
}

document.addEventListener("DOMContentLoaded", () => {
  const game = new Game(config);
  window.game = game;
});
