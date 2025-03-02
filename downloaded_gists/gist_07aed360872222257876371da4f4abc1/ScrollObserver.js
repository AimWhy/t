    class ScrollObserver {
        constructor(delegate) {
            this.started = false;
            this.onScroll = () => {
                this.updatePosition({ x: window.pageXOffset, y: window.pageYOffset });
            };
            this.delegate = delegate;
        }
        start() {
            if (!this.started) {
                addEventListener("scroll", this.onScroll, false);
                this.onScroll();
                this.started = true;
            }
        }
        stop() {
            if (this.started) {
                removeEventListener("scroll", this.onScroll, false);
                this.started = false;
            }
        }
        updatePosition(position) {
            this.delegate.scrollPositionChanged(position);
        }
    }