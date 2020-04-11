// lib/app.ts
import express from 'express';
import http from 'http';
import WebSocket from 'ws';
import url from 'url';
import { v4 as uuidv4 } from 'uuid';
//import bcrypt from "bcrypt";
//import passport from "passport";
//import session from "express-session";

// TODO: for testing only, very dangerous
process.env['NODE_TLS_REJECT_UNAUTHORIZED'] = '0';

class ReconnectigWS {
    /**
     * Connect to and manage the connection with a remote websocket server.
     * Reconnect automatically. And ping the server frequently to make sure
     * that the connection is still alive.
     *
     * @remarks
     * Will consider any communication from the server (message, connection,
     * pong, ping) as valid and use those to reset the connection timeout
     * timer.
     *
     * The client pings the server on a regular frequency (defined in
     * pingFreq) begining after the socket connects.
     *
     * @param url - The url of the remote socket server
     * @param onMessage - What you want to do when a new message arrives
     * @param onClose - What you want to do when the socket has been closed
     *                  Note: the socket will reconnect regardless of what you
     *                  put here
     * @param onError - What you want to do when the socket has had an error
     *                  Note: the socket will reconnect regardless of what you
     *                  put here
     * @param pingFreq - The frequency with which you want the server to be pinged (ms)
     * @param reconnectDelay - The delay betwen reconect attempts (ms)
     * @param connectionTimeout - The amount of time to wait to hear from the
     *                            server before concluding that the connection
     *                            is dead. (should be larger than the ping
     *                            freq)
     */
    sock: WebSocket | undefined;
    timeout: ReturnType<typeof setTimeout> | undefined;
    pingTimer: ReturnType<typeof setInterval> | undefined;
    connection: boolean;
    connecting: boolean;
    url: string;
    onMessage: (msg: string) => void;
    onClose: () => void;
    onError: (err: Error) => void;
    pingFreq: number;
    reconnectDelay: number;
    connectionTimeout: number;

    constructor(
        url: string,
        onMessage: (msg: string) => void = (msg) => {},
        onClose: () => void = () => {},
        onError: (err: Error) => void = () => {},
        pingFreq: number = 1000,
        reconnectDelay: number = 1000,
        connectionTimeout: number = 5000,
    ) {
        this.url = url;
        this.connection = false;
        this.connecting = false;
        this.onMessage = onMessage;
        this.onClose = onClose;
        this.onError = onError;
        this.pingFreq = pingFreq;
        this.reconnectDelay = reconnectDelay;
        this.connectionTimeout = connectionTimeout;

        this.connect();
    }

    connect() {
        console.log('connecting to server');
        this.connecting = false;
        if (this.sock !== undefined) {
            this.sock.removeAllListeners();
        }
        this.sock = new WebSocket(this.url);

        if (this.pingTimer !== undefined) {
            clearInterval(this.pingTimer);
        }

        this.sock.on('message', (msg: string) => {
            this.heartbeat();
            this.onMessage(msg);
        });

        this.sock.on('open', () => {
            this.heartbeat();
            // Setup ping to go out every so often.
            this.pingTimer = setInterval(() => {
                if (this.sock !== undefined) {
                    this.sock.ping();
                }
            }, this.pingFreq);
        });

        this.sock.on('error', (err) => {
            this.onError(err);
            this.reconnect();
        });

        this.sock.on('close', () => {
            this.onClose();
            this.reconnect();
        });

        this.sock.on('ping', () => {
            this.heartbeat();
        });

        this.sock.on('pong', () => {
            this.heartbeat();
        });
    }

    reconnect() {
        if (this.connecting === false) {
            this.connecting = true;
            setTimeout(() => {
                this.connect();
            }, this.reconnectDelay);
        }
    }

    heartbeat() {
        console.log('hearbeat');
        if (this.timeout !== undefined) {
            clearTimeout(this.timeout);
            this.timeout = undefined;
        }
        this.timeout = setTimeout(() => {
            if (this.sock !== undefined) {
                this.sock.terminate();
            }
        }, this.connectionTimeout);
    }

    send(msg: string | object) {
        if (typeof msg === 'object') {
            msg = JSON.stringify(msg);
        }
        if (this.sock == undefined) {
            console.error('Socket is not connected');
            return;
        }
        this.sock.send(msg);
    }
}

const socketPort = 9091;
const webUri = 'wss://192.168.1.7/host/webrtc'; // process.env.FLO_SERVER_IP; //TODO: bring in as an environment var
const rtcServer = 'localhost';
const connections: Record<string, WebSocket> = {};

const connection = new ReconnectigWS(webUri);

function sendUp(target: string, command: string, msg: string) {
    connection.send({
        target: target,
        command: command,
        msg: msg,
    });
}

connection.onMessage = (msg) => {
    const msgObj = JSON.parse(msg);
    const command = msgObj['command'];

    if (command === 'open') {
        const ws = new WebSocket('ws://' + rtcServer + ':' + socketPort);
        const target = msgObj['target'];
        connections[target] = ws;
        ws.on('message', (msg: string) => {
            sendUp(target, 'msg', msg);
        });
        ws.on('close', () => {
            sendUp(target, 'close', '');
        });
    } else if (command === 'msg') {
        connections[msgObj['target']].send(msgObj['msg']);
    } else if (command === 'close') {
        connections[msgObj['target']].close();
        delete connections[msgObj['target']];
    } else {
        console.error('got an invalid command');
    }
};
