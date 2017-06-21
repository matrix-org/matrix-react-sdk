class ModularWidgets {
    static widgetTypes = [
        {
            type: 'etherpad',
            icon: 'http://localhost:8000/static/etherpad.svg',
            url: 'http://localhost:8000/etherpad.html',
            name: 'Etherpad',
            description: 'Collaborative text editor',
        },
        {
            type: 'recipieStream',
            icon: 'http://localhost:8000/static/etherpad.svg',
            url: 'https://www.youtube.com/embed/ZJy1ajvMU1k?controls=0&enablejsapi=1&iv_load_policy=3&modestbranding=1&playsinline=1&autoplay=1',
            name: 'Recipie Live Stream',
            description: 'Live stream - Boeuf Bourguignon',
        },
        {
            type: 'recipieIngredients',
            icon: 'http://localhost:8000/static/etherpad.svg',
            url: 'http://localhost:8000/recepie.html',
            name: 'Recipie Ingredients',
            description: 'Ingredients - Boeuf Bourguignon',
        },
        {
            type: 'youtube',
            icon: 'http://localhost:8000/static/etherpad.svg',
            url: 'https://www.youtube.com/embed/ZfkwW4GgAiU?controls=0&enablejsapi=1&iv_load_policy=3&modestbranding=1&playsinline=1&autoplay=1',
            name: 'CamGirl',
            description: 'Live stream - ChatGirl86',
        },
        {
            type: 'tip',
            icon: 'http://localhost:8000/static/etherpad.svg',
            url: 'http://localhost:8000/index.html',
            name: 'Tips',
            description: 'Tip Me!!! -- Send me cash $$$',
        },
        {
            type: 'lg',
            icon: 'http://localhost:8000/static/etherpad.svg',
            url: 'http://localhost:8000/lg.html',
            name: 'L&G Insurance',
            description: 'L&G Insurance Policy',
        },
        {
            type: 'grafana',
            icon: 'http://localhost:8000/static/grafana.svg',
            url: 'http://localhost:8000/grafana.html',
            name: 'Grafana',
            description: 'Graph and monitor all the things!',
        },
        {
            type: 'jitsi',
            icon: 'http://localhost:8000/static/jitsi.svg',
            url: 'http://localhost:8000/jitsi.html',
            name: 'jitsi',
            description: 'Jitsi video conference',
        },
        {
            type: 'vrdemo',
            icon: 'http://localhost:8000/static/cardboard.png',
            url: 'http://localhost:8000/vrdemo.html',
            name: 'vrdemo',
            description: 'Matrix VR Demo',
        },
        {
            type: 'custom',
            icon: 'http://localhost:8000/static/blocks.png',
            name: 'Custom Widget',
            description: 'Add your own custom widget',
        },
    ];
}
export default ModularWidgets;
