/*
 Copyright 2020 Nurjin Jafar
 Copyright 2020 Nordeck IT + Consulting GmbH.

 Licensed under the Apache License, Version 2.0 (the "License");
 you may not use this file except in compliance with the License.
 You may obtain a copy of the License at

 http://www.apache.org/licenses/LICENSE-2.0

 Unless required by applicable law or agreed to in writing, software
 distributed under the License is distributed on an "AS IS" BASIS,
 WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 See the License for the specific language governing permissions and
 limitations under the License.
 */
import { _t, _td } from "../languageHandler";
import { ConfettiOptions } from "./confetti";
import { Effect } from "./effect";
import { FireworksOptions } from "./fireworks";
import { RainfallOptions } from "./rainfall";
import { SnowfallOptions } from "./snowfall";
import { SpaceInvadersOptions } from "./spaceinvaders";
import { HeartOptions } from "./hearts";

/**
 * This configuration defines room effects that can be triggered by custom message types and emojis
 */
export const CHAT_EFFECTS: Array<Effect<{ [key: string]: any }>> = [
    {
        emojis: ["🎊", "🎉"],
        msgType: "nic.custom.confetti",
        command: "confetti",
        description: () => _td("chat_effects|confetti_description"),
        fallbackMessage: () => _t("chat_effects|confetti_message") + " 🎉",
        options: {
            maxCount: 150,
            speed: 3,
            frameInterval: 15,
            alpha: 1.0,
            gradient: false,
        },
    } as Effect<ConfettiOptions>,
    {
        emojis: ["🎆"],
        msgType: "nic.custom.fireworks",
        command: "fireworks",
        description: () => _td("chat_effects|fireworks_description"),
        fallbackMessage: () => _t("chat_effects|fireworks_message") + " 🎆",
        options: {
            maxCount: 500,
            gravity: 0.05,
        },
    } as Effect<FireworksOptions>,
    {
        emojis: ["🌧️", "⛈️", "🌦️"],
        msgType: "io.element.effect.rainfall",
        command: "rainfall",
        description: () => _td("chat_effects|rainfall_description"),
        fallbackMessage: () => _t("chat_effects|rainfall_message") + " 🌧️",
        options: {
            maxCount: 600,
            speed: 10,
        },
    } as Effect<RainfallOptions>,
    {
        emojis: ["❄", "🌨"],
        msgType: "io.element.effect.snowfall",
        command: "snowfall",
        description: () => _td("chat_effects|snowfall_description"),
        fallbackMessage: () => _t("chat_effects|snowfall_message") + " ❄",
        options: {
            maxCount: 200,
            gravity: 0.05,
            maxDrift: 5,
        },
    } as Effect<SnowfallOptions>,
    {
        emojis: ["👾", "🌌"],
        msgType: "io.element.effects.space_invaders",
        command: "spaceinvaders",
        description: () => _td("chat_effects|spaceinvaders_description"),
        fallbackMessage: () => _t("chat_effects|spaceinvaders_message") + " 👾",
        options: {
            maxCount: 50,
            gravity: 0.01,
        },
    } as Effect<SpaceInvadersOptions>,
    {
        emojis: ["💝"],
        msgType: "io.element.effect.hearts",
        command: "hearts",
        description: () => _td("chat_effects|hearts_description"),
        fallbackMessage: () => _t("chat_effects|hearts_message") + " 💝",
        options: {
            maxCount: 120,
            gravity: 3.2,
        },
    } as Effect<HeartOptions>,
];
