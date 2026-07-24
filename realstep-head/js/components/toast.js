window.RealStep = window.RealStep || {};

RealStep.showToast = function(message) {
  var toast = document.getElementById('toast');
  toast.textContent = message;
  toast.classList.add('show');

  setTimeout(function() {
    toast.classList.remove('show');
  }, 2400);
};
