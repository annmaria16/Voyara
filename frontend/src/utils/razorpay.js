/**
 * Dynamically loads the Razorpay checkout script into the DOM.
 * Returns a promise that resolves to true once Razorpay is available on window.Razorpay.
 */
export const loadRazorpayScript = () => {
  return new Promise((resolve) => {
    if (window.Razorpay) {
      resolve(true);
      return;
    }

    const script = document.createElement('script');
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.async = true;
    script.onload = () => {
      resolve(true);
    };
    script.onerror = () => {
      console.error('Failed to load Razorpay SDK script from CDN.');
      resolve(false);
    };
    document.body.appendChild(script);
  });
};
