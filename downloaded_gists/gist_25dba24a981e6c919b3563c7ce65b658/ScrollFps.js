"use strict";
class ScrollFps {
    constructor(opts) {
        // 连续滚动的最长间隔，超出算另一个滚动
        this.MaxScrollTimeGap = 200;
        // FPS 统计允许的最小样本帧数量，少于此数的样本将被丢弃
        this.MinFrames = 5;
        this.requestAnimationFrame = window.requestAnimationFrame;
        this.onCallback = null;
        this.isScrolling = false;
        this.scrollRecords = [];
        this.scrollInfo = null;
        this.scrollEndTime = 0;
        this.fps = 0;
        this.endTimer = -1;
        this.onCallback = opts.onCallback;
        this.win = opts.win || window;
        this.scrollHandler = this.handleScroll.bind(this);
        this.bindEvent();
    }
    bindEvent() {
        // 捕获内建所有滚动
        this.win.addEventListener('scroll', this.scrollHandler, true);
    }
    removeEvent() {
        this.win.removeEventListener('scroll', this.scrollHandler, true);
    }
    handleScroll() {
        if (!this.isScrolling) {
            this.collectStart();
        }
        this.scrollEndTime = performance.now();
        if (this.endTimer !== -1) {
            clearTimeout(this.endTimer);
        }
        this.endTimer = setTimeout(() => {
            this.collectEnd();
        }, this.MaxScrollTimeGap);
    }
    collectStart() {
        this.isScrolling = true;
        this.scrollEndTime = 0;
        this.scrollInfo = {
            frames: []
        };
        this.frame();
    }
    frame() {
        this.scrollInfo.frames.push(performance.now());
        if (this.isScrolling) {
            requestAnimationFrame(() => this.frame());
        }
    }
    collectEnd() {
        this.isScrolling = false;
        let fps = this.calcFps();
        if (fps) {
            this.scrollRecords.push(this.scrollInfo);
        }
    }
    calcFps() {
        let frames = this.scrollInfo.frames;
        if (this.scrollEndTime) {
            frames = frames.filter(it => it < this.scrollEndTime);
        }
        if (frames.length < this.MinFrames) {
            return false;
        }
        const during = (frames[frames.length - 1] - frames[0]) / 1000;
        const fps = Math.min(frames.length / during, 60);
        Object.assign(this.scrollInfo, {
            frames,
            during,
            fps
        });
        // 输出滚动 fps 实时数据
        // console.log({ frames, during, fps })
        return true;
    }
}