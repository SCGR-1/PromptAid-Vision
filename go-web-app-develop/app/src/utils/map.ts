import { isDefined } from '@togglecorp/fujs';
import getBbox from '@turf/bbox';
import type {
    Map,
    NavigationControl,
} from 'mapbox-gl';

import { type Country } from '#hooks/domain/useCountryRaw';

export const defaultMapStyle = 'mapbox://styles/go-ifrc/ckrfe16ru4c8718phmckdfjh0';
export const localUnitMapStyle = 'mapbox://styles/go-ifrc/clvvgugzh00x501pc1n00b8cz';

type NavControlOptions = NonNullable<ConstructorParameters<typeof NavigationControl>[0]>;
export const defaultNavControlOptions: NavControlOptions = {
    showCompass: false,
};

type ControlPosition = NonNullable<Parameters<Map['addControl']>[1]>;
export const defaultNavControlPosition: ControlPosition = 'top-right';

export const defaultMapOptions: Omit<mapboxgl.MapboxOptions, 'style' | 'container'> = {
    logoPosition: 'bottom-left' as const,
    zoom: 1.5,
    minZoom: 1,
    maxZoom: 18,
    scrollZoom: false,
    pitchWithRotate: false,
    dragRotate: false,
    renderWorldCopies: true,
    attributionControl: false,
    preserveDrawingBuffer: true,
    // interactive: false,
};

export function getCountryListBoundingBox(countryList: Country[]) {
    if (countryList.length < 1) {
        return undefined;
    }

    const countryWithBbox = countryList.filter((country) => isDefined(country.bbox));

    if (countryWithBbox.length < 1) {
        return undefined;
    }
    const collection = {
        type: 'FeatureCollection' as const,
        features: countryWithBbox.map((country) => ({
            type: 'Feature' as const,
            geometry: country.bbox,
        })),
    };

    return getBbox(collection);
}
