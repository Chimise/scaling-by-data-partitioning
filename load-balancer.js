import {createServer} from 'http';
import httpProxy from 'http-proxy';
import { resDecorator } from './utils/index.js';

const PORT = process.env.PORT || process.argv[2] || 8080;


const servers = [
    {
        urls: ['http://localhost:8000'],
        matcher: String.raw`^\/api\/people\/byFirstName\/[a-d]{1}\w*$`,
        index: 0
    },
    {
        urls: ['http://localhost:8000'],
        matcher: String.raw`^\/api\/people\/byFirstName\/[e-p]{1}\w*$`,
        index: 0
    },
    {
        urls: ['http://localhost:8002'],
        matcher: String.raw`^\/api\/people\/byFirstName\/[q-z]{1}\w*$`,
        index: 0
    }
]

const getMatchedServer = (url) => {
    let matchServer;
    for (const server of servers) {
        const regex = new RegExp(server.matcher, 'i');
        if(regex.test(url)) {
            server.index = (server.index + 1) % server.urls.length;
            matchServer = server.urls[server.index];
            break;
        }   
    }

    return matchServer;
}


async function main() {
    const proxy = httpProxy.createProxyServer()
    const server = createServer((req, res) => {
        const url = req.url;
        resDecorator(res);
        const target = getMatchedServer(url);
        if(!target) {
            return res.status(502).end('Bad Gateway')
        }

        proxy.web(req, res, {target});
    })

    server.listen(PORT, () => {
        console.log('Load balancer running on port %d', PORT);
    })
}


main().catch(err => console.log(err));