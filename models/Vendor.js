const mongoose = require("mongoose");

const vendorSchema = new mongoose.Schema(
  {
    owner: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },

    businessName: { type: String, required: true, trim: true },
    category: {
      type: String,
      required: true,
      enum: [
        "banquet_hall",
        "catering",
        "decoration",
        "photography",
        "videography",
        "pandit",
        "event_manager",
        "mehendi",
        "makeup",
        "music_dj",
        "tent_house",
        "horse_carriage",
        "invitation_cards",
        "jewellery",
        "bridal_wear",
        "groom_wear",
      ],
    },

    description: { type: String, required: true },
    tagline:     { type: String, default: "" },

    images: [{ type: String }],
    coverImage: { type: String, default: "" },

    location: {
      city:    { type: String, required: true },
      state:   { type: String, required: true },
      address: { type: String, default: "" },
      pincode: { type: String, default: "" },
    },

    pricing: {
      startingPrice: { type: Number, required: true },
      maxPrice:      { type: Number, default: 0 },
      priceUnit:     { type: String, enum: ["per_event", "per_plate", "per_hour", "per_day"], default: "per_event" },
    },

    capacity: {
      min: { type: Number, default: 0 },
      max: { type: Number, default: 0 },
    },

    amenities: [{ type: String }],
    tags:      [{ type: String }],

    availability: [
      {
        date:      { type: Date },
        isBooked:  { type: Boolean, default: false },
        timeSlots: [{ type: String }],
      },
    ],

    contact: {
      phone:    { type: String },
      altPhone: { type: String },
      email:    { type: String },
      website:  { type: String, default: "" },
    },

    socialLinks: {
      instagram: { type: String, default: "" },
      facebook:  { type: String, default: "" },
      youtube:   { type: String, default: "" },
    },

    ratings: {
      average: { type: Number, default: 0 },
      count:   { type: Number, default: 0 },
    },

    totalBookings: { type: Number, default: 0 },
    totalEarnings: { type: Number, default: 0 },

    isApproved:  { type: Boolean, default: false },
    isFeatured:  { type: Boolean, default: false },
    isActive:    { type: Boolean, default: true },

    documents: [{ name: String, url: String }],
  },
  { timestamps: true }
);

// Text search index
vendorSchema.index({
  businessName: "text",
  description:  "text",
  "location.city": "text",
  tags:         "text",
});

module.exports = mongoose.model("Vendor", vendorSchema);
