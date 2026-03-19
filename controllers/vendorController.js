const Vendor = require("../models/Vendor");
const Booking = require("../models/Booking");
const Review = require("../models/Review");

// @GET /api/vendors  — public, search + filter
exports.getVendors = async (req, res) => {
  try {
    const {
      search, category, city, state,
      minPrice, maxPrice, minRating,
      sort, page = 1, limit = 12,
    } = req.query;

    const query = { isApproved: true, isActive: true };

    // Text search
    if (search) query.$text = { $search: search };

    // Filters
    if (category)  query.category = category;
    if (city)      query["location.city"]  = new RegExp(city, "i");
    if (state)     query["location.state"] = new RegExp(state, "i");
    if (minPrice)  query["pricing.startingPrice"] = { $gte: Number(minPrice) };
    if (maxPrice) {
      query["pricing.startingPrice"] = {
        ...query["pricing.startingPrice"],
        $lte: Number(maxPrice),
      };
    }
    if (minRating) query["ratings.average"] = { $gte: Number(minRating) };

    // Sorting
    let sortObj = { createdAt: -1 };
    if (sort === "rating")      sortObj = { "ratings.average": -1 };
    if (sort === "price_low")   sortObj = { "pricing.startingPrice": 1 };
    if (sort === "price_high")  sortObj = { "pricing.startingPrice": -1 };
    if (sort === "popular")     sortObj = { totalBookings: -1 };
    if (sort === "featured")    sortObj = { isFeatured: -1, "ratings.average": -1 };

    const skip = (Number(page) - 1) * Number(limit);
    const total = await Vendor.countDocuments(query);
    const vendors = await Vendor.find(query)
      .populate("owner", "name email phone avatar")
      .sort(sortObj)
      .skip(skip)
      .limit(Number(limit));

    res.json({
      success: true,
      total,
      pages: Math.ceil(total / limit),
      page: Number(page),
      vendors,
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// @GET /api/vendors/:id — single vendor detail
exports.getVendorById = async (req, res) => {
  try {
    const vendor = await Vendor.findById(req.params.id).populate("owner", "name email phone avatar");
    if (!vendor) return res.status(404).json({ success: false, message: "Vendor not found" });

    const reviews = await Review.find({ vendor: vendor._id, isApproved: true })
      .populate("user", "name avatar")
      .sort({ createdAt: -1 })
      .limit(10);

    res.json({ success: true, vendor, reviews });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// @POST /api/vendors — vendor creates profile
exports.createVendor = async (req, res) => {
  try {
    const exists = await Vendor.findOne({ owner: req.user._id });
    if (exists) return res.status(400).json({ success: false, message: "Vendor profile already exists" });

    const vendor = await Vendor.create({ ...req.body, owner: req.user._id });
    res.status(201).json({ success: true, vendor });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// @PUT /api/vendors/:id — vendor updates profile
exports.updateVendor = async (req, res) => {
  try {
    const vendor = await Vendor.findOne({ _id: req.params.id, owner: req.user._id });
    if (!vendor) return res.status(404).json({ success: false, message: "Not found or not authorized" });

    Object.assign(vendor, req.body);
    await vendor.save();
    res.json({ success: true, vendor });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// @POST /api/vendors/:id/images — upload images
exports.uploadImages = async (req, res) => {
  try {
    const vendor = await Vendor.findOne({ _id: req.params.id, owner: req.user._id });
    if (!vendor) return res.status(404).json({ success: false, message: "Not found" });

    const urls = req.files.map((f) => f.path);
    vendor.images.push(...urls);
    if (!vendor.coverImage && urls.length) vendor.coverImage = urls[0];
    await vendor.save();

    res.json({ success: true, images: vendor.images });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// @GET /api/vendors/my/dashboard — vendor dashboard stats
exports.getVendorDashboard = async (req, res) => {
  try {
    const vendor = await Vendor.findOne({ owner: req.user._id });
    if (!vendor) return res.status(404).json({ success: false, message: "Vendor profile not found" });

    const bookings = await Booking.find({ vendor: vendor._id })
      .populate("user", "name email phone avatar")
      .sort({ createdAt: -1 });

    const stats = {
      totalBookings:   bookings.length,
      pending:         bookings.filter((b) => b.status === "pending").length,
      confirmed:       bookings.filter((b) => b.status === "confirmed").length,
      completed:       bookings.filter((b) => b.status === "completed").length,
      cancelled:       bookings.filter((b) => b.status === "cancelled").length,
      totalEarnings:   bookings.filter((b) => b.status !== "cancelled").reduce((s, b) => s + b.pricing.totalAmount, 0),
      paidEarnings:    bookings.filter((b) => b.payment.status === "paid").reduce((s, b) => s + b.pricing.totalAmount, 0),
      pendingPayments: bookings.filter((b) => b.payment.status !== "paid" && b.status !== "cancelled").reduce((s, b) => s + b.pricing.balanceDue, 0),
    };

    // Monthly earnings chart data (last 6 months)
    const monthly = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date();
      d.setMonth(d.getMonth() - i);
      const month = d.toLocaleString("default", { month: "short" });
      const year  = d.getFullYear();
      const start = new Date(d.getFullYear(), d.getMonth(), 1);
      const end   = new Date(d.getFullYear(), d.getMonth() + 1, 0);
      const earned = bookings
        .filter((b) => b.status !== "cancelled" && b.createdAt >= start && b.createdAt <= end)
        .reduce((s, b) => s + b.pricing.totalAmount, 0);
      monthly.push({ month: `${month} ${year}`, earnings: earned });
    }

    const reviews = await Review.find({ vendor: vendor._id }).populate("user", "name avatar").sort({ createdAt: -1 }).limit(5);

    res.json({ success: true, vendor, bookings, stats, monthly, reviews });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// @GET /api/vendors/categories
exports.getCategories = async (req, res) => {
  const categories = [
    { value: "banquet_hall",     label: "Banquet Hall",      icon: "🏛️" },
    { value: "catering",         label: "Catering",           icon: "🍽️" },
    { value: "decoration",       label: "Decoration",         icon: "🌸" },
    { value: "photography",      label: "Photography",        icon: "📸" },
    { value: "videography",      label: "Videography",        icon: "🎬" },
    { value: "pandit",           label: "Pandit Ji",          icon: "🙏" },
    { value: "event_manager",    label: "Event Manager",      icon: "📋" },
    { value: "mehendi",          label: "Mehendi Artist",     icon: "✋" },
    { value: "makeup",           label: "Makeup Artist",      icon: "💄" },
    { value: "music_dj",         label: "Music / DJ",         icon: "🎵" },
    { value: "tent_house",       label: "Tent House",         icon: "⛺" },
    { value: "horse_carriage",   label: "Horse & Carriage",   icon: "🐴" },
    { value: "invitation_cards", label: "Invitation Cards",   icon: "💌" },
    { value: "jewellery",        label: "Jewellery",          icon: "💍" },
    { value: "bridal_wear",      label: "Bridal Wear",        icon: "👗" },
    { value: "groom_wear",       label: "Groom Wear",         icon: "🤵" },
  ];
  res.json({ success: true, categories });
};
