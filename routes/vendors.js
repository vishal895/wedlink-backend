const router = require("express").Router();
const {
  getVendors, getVendorById, createVendor, updateVendor,
  uploadImages, getVendorDashboard, getCategories
} = require("../controllers/vendorController");
const { protect, authorize } = require("../middleware/auth");
const { upload } = require("../middleware/upload");

router.get("/",                    getVendors);
router.get("/categories",          getCategories);
router.get("/my/dashboard",        protect, authorize("vendor"), getVendorDashboard);
router.get("/:id",                 getVendorById);
router.post("/",                   protect, authorize("vendor"), createVendor);
router.put("/:id",                 protect, authorize("vendor"), updateVendor);
router.post("/:id/images",         protect, authorize("vendor"), upload.array("images", 10), uploadImages);

module.exports = router;
