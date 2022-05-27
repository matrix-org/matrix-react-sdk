// eslint-disable-next-line matrix-org/require-copyright-header,@typescript-eslint/no-unused-vars
interface Gif{
    type: string;
    id: string;
    slug: string;
    url: string;
    bitly_url: string;
    embed_url: string;
    username: string;
    source: string;
    rating: string;
    content_url: string;
    images: Images;
}

interface Images{
    url: string;
    fixed_height_small: FixedHeightSmall;
}

interface FixedHeightSmall{
    url: string;
}
