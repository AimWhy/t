
function createObject(component, parent, properties) {
    return component.createObject(parent, properties)
}

function createComponent (url, parent, properties, callback=null) {
    var component = Qt.createComponent(url)

    if (component.status === Component.Error) {
        console.warn("Failed to create", url, component.errorString())
        return
    }

    if (typeof callback === "function") {
        properties["callback"] = callback
    }

    return createObject(component, parent, properties)
}

/*******************/

    QtObject {
            id: dialogCreator

            property var dialogStack: []

            function open(url, properties, callback) {
                let dialog = Object.createComponent(url, root, properties, callback)

                dialog.open()

                dialogStack.push(dialog)
            }

            function close(dialog) {
                let foundDialog = dialogStack.find(item => item.dialog === dialog)

                if (foundDialog !== undefined) {
                    dialogStack = dialogStack.filter(item => item.dialog !== foundDialog.dialog)

                    foundDialog.close()
                    foundDialog.destroy()
                }
            }
        }

    Connections {
        target: dialogManager

        function onOpen(dialog, properties, callback) { dialogCreator.open(dialog, properties, callback) }
        function onClose(dialog) { dialogCreator.close(dialog) }
    }