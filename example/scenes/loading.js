import Phaser from "phaser";
import MenuScene from "./menu";
import PlayScene from "./play";

export default class LoadingScene extends Phaser.Scene {
  constructor() {
    super("LoadingScene");
    this.loadingText = null;
    this.progressBar = null;
    this.progressBarFill = null;
  }

  preload() {
    // Set up background
    const width = this.cameras.main.width;
    const height = this.cameras.main.height;
    const background = this.add.rectangle(width / 2, height / 2, width, height, 0xf0f5fc);
    background.setOrigin(0.5);

    // Display a progress bar
    const progressBarHeight = 40;
    const progressBarWidth = 600;
    const progressBarX = (width - progressBarWidth) / 2;
    const progressBarY = height / 2 + 100;

    this.progressBar = this.add.graphics();
    this.progressBar.fillStyle(0xe69a8d, 1);
    this.progressBar.fillRect(progressBarX, progressBarY, progressBarWidth, progressBarHeight);

    this.progressBarFill = this.add.graphics();
    this.progressBarFill.fillStyle(0x222222, 1);
    this.progressBarFill.fillRect(progressBarX, progressBarY, 0, progressBarHeight);

    this.loadingText = this.make.text({
      x: width / 2,
      y: progressBarY - 70,
      text: "Loading...",
      style: {
        font: "30px monospace",
        fill: "#222222",
      },
    });
    this.loadingText.setOrigin(0.5, 0.5);

    // this.load.image("logo", "../textures/logo.png");
    // this.add.image(width / 2, height / 2 - 100, "logo");

    this.load.on("progress", (value) => {
      this.progressBarFill.clear();
      this.progressBarFill.fillStyle(0x5f4b8b, 1);
      this.progressBarFill.fillRect(progressBarX, progressBarY, progressBarWidth * value, progressBarHeight);
    });

    this.load.on("complete", () => {
      // Delay of 1 second before proceeding to the next scene
      this.time.delayedCall(2000, () => {
        this.scene.start("MenuScene");
      });
    });

    this.load.start();
  }
}
