import { logger } from "matrix-js-sdk/src/logger";
import { useRef, useEffect, MutableRefObject } from "react";

export function useMediaStream<E extends HTMLMediaElement>(
    stream?: MediaStream,
    audioOutputDevice?: string,
    mute = false,
): MutableRefObject<E> {
    const mediaRef = useRef<E>();

    useEffect(() => {
        logger.log(`useMediaStream update stream mediaRef.current ${
            !!mediaRef.current} stream ${stream && stream.id}`);

        if (mediaRef.current) {
            if (stream) {
                mediaRef.current.muted = mute;
                mediaRef.current.srcObject = stream;
                mediaRef.current.play();
            } else {
                mediaRef.current.srcObject = null;
            }
        }
    }, [stream, mute]);

    useEffect(() => {
        if (mediaRef.current && audioOutputDevice && (mediaRef.current as unknown as any) !== undefined) {
            logger.log(`useMediaStream setSinkId ${audioOutputDevice}`);
            (mediaRef.current as unknown as any).setSinkId(audioOutputDevice);
        }
    }, [audioOutputDevice]);

    useEffect(() => {
        const mediaEl = mediaRef.current;

        return () => {
            if (mediaEl) {
                // Ensure we set srcObject to null before unmounting to prevent memory leak
                // https://webrtchacks.com/srcobject-intervention/
                mediaEl.srcObject = null;
            }
        };
    }, []);

    return mediaRef;
}
