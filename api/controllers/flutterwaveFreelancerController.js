export const flutterwaveFreelancerIntent = async (req, res, next) => {
  try {
    const { email } = req.body;
    if (!email) return next(createError(400, "Email is required"));

    const amount = 5000; // NGN 5000 flat for testing
    const txRef = `freelancer_${Date.now()}_${email}`;

    const response = await axios.post(
      "https://api.flutterwave.com/v3/payments",
      {
        tx_ref: txRef,
        amount,
        currency: "NGN",
        redirect_url: `http://localhost:3000/payment/freelancers/success?tx_ref=${txRef}&email=${email}`,
        customer: { email },
        customizations: {
          title: "Freelancer Registration",
          description: "One-time registration fee for RMGC freelancers",
        },
        meta: { email, purpose: "freelancer_registration" },
      },
      {
        headers: {
          Authorization: `Bearer ${process.env.FLUTTERWAVE_SECRET_KEY}`,
        },
      }
    );

    if (!response.data?.data?.link)
      return next(createError(500, "Failed to generate payment link"));

    res.status(200).json({
      paymentLink: response.data.data.link,
      transactionReference: txRef,
      amount,
      currency: "NGN",
    });
  } catch (err) {
    console.error("Flutterwave error:", err.response?.data || err);
    next(createError(500, "Error creating Flutterwave payment intent"));
  }
};
