import { useCallback, useEffect, useRef, useState } from 'react';

function usePermission(methods, options) {
  const isMounted = useRef(true);
  const [status, setStatus] = useState(null);
  const { get = true, request = false, ...permissionOptions } = options || {};

  const getPermission = useCallback(async () => {
    const response = await methods.getMethod(Object.keys(permissionOptions).length > 0 ? permissionOptions : undefined);
    if (isMounted.current) {
      setStatus(response);
    }
    return response;
  }, [methods.getMethod]);

  const requestPermission = useCallback(async () => {
    const response = await methods.requestMethod(Object.keys(permissionOptions).length > 0 ? permissionOptions : undefined);
    if (isMounted.current) {
      setStatus(response);
    }
    return response;
  }, [methods.requestMethod]);

  useEffect(function runMethods() {
    if (request) {
      requestPermission();
    }

    if (!request && get) {
      getPermission();
    }
  }, [get, request, requestPermission, getPermission]);

  useEffect(function didMount() {
    isMounted.current = true;
    return () => {
      isMounted.current = false;
    };
  }, []);

  return [status, requestPermission, getPermission];
}

export function createPermissionHook(methods) {
  return (options) => usePermission(methods, options);
}

async function getPermissionsAsync() { }
async function requestPermissionsAsync() { }

export const usePermissions = createPermissionHook({
  getMethod: getPermissionsAsync,
  requestMethod: requestPermissionsAsync,
});
