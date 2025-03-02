import { useCallback, useMemo, useRef } from 'react';

import { useDisposables } from './useDisposables';

export const LRUCache = function (capacity = 30) {
  this.capacity = capacity;
  this.map = new Map();
};

LRUCache.prototype.get = function (key) {
  if (this.map.has(key)) {
    let val = this.map.get(key);
    this.map.delete(key);
    this.map.set(key, val);
    return val;
  }
  return void 0;
};

LRUCache.prototype.put = function (key, value) {
  if (this.map.has(key)) {
    this.map.delete(key);
  }
  this.map.set(key, value);

  if (this.map.size > this.capacity) {
    let lru = this.map.keys().next().value;
    this.map.delete(lru);
  }
};

export const oneParamReturnFunCache = (creatorFun) => {
  let cache = new LRUCache();
  return (arg) => {
    let result = cache.get(arg);

    if (!result) {
      result = creatorFun(arg);
      cache.put(arg, result);
    }
    return result;
  };
};

export function flattenBy(arr, getChildren, convert = (a) => a) {
  const flat = [];
  const recurse = (subArr) => {
    subArr.forEach((item) => {
      flat.push(convert(item));
      const children = getChildren(item);
      if (children?.length) {
        recurse(children);
      }
    });
  };
  recurse(arr);
  return flat;
}

function shadowAssign(originObj, keyPath, value) {
  let result = Array.isArray(originObj) ? originObj.slice(0) : { ...originObj };
  result[keyPath] = value;
  return result;
}

function initKeyPath(key, value) {
  let result = Number.isInteger(Number(key)) ? [] : {};
  result[key] = value;
  return result;
}

function setPath(path, value, values) {
  const keyPath = Array.isArray(path) ? path : path.split('.');
  const pathState = [values];
  const pathLength = keyPath.length;

  if (!pathLength) {
    return values;
  }

  let index = -1;
  let lastItem;
  while (++index < pathLength) {
    const currKeyPath = keyPath[index];
    const parent = pathState[index];
    const cursor = parent?.[currKeyPath];
    if (index === pathLength - 1) {
      lastItem = cursor;
      break;
    }
    pathState.push(cursor);
  }
  if (lastItem === value) {
    return values;
  }
  let result = value;
  let resultIndex = pathLength;

  while (resultIndex-- > 0) {
    const origin = pathState[resultIndex];
    const currKeyPath = keyPath[resultIndex];
    result =
      origin !== void 0
        ? shadowAssign(origin, currKeyPath, result)
        : initKeyPath(currKeyPath, result);
  }
  return result;
}

export function getPath(path, values, defaultValue) {
  const keyPath = Array.isArray(path) ? path : path.split('.');
  if (keyPath.length === 1 && keyPath[0] === '') {
    return values;
  }
  let steps = 0;
  while (values && steps < keyPath.length) {
    values = values[keyPath[steps++]];
  }
  if (steps < keyPath.length) {
    return defaultValue;
  }
  return values === void 0 ? defaultValue : values;
}

// 只考虑 Json 结构, 不涉及 Map, Set 的处理
function isEqual(a, b) {
  if (!a || !b) {
    return a === b;
  }
  if (typeof a !== 'object' || typeof b !== 'object') {
    return a === b;
  }

  const keys = Object.keys(a);
  if (Object.keys(b).length !== keys.length) {
    return false;
  }

  for (const key of keys) {
    if (!isEqual(a[key], b[key])) {
      return false;
    }
  }
  return true;
}

function insertPath(path, value, index, values) {
  const currentValue = getPath(path, values);
  if (!Array.isArray(currentValue)) {
    return values;
  }
  const cloned = [...currentValue];
  cloned.splice(Number.isInteger(Number(index)) ? index : cloned.length, 0, value);
  return setPath(path, cloned, values);
}

function removePath(path, index, values) {
  const currentValue = getPath(path, values);
  if (!Array.isArray(currentValue)) {
    return values;
  }
  const cloned = currentValue.filter((_, itemIndex) => itemIndex !== index);
  return setPath(path, cloned, values);
}

function clearListState(field, state) {
  if (state === null || typeof state !== 'object') {
    return {};
  }
  const clone = { ...state };
  Object.keys(state).forEach((errorKey) => {
    if (errorKey.includes(`${String(field)}.`)) {
      delete clone[errorKey];
    }
  });
  return clone;
}

