function syncUrlParamsToCookie(cookieName) {
  const urlParams = new URLSearchParams(window.location.search); // 获取 URL 参数
  const paramsObj = Object.fromEntries(urlParams.entries()); // 将 URL 参数转为对象
  document.cookie = `${cookieName}=${JSON.stringify(paramsObj)}; path=/`; // 将参数保存到 cookie 中
}

function getUrlParamFromCookie(cookieName) {
  const cookieValue = document.cookie.replace(
    new RegExp(`(?:(?:^|.*;\\s*)${cookieName}\\s*\\=\\s*([^;]*).*$)|^.*$`),
    '$1'
  ); // 从 cookie 中读取参数
  return cookieValue ? JSON.parse(decodeURIComponent(cookieValue)) : {}; // 返回解析后的参数
}

syncUrlParamsToCookie('myCookie'); // 将 URL 参数同步到 cookie 中
const params = getUrlParamFromCookie('myCookie'); // 从 cookie 中获取参数
console.log(params); // 输出参数