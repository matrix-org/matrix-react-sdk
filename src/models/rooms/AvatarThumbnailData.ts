export type AvatarThumbnailData = {
    src: string;
    width: number;
    height: number;
    resizeMethod: "crop" | "scale" 
};

export function avatarUrl(data: AvatarThumbnailData): string {
    let url = new URL(data.src)
    url.searchParams.set('method', data.resizeMethod)
    url.searchParams.set('width', Math.round(data.width).toString())
    url.searchParams.set('height',  Math.round(data.height).toString())
    return url.toString()
}