const useSetState = (initialState) => {
  const { useState } = useDisposables();
  const [state, setState] = useState(initialState);
  const setMergeState = useCallback((patch) => {
    setState((prevState) => {
      const newState = typeof patch === 'function' ? patch(prevState) : patch;
      return newState ? { ...prevState, ...newState } : prevState;
    });
  }, []);
  return [state, setMergeState];
};

function getStatus(status, path) {
  const paths = Object.keys(status);

  if (typeof path === 'string') {
    return (
      status[path] ||
      paths.some((statusPath) => statusPath.includes(`${path}.`) && status[statusPath]) ||
      false
    );
  }

  return paths.some((statusPath) => status[statusPath]);
}

function filterErrors(errors) {
  if (errors === null || typeof errors !== 'object') {
    return {};
  }

  return Object.keys(errors).reduce((acc, key) => {
    const errorValue = errors[key];
    if (errorValue) {
      acc[key] = errorValue;
    }
    return acc;
  }, {});
}

function validateRulesRecord(rules, values, path = '', errorMap = {}) {
  if (rules === null || typeof rules !== 'object') {
    return errorMap;
  }

  return Object.keys(rules).reduce((acc, ruleKey) => {
    const rule = rules[ruleKey];
    const rulePath = `${path === '' ? '' : `${path}.`}${ruleKey}`;
    const value = getPath(rulePath, values);
    if (typeof rule === 'function') {
      acc[rulePath] = rule(value, values, rulePath);
    }
    if (rule !== null && typeof rule === 'object') {
      if (Array.isArray(value)) {
        value.forEach((_item, index) =>
          validateRulesRecord(rule, values, `${rulePath}.${index}`, acc)
        );
      } else if (value !== null && typeof value === 'object') {
        validateRulesRecord(rule, values, rulePath, acc);
      }
    }
    return acc;
  }, errorMap);
}

export function validateValues(validate, values) {
  let errorMap =
    typeof validate === 'function' ? validate(values) : validateRulesRecord(validate, values);
  let errors = filterErrors(errorMap);
  return {
    errors,
    hasErrors: Object.keys(errors).length > 0,
  };
}

function validateFieldValue(path, rules, values) {
  if (typeof path !== 'string') {
    return { hasError: false, error: null };
  }
  const validateResults = validateValues(rules, values);
  const hasError = path in validateResults.errors;
  return { hasError, error: hasError ? validateResults.errors[path] : null };
}
const getInputOnChange = oneParamReturnFunCache((setValue) => (val, partialPath) => {
  if (!val) {
    setValue(val, partialPath);
  } else if (typeof val === 'function') {
    setValue(val, partialPath);
  } else if (typeof val === 'object' && 'nativeEvent' in val) {
    const { currentTarget } = val;
    if (currentTarget.type === 'checkbox') {
      setValue(currentTarget.checked, partialPath);
    } else {
      setValue(currentTarget.value, partialPath);
    }
  } else {
    setValue(val, partialPath);
  }
});

function shouldValidateOnChange(path, validateInputOnChange) {
  if (Array.isArray(validateInputOnChange)) {
    return validateInputOnChange.includes(path);
  }
  return validateInputOnChange === true;
}

