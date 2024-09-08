import { useEffect, useState } from "react";
import { MatrixClientPeg } from "../MatrixClientPeg";
import { MatrixError } from "matrix-js-sdk/src/matrix";

/**
 * Fetch a user's delclared timezone through their profile, and return
 * a friendly string of the current time for that user. This will keep
 * in sync with the current time, and will be refreshed once a minute.
 *
 * @param userId The userID to fetch the timezone for.
 * @returns A timezone name and friendly string for the user's timezone, or
 *          null if the user has no timezone or the timezone was not recognised
 *          by the browser.
 */
export const useUserTimezone = (userId: string): { timezone: string, friendly: string }|null => {
    const [timezone, setTimezone] = useState<string>();
    const [updateInterval, setUpdateInterval] = useState<number>();
    const [friendly, setFriendly] = useState<string>();
    const [supported, setSupported] = useState<boolean>();
    const cli = MatrixClientPeg.safeGet();

    useEffect(() => {
        if (supported !== undefined) {
            return;
        }
        cli.doesServerSupportExtendedProfiles().then(setSupported).catch((ex) => {
            console.warn("Unable to determine if extended profiles are supported", ex);
        });
    }, [supported]);

    useEffect(() => {
        return () => {
            if (updateInterval) {
                clearInterval(updateInterval);
            }
        }
    }, [updateInterval]);

    useEffect(() => {
        if (supported !== true) {
            return;
        }
        (async () => {
            try {
                const tz = await cli.getExtendedProfileProperty(userId, 'us.cloke.msc4175.tz');
                if (typeof tz !== "string") {
                    // Err, definitely not a tz.
                    throw Error('Timezone value was not a string');
                }
                // This will validate the timezone for us.
                Intl.DateTimeFormat(undefined, {timeZone: tz});

                const updateTime = () => {
                    const currentTime = new Date();
                    const friendly = currentTime.toLocaleString(undefined, { timeZone: tz, hour12: true, hour: "2-digit", minute: "2-digit", timeZoneName: "shortOffset"});
                    setTimezone(tz);
                    setFriendly(friendly);
                    setUpdateInterval(setTimeout(updateTime, (60 - currentTime.getSeconds()) * 1000));
                }
                updateTime();
            } catch (ex) {
                setTimezone(undefined);
                setFriendly(undefined);
                setUpdateInterval(undefined);
                if (ex instanceof MatrixError && ex.errcode === "M_NOT_FOUND") {
                    // No timezone set, ignore.
                    return;
                }
                console.error('Could not render current timezone for user', ex);
            }
        })();
    }, [supported, userId]);

    if (!timezone || !friendly) {
        return null;
    }

    return {
        friendly,
        timezone
    };
}