import React from "react";
import { Link } from "react-router-dom";

export function createResource(getPromise) {
  let cache = {};
  let inflight = {};
  let errors = {};

  function load(key) {
    inflight[key] = getPromise(key)
      .then(val => {
        delete inflight[key];
        cache[key] = val;
      })
      .catch(error => {
        errors[key] = error;
      });
    return inflight[key];
  }

  function preload(key) {
    if (cache[key] !== undefined || inflight[key]) return;
    load(key);
  }

  function read(key) {
    if (cache[key] !== undefined) {
      return cache[key];
    } else if (errors[key]) {
      throw errors[key];
    } else if (inflight[key]) {
      throw inflight[key];
    } else {
      throw load(key);
    }
  }

  function clear(key) {
    if (key) {
      delete cache[key];
    } else {
      cache = {};
    }
  }

  function ResourceLink({ cacheKey, ...props }) {
    const _preload = () => preload(cacheKey);
    return (
      <Link onMouseEnter={_preload} onFocus={_preload} {...props} />
    );
  }

  return { preload, read, clear, Link: ResourceLink };
}