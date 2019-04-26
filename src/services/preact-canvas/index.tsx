/**
 * Copyright 2019 Google Inc. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *     http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import { Remote } from "comlink/src/comlink.js";
import { Component, h, render, VNode } from "preact";
import {
  nebulaDangerDark,
  nebulaDangerLight,
  nebulaSafeDark,
  nebulaSafeLight,
  ShaderColor,
  shaderColor
} from "src/rendering/constants";
import { bind } from "src/utils/bind.js";
import { StateChange as GameStateChange } from "../../gamelogic";
import { prerender } from "../../utils/constants";
import { GameType } from "../state";
import { getGridDefault, setGridDefault } from "../state/grid-default";
import StateService from "../state/index.js";
import localStateSubscribe from "../state/local-state-subscribe.js";
import BottomBar from "./components/bottom-bar";
import deferred from "./components/deferred";
import GameLoading from "./components/game-loading";
import Intro from "./components/intro/index.js";
import {
  nebula as nebulaStyle,
  notDangerMode as notDangerModeStyle
} from "./components/nebula/style.css";
import { game as gameClassName, main } from "./style.css";

// If the user tries to start a game when we aren't ready, how long do we wait before showing the
// loading screen?
const loadingScreenTimeout = 1000;

export interface GridType {
  width: number;
  height: number;
  mines: number;
}

interface Props {
  stateServicePromise: Promise<Remote<StateService>>;
}

interface State {
  game?: GameType;
  gridDefaults?: GridType;
  dangerMode: boolean;
  awaitingGame: boolean;
  mainColorLight: ShaderColor;
  mainColorDark: ShaderColor;
  altColorLight: ShaderColor;
  altColorDark: ShaderColor;
}

export type GameChangeCallback = (stateChange: GameStateChange) => void;

// tslint:disable-next-line:variable-name
const Nebula = deferred(
  import("./components/nebula/index.js").then(m => m.default)
);

// tslint:disable-next-line:variable-name
const Game = deferred(
  import("./components/game/index.js").then(m => m.default)
);

const offlineModulePromise = import("../../offline");
const texturePromise = import("../../rendering/animation").then(m =>
  m.lazyGenerateTextures()
);

const gamePerquisites = texturePromise;

const gridDefaultPromise = getGridDefault();

const immedateGameSessionKey = "instantGame";

class PreactService extends Component<Props, State> {
  state: State = {
    dangerMode: false,
    awaitingGame: false,
    altColorDark: nebulaDangerDark,
    altColorLight: nebulaDangerLight,
    mainColorDark: nebulaSafeDark,
    mainColorLight: nebulaSafeLight
  };

  private _gameChangeSubscribers = new Set<GameChangeCallback>();
  private _awaitingGameTimeout: number = -1;
  private _stateService?: Remote<StateService>;

  constructor(props: Props) {
    super(props);
    this._init(props);
  }

  render(
    _props: Props,
    {
      game,
      dangerMode,
      awaitingGame,
      gridDefaults,
      altColorDark,
      altColorLight,
      mainColorDark,
      mainColorLight
    }: State
  ) {
    let mainComponent: VNode;

    if (!game) {
      if (awaitingGame) {
        mainComponent = <GameLoading />;
      } else {
        mainComponent = (
          <Intro
            onStartGame={this._onStartGame}
            defaults={prerender ? undefined : gridDefaults}
          />
        );
      }
    } else {
      mainComponent = (
        <Game
          loading={() => <div />}
          key={game.id}
          width={game.width}
          height={game.height}
          mines={game.mines}
          toRevealTotal={game.toRevealTotal}
          gameChangeSubscribe={this._onGameChangeSubscribe}
          gameChangeUnsubscribe={this._onGameChangeUnsubscribe}
          stateService={this._stateService!}
          dangerMode={dangerMode}
          onDangerModeChange={this._onDangerModeChange}
        />
      );
    }

    return (
      <div class={gameClassName}>
        <Nebula
          loading={() => (
            <div class={[nebulaStyle, notDangerModeStyle].join(" ")} />
          )}
          useAltColor={game ? dangerMode : false}
          altColorDark={altColorDark}
          altColorLight={altColorLight}
          mainColorDark={mainColorDark}
          mainColorLight={mainColorLight}
        />
        {mainComponent}
        <BottomBar onFullscreenClick={this._onFullscreenClick} />
      </div>
    );
  }

  @bind
  private _onDangerModeChange(dangerMode: boolean) {
    this.setState({ dangerMode });
  }

  @bind
  private _onGameChangeSubscribe(func: GameChangeCallback) {
    this._gameChangeSubscribers.add(func);
  }

  @bind
  private _onGameChangeUnsubscribe(func: GameChangeCallback) {
    this._gameChangeSubscribers.delete(func);
  }

  @bind
  private _onFullscreenClick() {
    document.documentElement.requestFullscreen();
  }

  @bind
  private async _onStartGame(width: number, height: number, mines: number) {
    const { updateReady, skipWaiting } = await offlineModulePromise;

    if (updateReady) {
      // There's an update available. Let's load it as part of starting the game…
      await skipWaiting();

      sessionStorage.setItem(
        immedateGameSessionKey,
        JSON.stringify({ width, height, mines })
      );

      location.reload();
      return;
    }

    this._awaitingGameTimeout = setTimeout(() => {
      this.setState({ awaitingGame: true });
    }, loadingScreenTimeout);

    // Wait for everything to be ready:
    await gamePerquisites;
    const stateService = await this.props.stateServicePromise;
    stateService.initGame(width, height, mines);
  }

  private async _init({ stateServicePromise }: Props) {
    gridDefaultPromise.then(gridDefaults => {
      this.setState({ gridDefaults });
    });

    // Is this the reload after an update?
    const instantGameDataStr = sessionStorage.getItem(immedateGameSessionKey);

    if (instantGameDataStr) {
      sessionStorage.removeItem(immedateGameSessionKey);
      this.setState({ awaitingGame: true });
    }

    offlineModulePromise.then(({ init }) => init());

    this._stateService = await stateServicePromise;

    localStateSubscribe(this._stateService, stateChange => {
      if ("game" in stateChange) {
        const game = stateChange.game;

        if (game) {
          clearTimeout(this._awaitingGameTimeout);
          setGridDefault(game.width, game.height, game.mines);
          this.setState({
            game,
            awaitingGame: false,
            gridDefaults: game
          });
        } else {
          this.setState({ game });
        }
      }
      if ("gameStateChange" in stateChange) {
        for (const callback of this._gameChangeSubscribers) {
          callback(stateChange.gameStateChange!);
        }
      }
    });

    if (instantGameDataStr) {
      await gamePerquisites;
      const { width, height, mines } = JSON.parse(instantGameDataStr) as {
        width: number;
        height: number;
        mines: number;
      };

      this._stateService.initGame(width, height, mines);
    }
  }
}

export async function game(stateService: Promise<Remote<StateService>>) {
  const container = document.body.querySelector("main")!;
  container.classList.add(main);
  render(
    <PreactService stateServicePromise={stateService} />,
    container,
    container.firstChild as any
  );
  performance.mark("UI ready");
}
