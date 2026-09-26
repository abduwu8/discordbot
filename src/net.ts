import { setDefaultResultOrder } from 'node:dns';
import net from 'node:net';

// Render (and other IPv6-broken hosts) can black-hole Discord's gateway if Node
// tries IPv6 first. Force IPv4 before any discord.js sockets open.
setDefaultResultOrder('ipv4first');
if (typeof net.setDefaultAutoSelectFamily === 'function') {
  net.setDefaultAutoSelectFamily(false);
}
