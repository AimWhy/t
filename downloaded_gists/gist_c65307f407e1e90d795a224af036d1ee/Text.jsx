import React, { useMemo, useState, useRef, useLayoutEffect, useCallback } from 'react';
import ReactDOM from 'react-dom';
import 'antd/dist/antd.css';
import './index.css';
import { Tooltip } from 'antd';

export const Text = function (props) {
  let containerRef = useRef(null);
  let tempProps = { ...props };
  delete tempProps.children;

  // 判断是否由外部控制
  const [visible, setVisible] = useState(undefined);
  const [isExpand, setExpand] = useState(false);
  const check = (ref) => {
    console.log('@@@');
    if (ref.current) {
      const isOverflowing = ref.current.scrollHeight > ref.current.clientHeight;
      setVisible(isOverflowing ? undefined : false);
    }
  };

  useLayoutEffect(() => {
    check(containerRef);
  }, [containerRef]);

  const onMouseEnter = useCallback(() => check(containerRef), [containerRef]);
  const onSwitchExpand = useCallback(() => setExpand(v => !v), []);

  const style = useMemo(() => ({
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    display: '-webkit-box',
    WebkitLineClamp: props.lineClamp,
    WebkitBoxOrient: 'vertical',
  }), [props.lineClamp]);

  const style2 = useMemo(() => ({
    display: '-webkit-box',
    WebkitBoxOrient: 'vertical',
  }), []);

  return (
    <Tooltip {...tempProps} visible={visible}>
      <span ref={containerRef} style={isExpand ? style2 : style} onMouseEnter={onMouseEnter} onClick={onSwitchExpand}>
        {props.children}
      </span>
    </Tooltip>
  );
};

ReactDOM.render(
  <div>
    <Tooltip title="prompt text">
      <span>Tooltip will show on mouse enter.</span>
    </Tooltip>
    <Text title="prompt text" lineClamp={1}>
      <span>删掉就逻辑d梳理极乐空间e了看见了旧逻辑了解了解考虑迦拉克隆极乐空间了旧d </span>
    </Text>
    <Text title="prompt text" lineClamp={1}>
      <span>删掉就逻辑梳理极</span>
    </Text>
    <Text title="prompt text" lineClamp={2}>
      <span>虑迦拉克隆极乐空间了旧逻辑f删掉就逻辑梳理极乐空间了看见了旧逻辑了解了解考虑迦拉克隆极乐空间了旧逻辑f删掉就逻辑梳理极乐空间了看见了旧逻辑了解了解考虑迦拉克隆极乐空间了旧逻辑f删掉就逻辑梳理极乐空间了看见了旧逻辑了解了解考虑迦拉克隆极乐空间了旧逻辑f </span>
    </Text>
  </div>,
  document.getElementById('container'),
);