const mongoose = require("mongoose");

const bookingSchema = new mongoose.Schema(
  {
    user:   { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    vendor: { type: mongoose.Schema.Types.ObjectId, ref: "Vendor", required: true },

    eventDate:    { type: Date, required: true },
    eventEndDate: { type: Date },
    timeSlot:     { type: String, default: "" },

    eventType: {
      type: String,
      enum: ["wedding", "engagement", "reception", "haldi", "mehendi", "sangeet", "other"],
      default: "wedding",
    },

    guestCount: { type: Number, default: 0 },

    specialRequests: { type: String, default: "" },

    pricing: {
      basePrice:    { type: Number, required: true },
      discount:     { type: Number, default: 0 },
      taxes:        { type: Number, default: 0 },
      totalAmount:  { type: Number, required: true },
      advancePaid:  { type: Number, default: 0 },
      balanceDue:   { type: Number, default: 0 },
    },

    status: {
      type: String,
      enum: ["pending", "confirmed", "cancelled", "completed"],
      default: "pending",
    },

    payment: {
      status:        { type: String, enum: ["unpaid", "partial", "paid"], default: "unpaid" },
      method:        { type: String, default: "" },
      transactionId: { type: String, default: "" },
      paidAt:        { type: Date },
    },

    cancellation: {
      reason:       { type: String, default: "" },
      cancelledBy:  { type: String, enum: ["user", "vendor", "admin"], default: "user" },
      cancelledAt:  { type: Date },
      refundAmount: { type: Number, default: 0 },
    },

    vendorNotes: { type: String, default: "" },
    adminNotes:  { type: String, default: "" },

    bookingId: { type: String, unique: true },
  },
  { timestamps: true }
);

// Auto-generate booking ID
bookingSchema.pre("save", async function (next) {
  if (!this.bookingId) {
    const count = await mongoose.model("Booking").countDocuments();
    this.bookingId = `WW${Date.now().toString().slice(-6)}${count + 1}`;
  }
  next();
});

module.exports = mongoose.model("Booking", bookingSchema);
