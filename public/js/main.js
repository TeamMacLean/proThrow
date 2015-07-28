var requiredCheckbox = document.getElementById('required-readme');
var form = document.getElementById('new-form');
var className = 'disabled';

if (form && requiredCheckbox) {
  addTheListener();
  checkCheckBox();
}

function addTheListener() {
  requiredCheckbox.addEventListener('change', checkCheckBox);
}

function checkCheckBox() {
  var el = form;
  if (requiredCheckbox.checked) {
    removeClass(el);
    form.scrollIntoView();
  } else {
    addClass(el);
  }
}


function addClass(el) {
  if (el.classList)
    el.classList.add(className);
  else
    el.className += ' ' + className;
}

function removeClass(el) {
  if (el.classList)
    el.classList.remove(className);
  else
    el.className = el.className.replace(new RegExp('(^|\\b)' + className.split(' ').join('|') + '(\\b|$)', 'gi'), ' ');
}
