function flip(from, to, axis) {
  var start = from.getBoundingClientRect();
  var end = to.getBoundingClientRect();

  var deltaX = start.left - end.left;
  var deltaY = start.top - end.top;
  var deltaW = start.width / end.width;
  var deltaH = start.height / end.height;

  if (axis === 'x' || !axis && Math.abs(deltaX / start.width) > Math.abs(deltaY / start.height)) {
    to.style.transformOrigin = deltaX > 0 ? 'left center' : 'right center';
    from.style.transformOrigin = deltaX > 0 ? 'right center' : 'left center';

    to.style.transform = 'translateX(' + deltaX + 'px) scaleX(' + deltaW + ')';
    from.style.transform = 'translateX(0) scaleX(1)';
  } else {
    to.style.transformOrigin = deltaY > 0 ? 'top center' : 'bottom center';
    from.style.transformOrigin = deltaY > 0 ? 'bottom center' : 'top center';

    to.style.transform = 'translateY(' + deltaY + 'px) scaleY(' + deltaH + ')';
    from.style.transform = 'translateY(0) scaleY(1)';
  }
}

var fflip = function(from, to, options) {
  var animationEndCallback = options && options.onAnimationEnd;
  var axis = options && options.axis;

  flip(from, to, axis);

  window.requestAnimationFrame(function() {
    to.classList.add('fflip-prepare');
    from.style.opacity = 0;
  });

  window.requestAnimationFrame(function() {
    to.classList.remove('fflip-prepare');
    to.classList.add('fflip-animate');

    to.addEventListener("transitionend", function l() {
      to.removeEventListener("transitionend", l, false);
      to.classList.remove('fflip-animate');
      from.style.opacity = 1;

      if (animationEndCallback) {
        animationEndCallback();
      }
    }, false);
  });
};

module.exports = fflip;