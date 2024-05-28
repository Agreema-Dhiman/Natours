import axios from 'axios';
import { showAlert } from './alerts';

//type is either 'password' or 'data'
export const updateUser = async (data, type) => {
  try {
    const url =
      type === 'password'
        ? '/api/v1/users/updatePassword'
        : '/api/v1/users/updateMe';
    const res = await axios({
      method: 'PATCH',
      url,
      data: data,
    });

    if (res.data.status === 'success') {
      showAlert('success', `${type.toUpperCase()} updated successfully!`);
    }
  } catch (err) {
    showAlert('error', err.response.data.message);
  }
  //axios returns a promise so async await
};

export const addReview = async (review, rating, tourID) => {
  try {
    const url = `/api/v1/tours/${tourID}/reviews`;
    const res = await axios({
      method: 'POST',
      url,
      data: {
        review,
        rating,
      },
    });
    if (res.data.status === 'success') {
      showAlert('success', 'Review uploaded successfully!');
    }
  } catch (err) {
    showAlert('error', err.response.data.message);
  }
};
