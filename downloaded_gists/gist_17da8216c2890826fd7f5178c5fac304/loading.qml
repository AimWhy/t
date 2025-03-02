import QtQuick 2.0

Rectangle {
    id: loading
    property int pwidth: 10
    property bool success: false

    x: 0
    width: 5
    height: 5
    radius: 5
    color: "green"

    Behavior on x {
        NumberAnimation {
            id: numAnimation
            loops: 10
            from: 0
            // to: parent.pwidth
            easing.type:Easing.OutInCirc
            duration: 3000 
            onRunningChanged: {
                if (!running) {
                    loading.destroy();
                }else{
                    if(parent.pwidth != undefined){
                        numAnimation.to = parent.pwidth
                    }
                }
            }
        }
    }
}


/************/

function loading(parent) {
    var ls = [];
    var component = Qt.createComponent("Loading.qml");
    for (var i=0; i<20; i++) {
        var object = component.createObject(parent);
        object.pwidth = parent.width + (i - 10) * 20;
        object.x = object.pwidth + (i - 10) * 20;
        object.y = parent.height/2;
        ls[i] = object;
    }
    return ls;
}

function loadingfinish(ls){
    if(ls){
        for(var i=0, len=ls.length; i < len; i++){
            if(ls[i]){
                if(ls[i].hasOwnProperty('destroy')){
                    ls[i].destroy();
                }
            }
        }
    }
    ls = [];
    return ls;
}