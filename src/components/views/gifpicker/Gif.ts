/* eslint-disable camelcase */

// a gif, as returned by the giphy endpoint
export interface Gif {
    id: string;
    title: string;
    images: {
        preview_gif: {
            url: string;
            width: string;
            height: string;
        };
        fixed_width: {
            url: string;
            width: string;
            height: string;
            webp: string;
            mp4: string;
        };
        original: {
            height: string;
            width: string;
            mp4: string;
            webp: string;
            url: string;
        };
        downsized: {
            url: string;
        };
    };
}
