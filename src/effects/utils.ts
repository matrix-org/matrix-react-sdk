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
/**
 * Checks a message if it contains one of the provided emojis
 * @param  {Object} content The message
 * @param  {Array<string>} emojis The list of emojis to check for
 */
export const containsEmoji = (content: { msgtype: string, body: string }, emojis: Array<string>): boolean => {
    return emojis.some((emoji) => content.body && content.body.includes(emoji));
}
