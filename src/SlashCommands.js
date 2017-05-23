/*
Copyright 2015, 2016 OpenMarket Ltd

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

var MatrixClientPeg = require("./MatrixClientPeg");
var dis = require("./dispatcher");
var Tinter = require("./Tinter");
import sdk from './index';
import Modal from './Modal';


class Command {
    constructor(name, paramArgs, runFn) {
        this.name = name;
        this.paramArgs = paramArgs;
        this.runFn = runFn;
    }

    getCommand() {
        return "/" + this.name;
    }

    getCommandWithArgs() {
        return this.getCommand() + " " + this.paramArgs;
    }

    run(roomId, args) {
        return this.runFn.bind(this)(roomId, args);
    }

    getUsage() {
        return "Usage: " + this.getCommandWithArgs();
    }
}

var reject = function(msg) {
    return {
        error: msg
    };
};

var success = function(promise) {
    return {
        promise: promise
    };
};

var commands = {
    ddg: new Command("ddg", "<query>", function(roomId, args) {
        const ErrorDialog = sdk.getComponent('dialogs.ErrorDialog');
        // TODO Don't explain this away, actually show a search UI here.
        Modal.createDialog(ErrorDialog, {
            title: "/ddg is not a command",
            description: "To use it, just wait for autocomplete results to load and tab through them.",
        });
        return success();
    }),

    // Change your nickname
    nick: new Command("nick", "<display_name>", function(room_id, args) {
        if (args) {
            return success(
                MatrixClientPeg.get().setDisplayName(args)
            );
        }
        return reject(this.getUsage());
    }),

    // Changes the colorscheme of your current room
    tint: new Command("tint", "<color1> [<color2>]", function(room_id, args) {
        if (args) {
            var matches = args.match(/^(#([0-9a-fA-F]{3}|[0-9a-fA-F]{6}))( +(#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})))?$/);
            if (matches) {
                Tinter.tint(matches[1], matches[4]);
                var colorScheme = {};
                colorScheme.primary_color = matches[1];
                if (matches[4]) {
                    colorScheme.secondary_color = matches[4];
                }
                return success(
                    MatrixClientPeg.get().setRoomAccountData(
                        room_id, "org.matrix.room.color_scheme", colorScheme
                    )
                );
            }
        }
        return reject(this.getUsage());
    }),

    // Change the room topic
    topic: new Command("topic", "<topic>", function(room_id, args) {
        if (args) {
            return success(
                MatrixClientPeg.get().setRoomTopic(room_id, args)
            );
        }
        return reject(this.getUsage());
    }),

    // Invite a user
    invite: new Command("invite", "<userId>", function(room_id, args) {
        if (args) {
            var matches = args.match(/^(\S+)$/);
            if (matches) {
                return success(
                    MatrixClientPeg.get().invite(room_id, matches[1])
                );
            }
        }
        return reject(this.getUsage());
    }),

    // Join a room
    join: new Command("join", "#alias:domain", function(room_id, args) {
        if (args) {
            var matches = args.match(/^(\S+)$/);
            if (matches) {
                var room_alias = matches[1];
                if (room_alias[0] !== '#') {
                    return reject(this.getUsage());
                }
                if (!room_alias.match(/:/)) {
                    room_alias += ':' + MatrixClientPeg.get().getDomain();
                }

                dis.dispatch({
                    action: 'view_room',
                    room_alias: room_alias,
                    auto_join: true,
                });

                return success();
            }
        }
        return reject(this.getUsage());
    }),

    part: new Command("part", "[#alias:domain]", function(room_id, args) {
        var targetRoomId;
        if (args) {
            var matches = args.match(/^(\S+)$/);
            if (matches) {
                var room_alias = matches[1];
                if (room_alias[0] !== '#') {
                    return reject(this.getUsage());
                }
                if (!room_alias.match(/:/)) {
                    room_alias += ':' + MatrixClientPeg.get().getDomain();
                }

                // Try to find a room with this alias
                var rooms = MatrixClientPeg.get().getRooms();
                for (var i = 0; i < rooms.length; i++) {
                    var aliasEvents = rooms[i].currentState.getStateEvents(
                        "m.room.aliases"
                    );
                    for (var j = 0; j < aliasEvents.length; j++) {
                        var aliases = aliasEvents[j].getContent().aliases || [];
                        for (var k = 0; k < aliases.length; k++) {
                            if (aliases[k] === room_alias) {
                                targetRoomId = rooms[i].roomId;
                                break;
                            }
                        }
                        if (targetRoomId) { break; }
                    }
                    if (targetRoomId) { break; }
                }
            }
            if (!targetRoomId) {
                return reject("Unrecognised room alias: " + room_alias);
            }
        }
        if (!targetRoomId) targetRoomId = room_id;
        return success(
            MatrixClientPeg.get().leave(targetRoomId).then(
            function() {
                dis.dispatch({action: 'view_next_room'});
            })
        );
    }),

    // Kick a user from the room with an optional reason
    kick: new Command("kick", "<userId> [<reason>]", function(room_id, args) {
        if (args) {
            var matches = args.match(/^(\S+?)( +(.*))?$/);
            if (matches) {
                return success(
                    MatrixClientPeg.get().kick(room_id, matches[1], matches[3])
                );
            }
        }
        return reject(this.getUsage());
    }),

    // Ban a user from the room with an optional reason
    ban: new Command("ban", "<userId> [<reason>]", function(room_id, args) {
        if (args) {
            var matches = args.match(/^(\S+?)( +(.*))?$/);
            if (matches) {
                return success(
                    MatrixClientPeg.get().ban(room_id, matches[1], matches[3])
                );
            }
        }
        return reject(this.getUsage());
    }),

    // Unban a user from the room
    unban: new Command("unban", "<userId>", function(room_id, args) {
        if (args) {
            var matches = args.match(/^(\S+)$/);
            if (matches) {
                // Reset the user membership to "leave" to unban him
                return success(
                    MatrixClientPeg.get().unban(room_id, matches[1])
                );
            }
        }
        return reject(this.getUsage());
    }),

    // Define the power level of a user
    op: new Command("op", "<userId> [<power level>]", function(room_id, args) {
        if (args) {
            var matches = args.match(/^(\S+?)( +(\d+))?$/);
            var powerLevel = 50; // default power level for op
            if (matches) {
                var user_id = matches[1];
                if (matches.length === 4 && undefined !== matches[3]) {
                    powerLevel = parseInt(matches[3]);
                }
                if (powerLevel !== NaN) {
                    var room = MatrixClientPeg.get().getRoom(room_id);
                    if (!room) {
                        return reject("Bad room ID: " + room_id);
                    }
                    var powerLevelEvent = room.currentState.getStateEvents(
                        "m.room.power_levels", ""
                    );
                    return success(
                        MatrixClientPeg.get().setPowerLevel(
                            room_id, user_id, powerLevel, powerLevelEvent
                        )
                    );
                }
            }
        }
        return reject(this.getUsage());
    }),

    // Reset the power level of a user
    deop: new Command("deop", "<userId>", function(room_id, args) {
        if (args) {
            var matches = args.match(/^(\S+)$/);
            if (matches) {
                var room = MatrixClientPeg.get().getRoom(room_id);
                if (!room) {
                    return reject("Bad room ID: " + room_id);
                }

                var powerLevelEvent = room.currentState.getStateEvents(
                    "m.room.power_levels", ""
                );
                return success(
                    MatrixClientPeg.get().setPowerLevel(
                        room_id, args, undefined, powerLevelEvent
                    )
                );
            }
        }
        return reject(this.getUsage());
    }),

    // Verify a user, device, and pubkey tuple
    verify: new Command("verify", "<userId> <deviceId> <deviceSigningKey>", function(room_id, args) {
        if (args) {
            var matches = args.match(/^(\S+) +(\S+) +(\S+)$/);
            if (matches) {
                var userId = matches[1];
                var deviceId = matches[2];
                var device = MatrixClientPeg.get().getStoredDevice(userId, deviceId);
                if (!device) {
                    return reject(`Unknown (user, device) pair: (${userId}, ${deviceId})`);
                }

                var fingerprint = matches[3];

                if (device.isVerified() && device.getFingerprint() === fingerprint) {
                    return reject(`Device already verified!`);
                } else if (device.isVerified() && device.getFingerprint() !== fingerprint) {
                    return reject(`WARNING: Device already verified, but keys do NOT MATCH!`);
                }

                if (device.getFingerprint() === fingerprint) {

                    var QuestionDialog = sdk.getComponent("dialogs.QuestionDialog");
                    Modal.createDialog(QuestionDialog, {
                        title: "Approve verified device",
                        description: (
                            <div>
                                <p>
                                    The signing key in your slash command matches the signing key you
                                    received for this user and device!
                                </p>
                                <div className="mx_UserSettings_cryptoSection">
                                    <ul>
                                        <li><label>User ID:</label> <span>{ userId }</span></li>
                                        <li><label>Device name:</label> <span>{ device.getDisplayName() }</span></li>
                                        <li><label>Device ID:</label>   <span><code>{ device.deviceId}</code></span></li>
                                        <li><label>Device fingerprint:</label>  <span><code><b>{ device.getFingerprint() }</b></code></span></li>
                                        <li><label>Device key:</label>  <span><code><b>{ device.getIdentityKey() }</b></code></span></li>
                                    </ul>
                                </div>
                                <p>
                                    If you would like to accept this device as validated, press accept!
                                </p>
                            </div>
                        ),
                        button: "Accept this verified key",
                        onFinished: confirm => {
                            if (confirm) {
                                MatrixClientPeg.get().setDeviceVerified(
                                    userId, deviceId, true
                                );
                            }
                        },
                    });

                    return success();
                } else {
                    return reject(`WARNING: KEY VERIFICATION FAILED! The signing key for ${userId} and device
                            ${deviceId} is \"${device.getFingerprint()}\" which does not match the provided key
                            \"${fingerprint}\" This could mean your communications are being intercepted!`);
                }
            }
        }
        return reject(this.getUsage());
    }),
};

// helpful aliases
var aliases = {
    j: "join"
};

module.exports = {
    /**
     * Process the given text for /commands and perform them.
     * @param {string} roomId The room in which the command was performed.
     * @param {string} input The raw text input by the user.
     * @return {Object|null} An object with the property 'error' if there was an error
     * processing the command, or 'promise' if a request was sent out.
     * Returns null if the input didn't match a command.
     */
    processInput: function(roomId, input) {
        // trim any trailing whitespace, as it can confuse the parser for
        // IRC-style commands
        input = input.replace(/\s+$/, "");
        if (input[0] === "/" && input[1] !== "/") {
            var bits = input.match(/^(\S+?)( +((.|\n)*))?$/);
            var cmd, args;
            if (bits) {
                cmd = bits[1].substring(1).toLowerCase();
                args = bits[3];
            }
            else {
                cmd = input;
            }
            if (cmd === "me") return null;
            if (aliases[cmd]) {
                cmd = aliases[cmd];
            }
            if (commands[cmd]) {
                return commands[cmd].run(roomId, args);
            }
            else {
                return reject("Unrecognised command: " + input);
            }
        }
        return null; // not a command
    },

    getCommandList: function() {
        // Return all the commands plus /me and /markdown which aren't handled like normal commands
        var cmds = Object.keys(commands).sort().map(function(cmdKey) {
            return commands[cmdKey];
        });
        cmds.push(new Command("me", "<action>", function() {}));
        cmds.push(new Command("markdown", "<on|off>", function() {}));

        return cmds;
    }
};
