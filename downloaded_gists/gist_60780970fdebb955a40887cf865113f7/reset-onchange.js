<script>
// 观察页面所有的form元素，绑定reset事件
document.addEventListener('reset', function(event) {
    // 事件对象e中的target属性，指向触发事件的元素
    var target = event.target;
    // 如果触发事件的元素是form元素
    if (target.tagName.toLowerCase() === 'form') {
        // 遍历form元素中的所有input元素
        var inputs = [].slice.call(target.elements);
        // 只有当前后值变化的时候才会触发 change 事件
        inputs.forEach(function (input) {
            input.tempValue = input.value;
        });

        setTimeout(function () {
            inputs.forEach(function (input) {
                if (input.tempValue !== input.value) {
                    input.dispatchEvent(new Event('change'));
                }
            });
        }, 1);
    }
}, false);
</script>