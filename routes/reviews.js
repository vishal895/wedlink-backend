const router = require("express").Router();
const Review = require("../models/Review");
const { protect, authorize } = require("../middleware/auth");

router.post("/", protect, authorize("user"), async (req, res) => {
  try {
    const review = await Review.create({ ...req.body, user: req.user._id });
    const populated = await review.populate("user","name avatar");
    res.status(201).json({ success: true, review: populated });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

router.get("/vendor/:vendorId", async (req, res) => {
  try {
    const reviews = await Review.find({ vendor: req.params.vendorId, isApproved: true })
      .populate("user","name avatar").sort({ createdAt: -1 });
    res.json({ success: true, reviews });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

router.put("/:id/reply", protect, authorize("vendor"), async (req, res) => {
  try {
    const review = await Review.findByIdAndUpdate(
      req.params.id,
      { "reply.text": req.body.text, "reply.repliedAt": new Date() },
      { new: true }
    );
    res.json({ success: true, review });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

module.exports = router;
