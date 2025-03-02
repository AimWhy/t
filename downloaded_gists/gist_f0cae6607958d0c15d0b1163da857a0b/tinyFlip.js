function flip(element, options) {
  var duration = options && options.duration || 300;
  var easing = options && options.easing || 'ease-out';

  var start = element.getBoundingClientRect();
  element.style.transformOrigin = 'top left';

  return function() {
    var end = element.getBoundingClientRect();

    var deltaX = start.left - end.left;
    var deltaY = start.top - end.top;
    var deltaW = start.width / end.width;
    var deltaH = start.height / end.height;

    element.style.transition = 'transform ' + duration + 'ms ' + easing;
    element.style.transform = 'translate(' + deltaX + 'px, ' + deltaY + 'px) scale(' + deltaW + ', ' + deltaH + ') rotate(0.01deg)';

    setTimeout(function() {
      element.style.transition = '';
      element.style.transform = '';
    }, duration);
  };
}

var tinyFlip = function(element, options) {
  requestAnimationFrame(function() {
    var flipFn = flip(element, options);
    requestAnimationFrame(function() {
      flipFn();
    });
  });
};

module.exports = tinyFlip;