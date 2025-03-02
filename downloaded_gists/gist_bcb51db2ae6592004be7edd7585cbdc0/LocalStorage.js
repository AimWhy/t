var LocalStorage = (function(){       
        var ls = window.localStorage;       
       
        function _onstorage( key, callback ){       
            var oldValue = ls[key];       
            /*     
                IE下即使是当前页面触发的数据变更，当前页面也能收到onstorage事件，其他浏览器则只会在其他页面收到     
             */       
            return function( e ){       
                //IE下不使用setTimeout尽然获取不到改变后的值?!       
        setTimeout( function(){       
            e = e || window.storageEvent;       
       
            var tKey = e.key,       
                newValue = e.newValue;       
            //IE下不支持key属性,因此需要根据storage中的数据判断key中的数据是否变化       
            if( !tKey ){       
                var nv = ls[key];       
                if( nv != oldValue ){       
                    tKey = key;       
                    newValue = nv;       
                }       
       
            }       
       
            if( tKey == key ){       
                callback && callback(newValue);       
       
                oldValue = newValue;       
            }       
        }, 0 );       
            }       
        }       
    return {       
        getItem: function( key ){       
            return ls.getItem( key );       
        },       
        setItem: function( key, val ){       
            return ls.setItem( key, val );       
        },       
        removeItem: function( key, val ){       
            return ls.removeItem( key );       
        },       
        clear: function(){       
            return ls.clear();       
        },       
        onstorage: function( key, callback ){       
            //IE6/IE7/Chrome使用Timer检查更新，其他使用onstorage事件       
            /*     
                Chrome下(14.0.794.0)重写了document.domain之后会导致onstorage不触发     
                鉴于onstorage的兼容性问题暂时不使用onstorage事件，改用传统的轮询方式检查数据变化     
            */       
            var b = K.Browser;       
       
            if( !this.useTimer ){       
                //IE注册在document上       
                if( document.attachEvent && !K.Browser.opera ) {       
                    document.attachEvent("onstorage", _onstorage(key,callback));       
                }       
                //其他注册在window上       
                else{       
                    window.addEventListener("storage", _onstorage(key,callback), false);       
                };       
            }       
            else{       
                /*     
                    Timer检查方式     
                 */       
                var listener = _onstorage( key, callback );       
                setInterval(function(){       
                    listener({});       
                }, this.interval);       
            }       
        },       
        //是否使用Timer来check       
        useTimer: ( K.Browser.ie && K.Browser.ie < 8 ) || ( K.Browser.chrome ),       
        //检查storage是否发生变化的时间间隔       
        interval: 1000       
    };       
})();    