export function useForm({
  initialValues = {},
  clearInputErrorOnChange = true,
  validateInputOnChange = false,
  validate: rules,
} = {}) {
  let [{ values, errors, dirty, touched }, setState] = useSetState({
    values: initialValues,
    errors: {},
    dirty: {},
    touched: {},
  });
  const _dirtyValues = useRef(initialValues);
  const _rulesRef = useRef(rules); // 一般不会变，避免依赖引用数据类型

  const setFieldValue = useCallback(
    (path, value) => {
      setState((preState) => {
        // 如果是非 Primitive 类型，调用者需保证生成新对象
        if (typeof value === 'function') {
          const current = getPath(path, preState.values);
          value = value(current);
        }

        const initialValue = getPath(path, _dirtyValues.current);
        const isFieldDirty = !isEqual(initialValue, value);
        // path 可以是数组、可以是字符串 'a.b'
        path = Array.isArray(path) ? path.join('.') : path;

        const newDirty = { ...preState.dirty, [path]: isFieldDirty };
        const newTouched = { ...preState.touched, [path]: true };
        const newValues = setPath(path, value, preState.values);
        const newErrors = { ...preState.errors };

        if (clearInputErrorOnChange) {
          delete newErrors[path];
          // 这里可能是整个 object 的赋值。 如："linkageList.0.behaviors.0"
          Object.keys(newErrors).forEach((key) => {
            if (key.startsWith(path + '.')) {
              delete newErrors[key];
            }
          });
        } else if (shouldValidateOnChange(path, validateInputOnChange)) {
          // todo 这里对整个 object 赋值 的处理
          const fieldValidate = validateFieldValue(path, _rulesRef.current, newValues);
          if (fieldValidate.hasError) {
            newErrors[path] = fieldValidate.error;
          } else {
            delete newErrors[path];
          }
        }

        return {
          values: newValues,
          dirty: newDirty,
          touched: newTouched,
          errors: newErrors,
        };
      });
    },
    [setState, clearInputErrorOnChange, validateInputOnChange]
  );

  const setValues = useCallback(
    (payload) => {
      setState((preState) => {
        const valuesPartial = typeof payload === 'function' ? payload(preState.values) : payload;
        const newValues = { ...preState.values, ...valuesPartial };

        return {
          dirty: {},
          touched: {},
          values: newValues,
          errors: validateInputOnChange ? validateValues(_rulesRef.current, newValues).errors : {},
        };
      });
    },
    [setState, validateInputOnChange]
  );

  const validate = useCallback(() => {
    const validateResults = validateValues(_rulesRef.current, values);
    setState({ errors: validateResults.errors });
    return validateResults;
  }, [values, setState]);

  const validateField = useCallback(
    (path) => {
      const fieldValidate = validateFieldValue(path, _rulesRef.current, values);

      setState((preState) => {
        let newErrors = { ...preState.errors };
        if (fieldValidate.hasError) {
          newErrors[path] = fieldValidate.error;
        } else {
          delete newErrors[path];
        }
        return { errors: newErrors };
      });

      return fieldValidate;
    },
    [values, setState]
  );

  const reset = useCallback(() => {
    setState({
      values: { ..._dirtyValues.current },
      errors: {},
      dirty: {},
      touched: {},
    });
  }, [setState]);

  let setFieldValueCurry = useMemo(() => {
    return oneParamReturnFunCache(
      (path) =>
        (value, partialPath = '') =>
          setFieldValue(partialPath ? `${path}.${partialPath}` : path, value)
    );
  }, [setFieldValue]);

  const getInputProps = (path, { valuePropName = 'value' } = {}) => {
    return {
      error: errors[path],
      [valuePropName]: getPath(path, values),
      onChange: getInputOnChange(setFieldValueCurry(path)),
    };
  };

  const removeListItem = useCallback(
    (path, index) => {
      setState((preState) => {
        return {
          values: removePath(path, index, preState.values),
          dirty: clearListState(`${String(path)}.${index}`, preState.dirty),
          touched: clearListState(`${String(path)}.${index}`, preState.touched),
          errors: clearListState(path, preState.errors), // 数组类型需要整体取消，因为位置已乱
        };
      });
    },
    [setState]
  );

  const insertListItem = useCallback(
    (path, item, index) => {
      setState((preState) => ({
        values: insertPath(path, item, index, preState.values),
      }));
    },
    [setState]
  );

  const onSubmit = (handleSubmit, handleValidationFailure) => (event) => {
    event?.preventDefault();
    const validateResults = validate();
    if (validateResults.hasErrors) {
      handleValidationFailure?.(validateResults.errors, values, event);
    } else {
      handleSubmit(values, event);
    }
  };

  const onReset = useCallback(
    (event) => {
      event?.preventDefault();
      reset();
    },
    [reset]
  );

  const isDirty = useCallback((path) => getStatus(dirty, path), [dirty]);
  const isTouched = useCallback((path) => getStatus(touched, path), [touched]);
  const isValid = useCallback(
    (path) =>
      path
        ? !validateFieldValue(path, _rulesRef.current, values).hasError
        : !validateValues(_rulesRef.current, values).hasErrors,
    [values]
  );
  const getFieldValue = useCallback((path) => getPath(path, values), [values]);
  const getValues = useCallback(() => values, [values]);

  return {
    errors,
    values,
    getValues,
    setValues,
    getFieldValue,
    setFieldValue,
    reset,
    validate,
    validateField,
    removeListItem,
    insertListItem,
    getInputProps,
    onSubmit,
    onReset,
    isDirty,
    isTouched,
    isValid,
  };
}
