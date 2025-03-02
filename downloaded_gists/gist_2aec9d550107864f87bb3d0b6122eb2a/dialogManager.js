import QtQuick
import QtQuick.Controls 2.5
import QtQuick.Layouts

Dialog {
    id: root

    property bool autoClose: true
    property var cancelBtnText: qsTr("Cancel")
    property var confirmBtnText: qsTr("OK")
    property alias confirmColor: confirm.normalTextColor
    property alias cancelColor: cancel.normalTextColor
    property alias description: description.text
    property bool emitCancelWhenClosed: false
    property alias text: title.text

    signal cancel
    signal confirm

    Accessible.name: text
    bottomInset: 0
    dim: false
    enter: null
    exit: null
    height: 160
    leftInset: 0
    margins: 0
    modal: false
    padding: 0
    rightInset: 0
    topInset: 0
    width: 330
    x: (parent.width - width) / 2
    y: (parent.height - height) / 2

    background: Rectangle {
        radius: 8
    }

    onClosed: {
        if (emitCancelWhenClosed && autoClose) {
            root.cancel();
        }
        autoClose = true;
        // When created dynamically, is called when the dialog is closed only but the parent object is not destroyed
        //root.destroy()
    }

    Label {
        id: title
        color: "#222222"
        font.pixelSize: 18
        horizontalAlignment: Text.AlignHCenter
        verticalAlignment: Text.AlignVCenter
        width: parent.width
        wrapMode: Text.WrapAnywhere
    }
    Label {
        id: description
        anchors.left: parent.left
        anchors.leftMargin: 20
        anchors.right: parent.right
        anchors.rightMargin: 20
        anchors.top: title.bottom
        anchors.topMargin: 15
        color: "#222222"
        font.pixelSize: 14
        height: 30
        horizontalAlignment: Text.AlignHCenter
        verticalAlignment: Text.AlignVCenter
        wrapMode: Text.WrapAnywhere
    }
    CustomToolSeparator {
        anchors.bottom: confirm.top
        anchors.left: parent.left
        width: parent.width
    }
    ToolSeparator {
        anchors.left: confirm.right
        anchors.leftMargin: 1
        anchors.top: confirm.top
        bottomInset: 0
        horizontalPadding: 0
        leftInset: 0
        orientation: Qt.Vertical
        padding: 0
        rightInset: 0
        spacing: 0
        topInset: 0
        verticalPadding: 0

        contentItem: Rectangle {
            color: "#EBEDF0"
            implicitHeight: confirm.height
            implicitWidth: 1
        }
    }
    CustomButton {
        id: confirm
        anchors.bottom: parent.bottom
        anchors.left: parent.left
        borderColor: "#FFFFFF"
        borderSize: 0
        buttonRadius: 8
        height: 48
        normalTextColor: "#337EFF"
        text: qsTr(confirmBtnText)
        width: parent.width / 2 - 1

        onClicked: {
            autoClose = false;
            root.confirm();
            root.close();
        }
    }
    CustomButton {
        id: cancel
        anchors.bottom: parent.bottom
        anchors.right: parent.right
        borderColor: "#FFFFFF"
        borderSize: 0
        buttonRadius: 8
        height: 48
        normalTextColor: "#333333"
        text: qsTr(cancelBtnText)
        width: parent.width / 2 - 1

        onClicked: {
            autoClose = false;
            root.cancel();
            root.close();
        }
    }
}

/***************************/

function dynamicDialog(title, message, confirm, cancel = function () {}, parent = mainWindow, shadow = true) {
    const dialogHandle = Qt.createComponent("qrc:/qml/components/CustomDialog.qml").createObject(parent, {
        text: title,
        description: message,
        dim: shadow
    })
    dialogHandle.confirm.connect(confirm)
    dialogHandle.cancel.connect(cancel)
    dialogHandle.open()

    return dialogHandle
}

function dynamicDialogEx(title, message, leave, end, cancel, parent = mainWindow) {
    const dialogHandle = Qt.createComponent("qrc:/qml/components/CustomDialogEx.qml").createObject(parent, {
        text: title,
        description: message
    })
    dialogHandle.leave.connect(leave)
    dialogHandle.end.connect(end)
    dialogHandle.enableCancel = cancel !== undefined
    dialogHandle.open()

    return dialogHandle
}

function dynamicDialog2(title, message, confirm, cancel = function () {},
                        confirmText= qsTr("OK"), cancelText = qsTr("Cancel"),
                        parent = mainWindow, shadow = true,
                        confirmColor = "#337EFF", cancelColor = "#333333", closePolicy = Popup.CloseOnEscape | Popup.CloseOnPressOutside) {
    const dialogHandle = Qt.createComponent("qrc:/qml/components/CustomDialog.qml").createObject(parent, {
        text: title,
        description: message,
        dim: shadow,
        cancelBtnText: cancelText,
        confirmBtnText:  confirmText,
        cancelColor: cancelColor,
        confirmColor: confirmColor,
        emitCancelWhenClosed: true,
        closePolicy: closePolicy
    })
    dialogHandle.confirm.connect(confirm)
    dialogHandle.cancel.connect(cancel)
    dialogHandle.open()

    return dialogHandle
}