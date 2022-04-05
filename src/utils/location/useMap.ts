import { useEffect, useState } from 'react';
import { Map as MapLibreMap } from 'maplibre-gl';

import { createMap } from "./map";

interface UseMapProps {
    bodyId: string;
    onError: (error: Error) => void;
    interactive?: boolean;
}

/**
 * Create a map instance
 * Add listeners for errors
 * Make sure `onError` has a stable reference
 * As map is recreated on changes to it
 */
export const useMap = ({
    interactive,
    bodyId,
    onError,
}: UseMapProps): MapLibreMap => {
    const [map, setMap] = useState<MapLibreMap>();

    useEffect(
        () => {
            try {
                setMap(createMap(interactive, bodyId, onError));
            } catch (error) {
                onError(error);
            }
            return () => {
                if (map) {
                    map.remove();
                    setMap(undefined);
                }
            };
        },
        // map is excluded as a dependency
        // eslint-disable-next-line react-hooks/exhaustive-deps
        [interactive, bodyId, onError],
    );

    return map;
};

