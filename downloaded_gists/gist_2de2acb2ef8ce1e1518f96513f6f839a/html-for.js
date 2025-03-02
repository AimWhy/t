(function (window, document) {
    var selector = '[type="radio"], [type="checkbox"]';

    // 元素根据单选框、复选框状态同步的方法
    var funCheckedSync = function (ele, checked) {
		if (!ele || !/radio|checkbox/.test(ele.type)) {
			return;	
		}
		if (typeof checked == 'undefined') {
			checked = ele.checked;
		}
		if (ele.id) {
            document.querySelectorAll('[for="'+ ele.id +'"]').forEach(function (label) {
                label.classList[checked ? 'add' : 'remove']('active');
            });
        }

        // 没有for属性的祖先label元素也认为是相关元素
        // 不过这个IE11是无效的，Edge浏览器有效，具体哪个版本支持不详
        if (ele.labels) {
            ele.labels.forEach(function (label) {
                if (!label.htmlFor) {
                    label.classList[checked ? 'add' : 'remove']('active');
                }                
            });
        }

        // 单选框组的处理
        if (checked && ele.type == 'radio' && ele.name) {
            document.querySelectorAll('[type="radio"][name="' + ele.name + '"]').forEach(function (radio) {
                if (radio != ele) {
                    funCheckedSync(radio, false);
                }
            });
        }
    };
    
    // polyfill forEach for IE
    if (!NodeList.prototype.forEach) {
        NodeList.prototype.forEach = Array.prototype.forEach;
    }
    if (!Element.prototype.matches) {
        Element.prototype.matches = Element.prototype.msMatchesSelector;
    }

    // 1. 观察DOM.checked设置时候的变化
    var propsChecked = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'checked');
    var propsCheckedNew = {};

    for (key in propsCheckedNew) {
        propsCheckedNew[key] = propsChecked[key];
    }

    propsCheckedNew.set = function (value) {
        propsChecked.set.call(this, value);
        // 同步对应label元素的状态
        funCheckedSync(this);
    };

    Object.defineProperty(HTMLInputElement.prototype, 'checked', propsCheckedNew);

    // 2. 对单复选框元素添加、删除以及setAttribute方法设置checked属性观察
    var funRadioCheckboxWatching = function () {
        // 所有单复选框元素
        var alls = document.querySelectorAll(selector);
        
        alls.forEach(function (item) {
            funCheckedSync(item);
        });

        // 观察元素和属性的变化
        var observerChecked = new MutationObserver(function (mutationsList) {
            mutationsList.forEach(function (mutation) {
                var nodeAdded = mutation.addedNodes;
                var nodeRemoved = mutation.removedNodes;
                // DOM创建
                nodeAdded.forEach(function (eleAdd) {
                    if (!eleAdd.matches) {
                        return;	
                    }
                    if (eleAdd.matches(selector)) {
                        funCheckedSync(eleAdd);
                    } else if (eleAdd.matches('[for]')) {
                        var htmlFor = eleAdd.htmlFor || eleAdd.getAttribute('for');
                        funCheckedSync(document.querySelector('#' + htmlFor));
                    }
                });
                // DOM删除
                nodeRemoved.forEach(function (eleRemove) {
                    // 删除单复选框元素
                    if (eleRemove.matches && eleRemove.matches(selector)) {
                        funCheckedSync(eleRemove, false);
                    }
                    if (eleRemove.childNodes.length) {
                        eleRemove.childNodes.forEach(function (ele) {
                            if (ele.matches && ele.matches(selector)) {
                                funCheckedSync(ele, false);
                            }
                        });
                    }
                });
                // checked属性变化
                if (mutation.type == 'attributes' && mutation.target.matches && mutation.target.matches(selector)) {
                    funCheckedSync(mutation.target);
                }
            });
        });

        observerChecked.observe(document.body, {
            childList: true,
            subtree: true,
            attributes: true,
            attributeFilter: ['checked']
        });
    }

    // 3. 观察点击单复选框带来的状态变化
    document.addEventListener('click', function (event) {
        var eleTarget = event && event.target;
        if (eleTarget && eleTarget.matches && eleTarget.matches(selector)) {
            funCheckedSync(eleTarget);
        }
    });

    // 无论何时都要执行一次对现有页面DOM元素的处理
    if (document.readyState != 'loading') {
        funRadioCheckboxWatching();
    } else {
        window.addEventListener('DOMContentLoaded', funRadioCheckboxWatching);
    }
})(self, document);
