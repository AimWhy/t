function sendMessageToAllClients(msg) {
    clients.matchAll().then((clients) => {
        clients.forEach((client) => {
            client.postMessage(msg)
        })
    })
}


document.addEventListener('DOMContentLoaded', async () => {
    const e = new MockExtendableEvent
    listener.call(e)
    await e.ready



})


function hookAble(fun) {

    return new Proxy(fun, {
        apply(target, thisArg, argumentsList) {
            let e = new MockExtendableEvent
            target.call(e)

            return target.apply(thisArg, argumentsList)
        }

    })
}