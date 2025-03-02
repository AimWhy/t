    if (!XMLHttpRequest.prototype.sendAsBinary) {
        XMLHttpRequest.prototype.sendAsBinary = function (datastr) {
            function byteValue(x) {
                return x.charCodeAt(0) & 0xff;
            }
            var ords = Array.prototype.map.call(datastr, byteValue);
            var ui8a = new Uint8Array(ords);
            try {
                this.send(ui8a);
            } catch (e) {
                this.send(ui8a.buffer);
            }
        };
    }
function uploadFile(file) {
    var loaded = 0;
    var step = 1024 * 1024;
    var total = file.size;
    var start = 0;
    var progress = document.getElementById(file.name).nextSibling;

    var reader = new FileReader();

    reader.onload = function (e) {
        var xhr = new XMLHttpRequest();
        var upload = xhr.upload;
        upload.addEventListener('load', function () {
            loaded += step;
            progress.value = (loaded / total) * 100;
            if (loaded <= total) {
                blob = file.slice(loaded, loaded + step);

                reader.readAsBinaryString(blob);
            } else {
                loaded = total;
            }
        }, false);
        xhr.open("POST", "upload.php?fileName=" + file.name + "&nocache=" + new Date().getTime());
        xhr.overrideMimeType("application/octet-stream");
        xhr.sendAsBinary(e.target.result);
    };
    var blob = file.slice(start, step);
    reader.readAsBinaryString(blob);
}