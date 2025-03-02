    function hash(string) {
        var hash = 5381;
        var i = string.length;

        while(i) {
            hash = (hash * 33) ^ string.charCodeAt(--i);
        }

        return hash >>> 0;
    }