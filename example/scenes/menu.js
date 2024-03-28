import Phaser from "phaser";

export default class MenuScene extends Phaser.Scene {
  constructor() {
    super("MenuScene");
  }

  create() {
    // Set up background
    const width = this.cameras.main.width;
    const height = this.cameras.main.height;
    const background = this.add.rectangle(width / 2, height / 2, width, height, 0xf0f5fc);
    background.setOrigin(0.5);

    // Add title
    const titleText = this.add.text(width / 2, height / 4, "My Awesome Game", {
      font: "72px Impact",
      fill: "#222222",
    });
    titleText.setOrigin(0.5);

    // Add play button
    const playButtonX = width / 2;
    const playButtonY = height / 2;
    const playButton = this.add.rectangle(playButtonX, playButtonY, 300, 100, 0x5f4b8b);
    playButton.setOrigin(0.5);
    playButton.setInteractive({ useHandCursor: true });
    playButton.addListener("pointerdown", () => {
      this.scene.start("PlayScene");
    });

    const playButtonText = this.add.text(playButtonX, playButtonY, "Play", {
      font: "48px Impact",
      fill: "#000000",
    });
    playButtonText.setOrigin(0.5);

    // Add options button
    const optionsButtonX = width / 2;
    const optionsButtonY = playButtonY + 150;
    const optionsButton = this.add.rectangle(optionsButtonX, optionsButtonY, 300, 100, 0xe69a8d);
    optionsButton.setOrigin(0.5);
    optionsButton.setInteractive({ useHandCursor: true });
    optionsButton.addListener("pointerdown", () => {
      // Handle options button click
      console.log("Options button clicked");
    });

    const optionsButtonText = this.add.text(optionsButtonX, optionsButtonY, "Options", {
      font: "48px Impact",
      fill: "#000000",
    });
    optionsButtonText.setOrigin(0.5);
  }
}
