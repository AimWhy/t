import {useRef, useEffect} from 'react';

/**
 * by wanghongying
 * @param {name} 组件名称（约定格式：项目-路径-组件名）
 * @param {flag} 组件渲染完成标记（多数为接口返回后的那一次渲染。无接口: true、 有接口: .then中赋值为 performance.now() ）
 * 注: 尽量放在外层、避免因其他业务条件引起的组件卸载
 */

export default function ReportTime({name, flag}) {
    const startTime = useRef(performance.now());
    const preFlagRef = useRef(false);

    useEffect(
        () => {
            if (flag) {
                if (!preFlagRef.current && window.habo) {
                    const endTime = performance.now();
                    const isInterfaceTimePoint = typeof flag === 'number' && flag > 1;

                    habo.timing({
                        eventID: '6113171726428160',
                        elapsed: endTime - startTime.current,
                        tagName: `total:${name}`
                    });

                    isInterfaceTimePoint && habo.timing({
                        eventID: '6113171726428160',
                        elapsed: flag - startTime.current,
                        tagName: `data:${name}`
                    });

                    isInterfaceTimePoint && habo.timing({
                        eventID: '6113171726428160',
                        elapsed: endTime - flag,
                        tagName: `render:${name}`
                    });
                }

                preFlagRef.current = flag;
            }
        }
    );

    return null;
}
