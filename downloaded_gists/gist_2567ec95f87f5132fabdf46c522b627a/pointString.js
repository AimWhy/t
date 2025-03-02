String.prototype.pointLength = function() {
    let length = 0;
    for (let i = 0; i < this.length;) {
        const codePoint = this.codePointAt(i);
        i += codePoint > 0xffff ? 2 : 1;
        length++
    }
    return length;
}

String.prototype.pointAt = function(index) {
    let curIndex = 0;
    for (let i = 0; i < this.length;) {
        const codePoint = this.codePointAt(i);
        if(curIndex === index) {
            return String.fromCodePoint(codePoint);
        }
        i += codePoint > 0xffff ? 2 : 1;
        curIndex++
    }
    return void 0;
}

String.prototype.sliceByPoint = function(startIndex = 0, endIndex = this.pointLength()) {
    if (endIndex < 0) {
        endIndex = this.pointLength() + endIndex;
    }
    
    let result = '';
    for (let i = startIndex; i < endIndex; i++) {
        result += this.pointAt(i);
    }
    return result;
} 