const Booking = require("../models/Booking");
const Vendor  = require("../models/Vendor");

exports.createBooking = async (req, res) => {
  try {
    const { vendorId, eventDate, eventEndDate, eventType, guestCount, timeSlot, specialRequests } = req.body;
    const vendor = await Vendor.findById(vendorId);
    if (!vendor) return res.status(404).json({ success: false, message: "Vendor not found" });
    if (!vendor.isApproved || !vendor.isActive)
      return res.status(400).json({ success: false, message: "Vendor not available" });

    const basePrice   = vendor.pricing.startingPrice;
    const taxes       = Math.round(basePrice * 0.18);
    const totalAmount = basePrice + taxes;
    const advancePaid = Math.round(totalAmount * 0.3);
    const balanceDue  = totalAmount - advancePaid;

    const booking = await Booking.create({
      user: req.user._id, vendor: vendorId, eventDate, eventEndDate,
      eventType, guestCount, timeSlot, specialRequests,
      pricing: { basePrice, taxes, totalAmount, advancePaid, balanceDue },
    });
    await Vendor.findByIdAndUpdate(vendorId, { $inc: { totalBookings: 1 } });
    const populated = await booking.populate([
      { path: "vendor", select: "businessName category location pricing coverImage" },
      { path: "user",   select: "name email phone" },
    ]);
    res.status(201).json({ success: true, booking: populated });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
};

exports.getMyBookings = async (req, res) => {
  try {
    const bookings = await Booking.find({ user: req.user._id })
      .populate("vendor", "businessName category location pricing coverImage contact")
      .sort({ createdAt: -1 });
    res.json({ success: true, bookings });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
};

exports.getBookingById = async (req, res) => {
  try {
    const booking = await Booking.findById(req.params.id)
      .populate("vendor", "businessName category location pricing coverImage contact owner")
      .populate("user",   "name email phone avatar");
    if (!booking) return res.status(404).json({ success: false, message: "Booking not found" });
    const isOwner  = booking.user._id.toString() === req.user._id.toString();
    const isVendor = booking.vendor.owner?.toString() === req.user._id.toString();
    const isAdmin  = req.user.role === "admin";
    if (!isOwner && !isVendor && !isAdmin)
      return res.status(403).json({ success: false, message: "Not authorized" });
    res.json({ success: true, booking });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
};

exports.updateBookingStatus = async (req, res) => {
  try {
    const { status, vendorNotes, adminNotes } = req.body;
    const booking = await Booking.findById(req.params.id).populate("vendor");
    if (!booking) return res.status(404).json({ success: false, message: "Booking not found" });
    const isVendor = booking.vendor.owner.toString() === req.user._id.toString();
    const isAdmin  = req.user.role === "admin";
    if (!isVendor && !isAdmin) return res.status(403).json({ success: false, message: "Not authorized" });
    booking.status = status;
    if (vendorNotes) booking.vendorNotes = vendorNotes;
    if (adminNotes)  booking.adminNotes  = adminNotes;
    if (status === "completed") {
      booking.payment.status = "paid";
      booking.payment.paidAt = new Date();
      await Vendor.findByIdAndUpdate(booking.vendor._id, { $inc: { totalEarnings: booking.pricing.totalAmount } });
    }
    if (status === "cancelled") {
      booking.cancellation.cancelledAt  = new Date();
      booking.cancellation.cancelledBy  = isAdmin ? "admin" : "vendor";
      booking.cancellation.refundAmount = booking.pricing.advancePaid;
    }
    await booking.save();
    res.json({ success: true, booking });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
};

exports.cancelBooking = async (req, res) => {
  try {
    const booking = await Booking.findOne({ _id: req.params.id, user: req.user._id });
    if (!booking) return res.status(404).json({ success: false, message: "Booking not found" });
    if (["completed", "cancelled"].includes(booking.status))
      return res.status(400).json({ success: false, message: "Cannot cancel this booking" });
    booking.status                    = "cancelled";
    booking.cancellation.reason       = req.body.reason || "";
    booking.cancellation.cancelledBy  = "user";
    booking.cancellation.cancelledAt  = new Date();
    booking.cancellation.refundAmount = booking.pricing.advancePaid;
    await booking.save();
    res.json({ success: true, booking });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
};
