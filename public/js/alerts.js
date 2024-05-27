//type is 'success or 'error'
export const hideAlert = () => {
  //DOM Manipulation
  const el = document.querySelector('.alert');
  if (el) el.parentElement.removeChild(el);
};
//creatig HTML markup and inserting that into HTML
export const showAlert = (type, msg) => {
  hideAlert();
  const markup = `<div class="alert alert--${type}">${msg}</div>`;
  //select element where we want to include this HTML
  //Inside body but right at the beginning
  document.querySelector('body').insertAdjacentHTML('afterbegin', markup);
  window.setTimeout(hideAlert, 5000);
};
