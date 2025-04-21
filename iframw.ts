// Once the iframe is loaded, the subarea is dynamically inserted
const iframe = this.node as HTMLIFrameElement & {
    heightChangeObserver: ResizeObserver;
};

iframe.frameBorder = '0';
iframe.scrolling = 'auto';

iframe.addEventListener('load', () => {
    // Workaround needed by Firefox, to properly render svg inside
    // iframes, see https://stackoverflow.com/questions/10177190/
    // svg-dynamically-added-to-iframe-does-not-render-correctly
    iframe.contentDocument!.open();

    // Insert the subarea into the iframe
    // We must directly write the html. At this point, subarea doesn't
    // contain any user content.
    iframe.contentDocument!.write(this._wrapped.node.innerHTML);

    iframe.contentDocument!.close();

    const body = iframe.contentDocument!.body;

    // Adjust the iframe height automatically
    iframe.style.height = `${body.scrollHeight}px`;
    iframe.heightChangeObserver = new ResizeObserver(() => {
        iframe.style.height = `${body.scrollHeight}px`;
    });
    iframe.heightChangeObserver.observe(body);
});