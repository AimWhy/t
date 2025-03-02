const container = document.querySelector("#file-js");
const rect = container.getBoundingClientRect();
const theta = Math.atan2(rect.height / 2, rect.width / 2);

container.addEventListener("mouseenter", (e) => {
  const x = e.offsetX - rect.width / 2;
  const y = -(e.offsetY - rect.height / 2);
  const d = Math.atan2(y, x);

  if (-theta <= d && d < theta) {
    return console.log("right");
  }
  if (theta <= d && d < Math.PI - theta) {
    return console.log("top");
  }
  if (Math.PI - theta <= d || d < -(Math.PI - theta)) {
    return console.log("left");
  }
  return console.log("bottom");
});