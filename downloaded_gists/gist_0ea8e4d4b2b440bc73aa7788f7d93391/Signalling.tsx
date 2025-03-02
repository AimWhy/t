import React, { FC, useRef } from 'react';
import { useEventStore, getEventStore } from '../models/context';
// import { WebSocketClient } from './WebSocketClient';
import { PostMessageClient } from './PostMessageClient';

export interface IEventSequenceProps {
    mode: 'receiver' | 'sender'
}

class Signalling {
    url: string;
    mode: string;
    index: number;
    timerId: number;
    websocket: PostMessageClient;

    constructor(url, mode) {
        this.url = url;
        this.mode = mode;
        this.index = 0;
        this.timerId = -1;
        // 通信逻辑由外部提供
        this.websocket = new PostMessageClient('ws://baidu.com');

        if (mode === 'sender') {
            this.check();
        } else {
            this.receive();
        }
    }

    forceCheck() {
        this.check();
    }

    delay(ms) {
        return new Promise((res) => {
            this.timerId = window.setTimeout(res, ms);
        });
    }

    // 授课端调用逻辑
    async check() {
        if (this.timerId) {
            clearTimeout(this.timerId);
            this.timerId = null;
        }

        const { msgQueue } = getEventStore();

        if (msgQueue.length < this.index) {
            return;
        }

        const item = msgQueue.find(item => !item.marked);

        await this.websocket.sendWithRetry(item);

        await this.delay(1000);
    }

    // msgInfo => { id, msgName, msgType, msgDetail, timeStamp: Date.now(), isTeacher }
    // 学生端调用逻辑
    receive() {
        this.websocket.onMessage((msgInfo) => {
            const { msgControllerList, addMsg } = getEventStore();
            const item = msgControllerList.find(item => item.id === msgInfo.id && item.msgName === msgInfo.msgName && msgInfo.msgType === item.msgType);

            const result = item?.controller?.(msgInfo.msgDetail);

            Promise.resolve(result).then(() => {
                addMsg(msgInfo);
            });
        });
    }
}

export const EventSequence: FC<IEventSequenceProps> = React.memo(({ mode }) => {
    const {
        msgQueue,
        msgControllerList,
    } = useEventStore();

    const signalling = useRef(null);

    if (!signalling.current) {
        signalling.current = new Signalling('', mode);
    }

    if (msgQueue) {
        console.log('msgQueue', msgQueue);
    }

    if (msgControllerList) {
        console.log('msgControllerList', msgControllerList);
    }

    if (mode === 'sender') {
        signalling.current.forceCheck();
    }

    // 增加快捷键，调用 copyLog 怎么样？

    return null;
});