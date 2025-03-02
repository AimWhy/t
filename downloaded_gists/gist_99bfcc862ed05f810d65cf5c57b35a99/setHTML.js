function setHTML(parent, html) {
    const dummy = parent.cloneNode(false);
    dummy.innerHTML = html;

    if (dummy.children.length === 0) {
        parent.innerHTML = html;
    } else {
        for (const child of dummy.childNodes) {
            if (child.nodeType == Node.TEXT_NODE) {
                parent.appendChild(document.createTextNode(child.textContent));
                continue;
            }
            if (child.nodeType !== Node.ELEMENT_NODE) {
                continue;
            }

            const namespaceURI = child.namespaceURI;

            const clone = namespaceURI !== "http://www.w3.org/1999/xhtml" ? document.createElementNS(namespaceURI, child.nodeName) : document.createElement(child.nodeName);

            for (const {nodeName, nodeValue} of child.attributes) {
                try {
                    clone.setAttribute(nodeName, nodeValue);
                } catch (e) {
                    console.error(e);
                }
            }

            if (child.children.length === 0) {
                if (child.nodeName === "SCRIPT") {
                    if (child.text) {
                        clone.text = child.text;
                    }
                } else {
                    if (child.innerHTML) {
                        clone.innerHTML = child.innerHTML;
                    }
                }
            } else {
                setHTML(clone, child.innerHTML);
            }
            parent.appendChild(clone);
        }
    }
}
