const pattern = /last_modif\s*=\s*([^;]*)/;

const lastVisit = parseFloat(document.cookie.replace(pattern, "$1"));
const lastModif = Date.parse(document.lastModified);

if (Number.isNaN(lastVisit) || lastModif > lastVisit) {
  document.cookie = `last_modif=${Date.now()}; expires=Fri, 31 Dec 9999 23:59:59 GMT; path=${
    location.pathname
  }`;

  if (isFinite(lastVisit)) {
    alert("This page has been changed!");
  }
}

//   if (document.location.hostname === "localhost") {
//     var lastModified = new Date(document.lastModified);
//     setInterval(function () {
//       var req = new Request(".", {headers: {
//           "If-Modified-Since": lastModified.toUTCString()}});
//       fetch(req).then(response => {
//         if (response.status == 200 &&
//             new Date(response.headers.get("Last-Modified")) > lastModified) {
//           document.location.reload();
//         }
//       });
//     }, 1000);
//   }