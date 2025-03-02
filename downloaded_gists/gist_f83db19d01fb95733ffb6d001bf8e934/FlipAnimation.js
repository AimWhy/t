/**
 * FLIP stands for First, Last, Invert, Play.
 * https://aerotwist.com/blog/flip-your-animations/
 */
export class FlipAnimation {
    constructor(root, selector, animationName) {
        this.flipSnapshots = [];
        this.root = root;
        this.selector = selector;
        this.animationName = animationName;
    }
    snapshot() {
        this.flipSnapshots = [];
        this.root.querySelectorAll(this.selector).forEach(el => {
            // first
            const { top, left } = el.getBoundingClientRect();
            this.flipSnapshots.push({ el, top, left });
        });
    }
    play() {
        if (!this.flipSnapshots.length) {
            return;
        }
            
        this.flipSnapshots.forEach(snapshot => {
            // last
            const el = snapshot.el;
            const { top, left } = el.getBoundingClientRect();
            const dx = snapshot.left - left;
            const dy = snapshot.top - top;
            if (dx || dy) {
                // invert
                el.style.transform = `translate(${dx}px,${dy}px)`;
                el.style.transitionDuration = '0s';
                // play
                requestAnimationFrame(() => {
                    el.classList.add(this.animationName);
                    el.style.transform = '';
                    el.style.transitionDuration = '';
                    const onTransitionend = () => {
                        el.classList.remove(this.animationName);
                        el.removeEventListener('transitionend', onTransitionend);
                    };
                    el.addEventListener('transitionend', onTransitionend);
                });
            }
        });
        this.flipSnapshots = [];
    }
}


//  .animationName {
//    transition: transform 0.3s;
//  }