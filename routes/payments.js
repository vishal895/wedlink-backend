const router  = require("express").Router();
const Booking = require("../models/Booking");
const { protect } = require("../middleware/auth");

// Placeholder — integrate Stripe/Razorpay here
router.post("/create-intent", protect, async (req, res) => {
  try {
    const booking = await Booking.findById(req.body.bookingId);
    if (!booking) return res.status(404).json({ success: false, message: "Booking not found" });
    // const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);
    // const intent = await stripe.paymentIntents.create({ amount: booking.pricing.advancePaid * 100, currency: "inr" });
    res.json({ success: true, clientSecret: "test_secret", amount: booking.pricing.advancePaid });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

router.put("/confirm/:bookingId", protect, async (req, res) => {
  try {
    const booking = await Booking.findByIdAndUpdate(
      req.params.bookingId,
      { "payment.status": "partial", "payment.transactionId": req.body.transactionId, "payment.method": "online", "payment.paidAt": new Date() },
      { new: true }
    );
    res.json({ success: true, booking });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

module.exports = router;
