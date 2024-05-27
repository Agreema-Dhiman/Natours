import axios from 'axios';
import { showAlert } from './alerts';
const stripe = Stripe(
  'pk_test_51PKPv8SCyOq1qoKLMEKUCOgvID4UUv8ezroyCI0CVO1oSVaiNIPRtshSKJ18ivucCcqVqN9Y60JROpw86kVp7ncJ00uFydLa0O',
);

export const bookTour = async (tourId) => {
  try {
    //1)Get checkout session from API
    const session = await axios(
      `http://127.0.0.1:3000/api/v1/bookings/checkout-session/${tourId}`,
    );

    //2) Create checkout form+ charge the credit card
    await stripe.redirectToCheckout({
      sessionId: session.data.session.id,
    });
    //use 424242424242 for credit card number in testing
  } catch (err) {
    showAlert('error', err);
  }
};
