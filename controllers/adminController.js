const User    = require("../models/User");
const Vendor  = require("../models/Vendor");
const Booking = require("../models/Booking");
const Review  = require("../models/Review");

exports.getDashboard = async (req, res) => {
  try {
    const [totalUsers, totalVendors, totalBookings, pendingVendors] = await Promise.all([
      User.countDocuments({ role: "user" }),
      Vendor.countDocuments(),
      Booking.countDocuments(),
      Vendor.countDocuments({ isApproved: false }),
    ]);

    const revenueAgg = await Booking.aggregate([
      { $match: { status: { $in: ["confirmed", "completed"] } } },
      { $group: { _id: null, total: { $sum: "$pricing.totalAmount" } } },
    ]);
    const totalRevenue = revenueAgg[0]?.total || 0;

    const monthly = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date();
      d.setMonth(d.getMonth() - i);
      const start = new Date(d.getFullYear(), d.getMonth(), 1);
      const end   = new Date(d.getFullYear(), d.getMonth() + 1, 0);
      const [bookCount, revenue] = await Promise.all([
        Booking.countDocuments({ createdAt: { $gte: start, $lte: end } }),
        Booking.aggregate([
          { $match: { createdAt: { $gte: start, $lte: end }, status: { $in: ["confirmed","completed"] } } },
          { $group: { _id: null, total: { $sum: "$pricing.totalAmount" } } },
        ]),
      ]);
      monthly.push({
        month: d.toLocaleString("default", { month: "short", year: "numeric" }),
        bookings: bookCount,
        revenue: revenue[0]?.total || 0,
      });
    }

    const recentBookings = await Booking.find()
      .populate("user",   "name email")
      .populate("vendor", "businessName category")
      .sort({ createdAt: -1 })
      .limit(10);

    const topVendors = await Vendor.find({ isApproved: true })
      .sort({ totalBookings: -1 })
      .limit(5)
      .select("businessName category totalBookings totalEarnings ratings location");

    res.json({ success: true, stats: { totalUsers, totalVendors, totalBookings, pendingVendors, totalRevenue }, monthly, recentBookings, topVendors });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
};

exports.getAllUsers = async (req, res) => {
  try {
    const { search, role, page = 1, limit = 20 } = req.query;
    const query = {};
    if (role) query.role = role;
    if (search) query.$or = [
      { name:  new RegExp(search, "i") },
      { email: new RegExp(search, "i") },
      { phone: new RegExp(search, "i") },
    ];
    const total = await User.countDocuments(query);
    const users = await User.find(query).sort({ createdAt: -1 }).skip((page-1)*limit).limit(Number(limit));
    res.json({ success: true, total, users });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
};

exports.getAllVendors = async (req, res) => {
  try {
    const { search, category, isApproved, page = 1, limit = 20 } = req.query;
    const query = {};
    if (category) query.category = category;
    if (isApproved !== undefined) query.isApproved = isApproved === "true";
    if (search) query.$or = [
      { businessName:      new RegExp(search, "i") },
      { "location.city":   new RegExp(search, "i") },
    ];
    const total   = await Vendor.countDocuments(query);
    const vendors = await Vendor.find(query).populate("owner","name email phone").sort({ createdAt: -1 }).skip((page-1)*limit).limit(Number(limit));
    res.json({ success: true, total, vendors });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
};

exports.approveVendor = async (req, res) => {
  try {
    const vendor = await Vendor.findByIdAndUpdate(req.params.id, { isApproved: req.body.isApproved }, { new: true });
    await User.findByIdAndUpdate(vendor.owner, { isApproved: req.body.isApproved });
    res.json({ success: true, vendor });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
};

exports.getAllBookings = async (req, res) => {
  try {
    const { status, page = 1, limit = 20 } = req.query;
    const query = {};
    if (status) query.status = status;
    const total    = await Booking.countDocuments(query);
    const bookings = await Booking.find(query)
      .populate("user",   "name email phone")
      .populate("vendor", "businessName category location")
      .sort({ createdAt: -1 }).skip((page-1)*limit).limit(Number(limit));
    res.json({ success: true, total, bookings });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
};

exports.toggleUserStatus = async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ success: false, message: "User not found" });
    user.isActive = !user.isActive;
    await user.save();
    res.json({ success: true, user });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
};

exports.toggleVendorFeatured = async (req, res) => {
  try {
    const vendor = await Vendor.findById(req.params.id);
    vendor.isFeatured = !vendor.isFeatured;
    await vendor.save();
    res.json({ success: true, vendor });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
};
