// Copyright 2022 Im-Beast. All rights reserved. MIT license.

import { Tui } from "./tui.ts";
import { ComponentEvent } from "./events.ts";
import { hierarchizeTheme, Style, Theme } from "./theme.ts";

import { EventRecord, TypedEventTarget } from "./utils/typed_event_target.ts";

import type { Rectangle } from "./types.ts";
import type { ViewComponent } from "./components/view.ts";

/** Interface defining object that {Component}'s constructor can interpret */
export interface ComponentOptions {
  /** Parent tui, used for retrieving canvas and adding event listeners */
  tui: Tui;
  /** Component that can manipulate drawing position on the canvas by replacing `tui` element with fake one */
  view?: ViewComponent;
  /** Theme defining look of component */
  theme?: Partial<Theme>;
  /** Position and size of component */
  rectangle?: Rectangle;
  /** Components get rendered based on this value, lower values get rendered first */
  zIndex?: number;
}

/** Interface defining what's accessible in {Component} class */
export interface ComponentPrivate {
  theme: Theme;
  draw(): void;
  interact(method?: "keyboard" | "mouse"): void;
  state: ComponentState;
  zIndex: number;
}

/** Implementation for {Component} class */
export type ComponentImplementation =
  & ComponentPrivate
  & TypedEventTarget<ComponentEventMap>;

/** Default EventMap that every component should use */
export type ComponentEventMap = {
  stateChange: ComponentEvent<"stateChange">;
};

/** Interactivity states that components should use */
export type ComponentState =
  | "focused"
  | "active"
  | "base";

/** Base Component that should be used as base for creating other components */
export class Component<
  EventMap extends EventRecord = Record<never, never>,
> extends TypedEventTarget<EventMap & ComponentEventMap> implements ComponentImplementation {
  tui: Tui;
  theme: Theme;
  #state: ComponentState;
  zIndex: number;

  #view?: ViewComponent;
  #rectangle?: Rectangle;

  constructor({ rectangle, theme, zIndex, tui, view }: ComponentOptions) {
    super();

    this.#rectangle = rectangle;
    this.theme = hierarchizeTheme(theme ?? {});
    this.zIndex = zIndex ?? 0;
    this.#state = "base";
    this.tui = tui;
    this.#view = view;

    // This should run after everything else is setup
    // That's why it's added after everything on even loop is ready
    queueMicrotask(() => {
      this.tui.components.push(this);
      this.tui.dispatchEvent(new ComponentEvent("addComponent", this));
    });
  }

  /** Returns view that's currently associated with component */
  get view(): ViewComponent | undefined {
    return this.#view;
  }

  /** Sets view that will be associated with component and updates view offsets */
  set view(view) {
    if (view) {
      this.tui = view.fakeTui;

      view.components.push(this);
      view.updateOffsets(this);
    } else if (this.view) {
      this.tui = this.view.fakeTui.realTui;

      this.view.components.remove(this);
      this.view.updateOffsets();
    }

    this.#view = view;
  }

  /** Returns component's rectangle */
  get rectangle(): Rectangle | undefined {
    return this.#rectangle;
  }

  /** Sets component's rectangle */
  set rectangle(rectangle) {
    this.#rectangle = rectangle;
  }

  /** Returns current component style */
  get style(): Style {
    return this.theme[this.state];
  }

  /** Sets current component state and dispatches stateChange event */
  set state(state) {
    this.#state = state;
    this.dispatchEvent(new ComponentEvent("stateChange", this));
  }

  /** Returns current component state */
  get state(): ComponentState {
    return this.#state;
  }

  /**
   * Function that's used for rendering component
   * It's called on `tui` update event
   */
  draw(): void {}

  /**
   * Function that's used for interacting with a component
   * It's called by keyboard and mouse control handlers
   */
  interact(_method?: "keyboard" | "mouse"): void {}

  /** Remove component from `tui` and dispatch `removeComponent` event   */
  remove(): void {
    this.tui.components.remove(this);
    this.tui.dispatchEvent(new ComponentEvent("removeComponent", this));
  }
}

/** Interface defining object that {Component}'s constructor can interpret */
export interface PlaceComponentOptions extends ComponentOptions {
  rectangle: Rectangle;
}

/** Component that definitely has it's rectangle set */
export class PlaceComponent<
  EventMap extends EventRecord = Record<never, never>,
> extends Component<EventMap> {
  #rectangle: Rectangle;

  constructor(options: PlaceComponentOptions) {
    super(options);
    this.#rectangle = options.rectangle;
  }

  get rectangle(): Rectangle {
    return this.#rectangle;
  }

  set rectangle(rectangle) {
    this.#rectangle = rectangle;
  }
}
