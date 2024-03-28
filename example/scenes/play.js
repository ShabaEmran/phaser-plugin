import Phaser from "phaser";

export default class PlayScene extends Phaser.Scene {
  constructor() {
    super("PlayScene");
    this.shapes = [];
    this.currentShape = null;
  }

  create() {
    // Create a group for shapes
    this.shapesGroup = this.add.group();

    // Add initial shapes
    this.addShape(100, 200, 0xff0000); // Red
    this.addShape(300, 400, 0x00ff00); // Green
    this.addShape(500, 300, 0x0000ff); // Blue

    // Handle input
    this.input.on("pointerdown", this.onPointerDown, this);
    this.input.on("pointermove", this.onPointerMove, this);
    this.input.on("pointerup", this.onPointerUp, this);

    // Instructions
    const instructionsText = "Click and drag to move shapes\nRight-click to change color";
    this.add.text(20, 20, instructionsText, { font: "18px Arial", fill: "#222222" });
  }

  addShape(x, y, color) {
    const shape = this.add.rectangle(x, y, 100, 100, color);
    shape.setStrokeStyle(2, 0x000000);
    this.shapesGroup.add(shape);
    this.shapes.push(shape);
  }

  onPointerDown(pointer) {
    if (pointer.rightButtonDown()) {
      this.changeShapeColor(pointer);
    } else {
      this.currentShape = this.shapesGroup
        .getChildren()
        .find((shape) => shape.getBounds().contains(pointer.x, pointer.y));
    }
  }

  onPointerMove(pointer) {
    if (this.currentShape) {
      this.currentShape.x = pointer.x;
      this.currentShape.y = pointer.y;
    }
  }

  onPointerUp() {
    this.currentShape = null;
  }

  changeShapeColor(pointer) {
    const shape = this.shapesGroup.getChildren().find((shape) => shape.getBounds().contains(pointer.x, pointer.y));
    if (shape) {
      const newColor = Phaser.Display.Color.RandomRGB().color;
      shape.setFillStyle(newColor, 1);
    }
  }
}
