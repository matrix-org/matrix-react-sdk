import { useEffect } from "react";

// https://stackoverflow.com/a/9039885
function isIOS() {
    return (
        [
            "iPad Simulator",
            "iPhone Simulator",
            "iPod Simulator",
            "iPad",
            "iPhone",
            "iPod",
        ].includes(navigator.platform) ||
        // iPad on iOS 13 detection
        (navigator.userAgent.includes("Mac") && "ontouchend" in document)
    );
}

export function usePageUnload(callback) {
    useEffect(() => {
        let pageVisibilityTimeout;

        function onBeforeUnload(event) {
            if (event.type === "visibilitychange") {
                if (document.visibilityState === "visible") {
                    clearTimeout(pageVisibilityTimeout);
                } else {
                    // Wait 5 seconds before closing the page to avoid accidentally leaving
                    // TODO: Make this configurable?
                    pageVisibilityTimeout = setTimeout(() => {
                        callback();
                    }, 5000);
                }
            } else {
                callback();
            }
        }

        // iOS doesn't fire beforeunload event, so leave the call when you hide the page.
        if (isIOS()) {
            window.addEventListener("pagehide", onBeforeUnload);
            document.addEventListener("visibilitychange", onBeforeUnload);
        }

        window.addEventListener("beforeunload", onBeforeUnload);

        return () => {
            window.removeEventListener("pagehide", onBeforeUnload);
            document.removeEventListener("visibilitychange", onBeforeUnload);
            window.removeEventListener("beforeunload", onBeforeUnload);
            clearTimeout(pageVisibilityTimeout);
        };
    }, [callback]);
}
