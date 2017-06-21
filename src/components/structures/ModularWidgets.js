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
