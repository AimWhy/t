// ✅️ 一个文件导出 usePromise() / use() / <Await />
import { createContext, useContext, useRef, useState } from 'react';

/**
 * 在当前组件使用 loading/error
 */
export function usePromise(promise) {
	const [_, forceUpdate] = useState({});
	const ref = useRef();

	if (!promise) {
		return { loading: false, data: promise };
	}

	ref.current = promise;
	if (!promise.status) {
		promise.status = 'pending';
		promise
			.then(
				(result) => {
					promise.status = 'fulfilled';
					promise.value = result;
				},
				(reason) => {
					promise.status = 'rejected';
					promise.reason = reason;
				}
			)
			.finally(() => {
				setTimeout(() => {
					if (ref.current === promise) {
						forceUpdate({});
					}
				}, 0);
			});
	}

	return {
		loading: promise.status === 'pending',
		data: promise.value,
		error: promise.reason
	};
}

/**
 * 在父级/祖父级组件中使用 Suspense/ErrorBoundery 接收 loading/error
 */
export function use(promise) {
	if (!promise) {
		return promise;
	}

	if (promise.status === 'fulfilled') {
		return promise.value;
	} else if (promise.status === 'rejected') {
		throw promise.reason;
	} else if (promise.status === 'pending') {
		throw promise;
	} else {
		promise.status = 'pending';
		promise.then(
			(result) => {
				promise.status = 'fulfilled';
				promise.value = result;
			},
			(reason) => {
				promise.status = 'rejected';
				promise.reason = reason;
			}
		);
		throw promise;
	}
}

const AsyncDataContext = createContext(void 0);
/**
 * 在当前组件或父级/祖父级组件中使用 Suspense/ErrorBoundery 接收 loading/error
 */
export const Await = (props) => {
	const { resolver, children } = props;
	const data = use(resolver);

	if (typeof children === 'function') {
		return children(data);
	}

	return (
		<AsyncDataContext.Provider value={data}>
			{children}
		</AsyncDataContext.Provider>
	);
};

/**
 * 在当前组件接收来自父级 <Await /> 组件的 data
 * @deprecated 不推荐使用, 会丢失 ts 类型
 */
export const useAsyncValue = () => {
	return useContext(AsyncDataContext);
};
