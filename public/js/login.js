//Allow user to login with http request or atex call
//http request to login API endpoint implemented before
//API sends cookie , gets stored in browser
//automatically gets sent back with each subsequent request
//WORKING ON THE CLIENT SIDE JAVASCRIPT CODE
/* eslint-disable */

import axios from 'axios';
import { showAlert } from './alerts';

export const login = async (email, password) => {
  try {
    const res = await axios({
      method: 'POST',
      url: '/api/v1/users/login', //works because API and website are hosted at the same location
      data: {
        email,
        password,
      },
    });

    if (res.data.status === 'success') {
      showAlert('success', 'Logged in successfully!');
      window.setTimeout(() => {
        location.assign('/');
      }, 1500);
    }
  } catch (err) {
    showAlert('error', err.response.data.message);
  }
  //axios returns a promise so async await
};

export const logout = async () => {
  try {
    const res = await axios({
      method: 'GET',
      url: '/api/v1/users/logout',

      //This is an AJAX request we cannot do it on the backend side -> so not with express
    });
    if (res.data.status === 'success') location.reload(true);
  } catch (err) {
    showAlert('error', 'Error logging out ! Try again.');
  }
};
