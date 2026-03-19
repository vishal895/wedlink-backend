const router = require("express").Router();
const {
  createBooking, getMyBookings, getBookingById,
  updateBookingStatus, cancelBooking
} = require("../controllers/bookingController");
const { protect, authorize } = require("../middleware/auth");

router.post("/",               protect, authorize("user"), createBooking);
router.get("/my",              protect, getMyBookings);
router.get("/:id",             protect, getBookingById);
router.put("/:id/status",      protect, authorize("vendor","admin"), updateBookingStatus);
router.put("/:id/cancel",      protect, authorize("user"), cancelBooking);

module.exports = router;
