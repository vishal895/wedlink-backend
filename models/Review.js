const mongoose = require("mongoose");

const reviewSchema = new mongoose.Schema(
  {
    user:    { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    vendor:  { type: mongoose.Schema.Types.ObjectId, ref: "Vendor", required: true },
    booking: { type: mongoose.Schema.Types.ObjectId, ref: "Booking" },

    rating:  { type: Number, required: true, min: 1, max: 5 },
    title:   { type: String, default: "" },
    comment: { type: String, required: true },

    images: [{ type: String }],

    reply: {
      text:      { type: String, default: "" },
      repliedAt: { type: Date },
    },

    isApproved: { type: Boolean, default: true },
  },
  { timestamps: true }
);

// Update vendor average rating after save
reviewSchema.post("save", async function () {
  const Vendor = mongoose.model("Vendor");
  const Review = mongoose.model("Review");
  const stats = await Review.aggregate([
    { $match: { vendor: this.vendor } },
    { $group: { _id: "$vendor", avg: { $avg: "$rating" }, count: { $sum: 1 } } },
  ]);
  if (stats.length > 0) {
    await Vendor.findByIdAndUpdate(this.vendor, {
      "ratings.average": Math.round(stats[0].avg * 10) / 10,
      "ratings.count":   stats[0].count,
    });
  }
});

module.exports = mongoose.model("Review", reviewSchema);
