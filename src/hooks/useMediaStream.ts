import { useRef, useEffect, MutableRefObject } from "react";

export function useMediaStream<E extends HTMLMediaElement>(stream?: MediaStream, mute = false): MutableRefObject<E> {
    const mediaRef = useRef<E>();

    useEffect(() => {
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
