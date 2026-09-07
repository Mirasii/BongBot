import { ExtendedClient } from '@pookiesoft/bongbot-core';
import arab from './arab.js';
import callirap from './callirap.js';
import chat_ai from './chat_ai.js';
import cherry from './cherry.js';
import classic from './classic.js';
import club_kid from './club_kid.js';
import creeper from './creeper.js';
import cringe from './cringe.js';
import dance from './dance.js';
import die from './die.js';
import funk from './funk.js';
import help from './help.js';
import hentai from './hentai.js';
import hoe from './hoe.js';
import info from './info.js';
import mirasi from './mirasi.js';
import no from './no.js';
import ping from './ping.js';
import roll from './roll.js';
import seachicken from './seachicken.js';
import userinfo from './userinfo.js';
import vape from './vape.js';
import yes from './yes.js';
import you from './you.js';
import { pterodactyl } from '@pookiesoft/bongbot-ptero';
import { quotedb } from '@pookiesoft/bongbot-quote';
import { Caller, commandBuilder } from '@pookiesoft/bongbot-core';
import {
    buildCommands as buildBooruCommands,
    createProvider,
    HttpImageDownloader,
    RetryingCaller,
} from '@pookiesoft/bongbot-booru';

const commandsArray = [
    arab,
    callirap,
    chat_ai,
    cherry,
    classic,
    club_kid,
    creeper,
    cringe,
    dance,
    die,
    funk,
    help,
    hentai,
    hoe,
    info,
    mirasi,
    no,
    ping,
    roll,
    seachicken,
    userinfo,
    vape,
    yes,
    you,
    pterodactyl,
    quotedb,
];

export default function buildCommands(client: ExtendedClient) {
    const caller = new RetryingCaller(new Caller());
    const provider = createProvider(caller);
    const downloader = new HttpImageDownloader(caller);
    return [...commandBuilder(client, commandsArray), ...buildBooruCommands(client, provider, downloader)];
}
