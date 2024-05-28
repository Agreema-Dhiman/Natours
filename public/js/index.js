/* eslint-disable */

//entry file
//get data from user interface and then delegate actions
//NodeJS uses CommonJS to implement modules
//modules in javascript different
//to select based on the class
import '@babel/polyfill';
import { login, logout, signup } from './login';
import { displayMap } from './mapbox';
import { updateUser, addReview } from './updateSettings';
import { bookTour } from './stripe';

//DOM Elements
const mapBox = document.getElementById('map');
const loginForm = document.querySelector('.form--login');
const logOutBtn = document.querySelector('.nav__el--logout');
const updateBtn = document.querySelector('.form-user-data');
const userPasswordForm = document.querySelector('.form-user-password');
const bookBtn = document.getElementById('book-tour');
const signupForm = document.querySelector('.form--signup');
const reviewForm = document.querySelector('.form--review');

document.addEventListener('DOMContentLoaded', function () {
  window.scrollTo(0, 0);
});

// DELEGATION
if (mapBox) {
  const locations = JSON.parse(mapBox.dataset.locations);
  displayMap(locations);
}

if (loginForm) {
  loginForm.addEventListener('submit', (e) => {
    e.preventDefault();
    //prevents form from loading page
    //VALUES
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;
    login(email, password);
  });
}

if (logOutBtn) {
  logOutBtn.addEventListener('click', logout);
}

if (updateBtn) {
  updateBtn.addEventListener('submit', (e) => {
    e.preventDefault();
    const form = new FormData();
    form.append('name', document.getElementById('name').value);
    form.append('email', document.getElementById('email').value);
    form.append('photo', document.getElementById('photo').files[0]);
    updateUser(form, 'data');
    //update user will recognise it is getting form data
  });
}

if (userPasswordForm) {
  userPasswordForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    document.querySelector('.btn--save-password').textContent = 'Updating...';
    const password = document.getElementById('password-current').value;
    const newpwd = document.getElementById('password').value;
    const confirmnewpwd = document.getElementById('password-confirm').value;
    await updateUser({ password, newpwd, confirmnewpwd }, 'password');
    document.getElementById('password-current').value = '';
    document.getElementById('password').value = '';
    document.getElementById('password-confirm').value = '';
    document.querySelector('.btn--save-password').textContent = 'Save Password';
  });
}

if (bookBtn) {
  bookBtn.addEventListener('click', (e) => {
    e.target.textContent = 'Processing...';
    const tourId = e.target.dataset.tourId;
    bookTour(tourId);
    //javascript converts data-tour-id to tourId
  });
}

if (signupForm) {
  signupForm.addEventListener('submit', (e) => {
    e.preventDefault();
    //prevents form from loading page
    //VALUES
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;
    const name = document.getElementById('name').value;
    const passwordConfirm = document.getElementById('passwordConfirm').value;
    signup(name, email, password, passwordConfirm);
  });
}

if (reviewForm) {
  reviewForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const review = document.getElementById('reviewtext').value;
    const rating = document.getElementById('rating').value;
    const tourID = e.target.dataset.tourId;
    addReview(review, rating, tourID);
  });
}
