// Copyright 2022 Im-Beast. All rights reserved. MIT license.

import { Component, ComponentOptions } from "../component.ts";

import { EventRecord } from "../utils/typed_event_target.ts";

import type { Rectangle } from "../types.ts";

export const sharpFramePieces = {
  topLeft: "┌",
  topRight: "┐",
  bottomLeft: "└",
  bottomRight: "┘",
  horizontal: "─",
  vertical: "│",
} as const;

export const roundedFramePieces = {
  topLeft: "╭",
  topRight: "╮",
  bottomLeft: "╰",
  bottomRight: "╯",
  horizontal: "─",
  vertical: "│",
} as const;

export type FramePieceType = {
  [key in keyof typeof sharpFramePieces]: string;
};

export type FrameComponentOptions =
  & ComponentOptions
  & {
    framePieces?: "sharp" | "rounded" | FramePieceType;
  }
  & (
    { rectangle?: never; component: Component } | { component?: never; rectangle: Rectangle }
  );

export class FrameComponent<EventMap extends EventRecord = Record<never, never>> extends Component<EventMap> {
  framePieces: "sharp" | "rounded" | FramePieceType;

  #component?: Component;
  #rectangle?: Rectangle;

  constructor({ tui, view, component, rectangle, theme, framePieces, zIndex }: FrameComponentOptions) {
    super({
      tui,
      view,
      rectangle,
      theme: theme ?? component?.theme,
      zIndex: zIndex ?? component?.zIndex,
    });

    this.component = component;
    if (!this.#component) {
      this.rectangle = rectangle!;
    }

    this.framePieces = framePieces ?? "sharp";

    if (!this.#rectangle) {
      throw new Error("You need to pass either rectangle or component that has its rectangle set to FrameComponent");
    }
  }

  get rectangle(): Rectangle {
    if (this.#component) {
      const { column, row, width, height } = this.#component!.rectangle!;

      return {
        column: column - 1,
        row: row - 1,
        width: width + 2,
        height: height + 2,
      };
    }

    return this.#rectangle!;
  }

  set rectangle(rectangle: Rectangle) {
    this.#rectangle = rectangle;
  }

  get component(): Component | undefined {
    return this.#component;
  }

  set component(component: Component | undefined) {
    this.#component = component;

    if (!this.#component) return;
    if (!this.#component.rectangle) {
      throw new Error("You need component that has its rectangle set");
    }
    this.rectangle = this.#component.rectangle;
  }

  get state() {
    return this.component?.state ?? "base";
  }

  set state(_value) {}

  draw() {
    super.draw();

    const { style, framePieces } = this;
    const { canvas } = this.component?.tui ?? this.tui;

    const { column, row, width, height } = this.rectangle;

    const pieces = framePieces === "sharp"
      ? sharpFramePieces
      : framePieces === "rounded"
      ? roundedFramePieces
      : framePieces;

    canvas.draw(column, row, style(pieces.topLeft));
    canvas.draw(column + width - 1, row, style(pieces.topRight));

    for (let y = row + 1; y < row + height - 1; ++y) {
      canvas.draw(column, y, style(pieces.vertical));
      canvas.draw(column + width - 1, y, style(pieces.vertical));
    }

    for (let x = column + 1; x < column + width - 1; ++x) {
      canvas.draw(x, row, style(pieces.horizontal));
      canvas.draw(x, row + height - 1, style(pieces.horizontal));
    }

    canvas.draw(column, row + height - 1, style(pieces.bottomLeft));
    canvas.draw(column + width - 1, row + height - 1, style(pieces.bottomRight));
  }
}
