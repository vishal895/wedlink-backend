const router = require("express").Router();
const {
  getDashboard, getAllUsers, getAllVendors, approveVendor,
  getAllBookings, toggleUserStatus, toggleVendorFeatured
} = require("../controllers/adminController");
const { protect, authorize } = require("../middleware/auth");

const guard = [protect, authorize("admin")];

router.get("/dashboard",              ...guard, getDashboard);
router.get("/users",                  ...guard, getAllUsers);
router.put("/users/:id/toggle",       ...guard, toggleUserStatus);
router.get("/vendors",                ...guard, getAllVendors);
router.put("/vendors/:id/approve",    ...guard, approveVendor);
router.put("/vendors/:id/featured",   ...guard, toggleVendorFeatured);
router.get("/bookings",               ...guard, getAllBookings);

module.exports = router;
